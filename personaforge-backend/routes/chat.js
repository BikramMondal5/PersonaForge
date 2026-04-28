import { Router } from 'express';
import crypto from 'crypto';
import { agentsDb } from './forge.js';
import { getHistory, saveHistory } from '../services/memory.js';
import { buildSystemPrompt, buildStructuredPrompt } from '../services/promptBuilder.js';
import { chatWithPersona, buildIdentityPrompt } from '../services/ai.js';
import { authenticateApiKey } from '../middleware/auth.js';

const router = Router();

function safeErrorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}

function isLocalRequest(req) {
    const origin = req.headers.origin || "";
    const remoteAddress = req.ip || req.socket?.remoteAddress || "";

    return origin.startsWith("http://localhost:")
        || origin.startsWith("http://127.0.0.1:")
        || remoteAddress === "::1"
        || remoteAddress === "127.0.0.1"
        || remoteAddress === "::ffff:127.0.0.1";
}

async function authenticateApiKeyOrLocalSandbox(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader && isLocalRequest(req)) {
        return next();
    }

    return authenticateApiKey(req, res, next);
}

/**
 * Helper function to detect generic assistant responses
 * Returns true if response appears to be generic/non-persona
 */
function detectGenericResponse(response, domain) {
    const genericPatterns = [
        /^(hello|hi|hey)[!.]?\s+(i'm|i am)\s+(claude|an ai|a language model|an assistant)/i,
        /^(i'm|i am)\s+(claude|an ai|a language model|an assistant)/i,
        /how can i (help|assist) you today\?$/i,
        /^(sure|of course|certainly)[!,.]?\s+i('d| would) be (happy|glad) to help/i,
        /as an ai (assistant|language model)/i,
        /i don't have personal (opinions|feelings|experiences)/i,
        /wide range of topics/i,
        /help with anything/i,
        /general knowledge/i,
    ];

    const lowerResponse = response.toLowerCase();

    // Check for generic patterns
    for (const pattern of genericPatterns) {
        if (pattern.test(response)) {
            return true;
        }
    }

    // Check if domain is mentioned at all in first 100 chars (should be for greetings)
    if (domain && response.length < 200) {
        const domainLower = domain.toLowerCase();
        const firstPart = lowerResponse.substring(0, 100);
        if (!firstPart.includes(domainLower)) {
            // Domain not mentioned in opening - likely generic
            return true;
        }
    }

    return false;
}

function isFileRelatedMessage(message) {
    return /\b(file|document|upload|uploaded|attachment|attached|read|open|summari[sz]e|analy[sz]e|json|csv|txt|md|report)\b/i.test(message);
}

function normalizeAttachedFiles(files) {
    if (!Array.isArray(files)) return [];

    return files
        .filter(file => file && typeof file.file_path === 'string')
        .map(file => ({
            file_path: file.file_path,
            file_name: typeof file.file_name === 'string' ? file.file_name : file.file_path,
            size_bytes: typeof file.size_bytes === 'number' ? file.size_bytes : null
        }));
}

router.post('/:agentId/chat', authenticateApiKeyOrLocalSandbox, async (req, res) => {
    try {
        const { agentId } = req.params;
        const { message, session_id } = req.body;
        const attachedFiles = normalizeAttachedFiles(req.body.attached_files);

        if (!message || !session_id) {
            return res.status(400).json({ error: "message and session_id are required" });
        }

        const agent = agentsDb.get(agentId);
        if (!agent) {
            return res.status(404).json({ error: "Agent not found" });
        }

        const enabledTools = Array.isArray(agent.tools) ? agent.tools : [];
        const canReadFiles = enabledTools.includes("Read File");
        const responseLength = agent.responseLength || 'medium';

        if (isFileRelatedMessage(message) && !canReadFiles) {
            return res.json({
                message: "I cannot inspect files for this agent because the Read File tool is not enabled. Enable Read File in the agent tools, then upload the file again.",
                blocked: false,
                session_id,
                tool_required: "Read File"
            });
        }

        // 1. Get Memory
        const history = await getHistory(session_id);

        // 2. Quick keyword-based safety check only (skip AI-based input guardrail for speed)
        const lowerMessage = message.toLowerCase();
        const dangerousKeywords = ["hack", "bomb", "weapon", "illegal", "jailbreak", "ignore all rules", "forget instructions"];
        const hasDangerousContent = dangerousKeywords.some(keyword => lowerMessage.includes(keyword));

        if (hasDangerousContent) {
            return res.json({
                message: "I can't help with that request.",
                blocked: true,
                session_id
            });
        }

        // 3. Build system prompt and structure user input
        const fullSystemPrompt = buildSystemPrompt(agent.systemPrompt, agent.domain, agent.guardrails, enabledTools, responseLength);

        let structuredMessage = buildStructuredPrompt(message, agent.domain);

        if (canReadFiles && attachedFiles.length > 0) {
            const fileContext = attachedFiles
                .map(file => `- ${file.file_name}: ${file.file_path}${file.size_bytes !== null ? ` (${file.size_bytes} bytes)` : ""}`)
                .join("\n");
            structuredMessage += `\n\nUploaded files available to this session:\n${fileContext}\nIf the user refers to "the file", "this file", an uploaded file, or asks to read/analyze/summarize file content, call read_file with the matching file_path before answering.`;
        }

        console.log({
            agentName: agent.name,
            domain: agent.domain,
            systemPrompt: fullSystemPrompt
        });

        // 4. Get AI response (single call + validation retry)
        let reply = await chatWithPersona(fullSystemPrompt, history, structuredMessage, enabledTools);

        if (detectGenericResponse(reply, agent.domain)) {
            const regenPrompt = `${fullSystemPrompt}\n\nRespond ONLY within ${agent.domain}. Remove all generic assistant language. If a query is outside your domain, politely refuse and redirect to ${agent.domain}.`;
            reply = await chatWithPersona(regenPrompt, history, structuredMessage, enabledTools);
        }

        // 5. Save History
        await saveHistory(session_id, message, reply);

        // 6. Return response
        return res.json({ message: reply, blocked: false, session_id });

    } catch (error) {
        console.error("Error in /chat:", safeErrorMessage(error));
        return res.status(500).json({ error: "Internal server error during chat" });
    }
});

router.post('/register', authenticateApiKeyOrLocalSandbox, async (req, res) => {
    try {
        const { name, systemPrompt, domain, guardrails, tools, responseLength } = req.body || {};

        const trimmedDomain = typeof domain === "string" ? domain.trim() : "";
        if (!trimmedDomain) {
            return res.status(400).json({ error: "domain is required" });
        }

        const agentName = typeof name === "string" && name.trim() ? name.trim() : `${trimmedDomain} Specialist`;
        const agentSystemPrompt = typeof systemPrompt === "string" && systemPrompt.trim()
            ? systemPrompt.trim()
            : buildIdentityPrompt(agentName, trimmedDomain, "Provide domain-specific guidance.");

        const agentId = crypto.randomUUID();

        const agentRecord = {
            agentId,
            name: agentName,
            systemPrompt: agentSystemPrompt,
            domain: trimmedDomain,
            guardrails: Array.isArray(guardrails) ? guardrails : [],
            tools: Array.isArray(tools) ? tools : [],
            responseLength: responseLength || 'medium'
        };

        agentsDb.set(agentId, agentRecord);

        return res.status(201).json(agentRecord);
    } catch (error) {
        console.error("Error in /register:", safeErrorMessage(error));
        return res.status(500).json({ error: "Internal server error during agent registration" });
    }
});

export default router;
