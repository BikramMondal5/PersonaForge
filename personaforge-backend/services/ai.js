import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { readFileTool } from "./readFileTool.js";

const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

const DOMAIN_KEYWORDS = [
    { domain: "Women's Health", keywords: ["gynecolog", "obgyn", "ob-gyn", "obstetric", "pregnan", "menstrual", "fertility", "reproductive"] },
    { domain: "Orthopedics", keywords: ["orthopedic", "orthopaedic", "bone", "joint", "fracture", "arthritis"] },
    { domain: "Cardiology", keywords: ["cardiolog", "heart", "cardiac"] },
    { domain: "Dermatology", keywords: ["dermatolog", "skin", "acne", "eczema", "psoriasis"] },
    { domain: "Neurology", keywords: ["neurolog", "brain", "seizure", "migraine"] },
    { domain: "Pediatrics", keywords: ["pediatric", "child health", "children", "infant"] },
    { domain: "Mental Health", keywords: ["therapist", "therapy", "counselor", "psycholog", "psychiatr", "mental health"] },
    { domain: "Dentistry", keywords: ["dentist", "dental", "tooth", "teeth"] },
    { domain: "Nutrition", keywords: ["nutrition", "dietitian", "diet", "meal plan", "macros"] },
    { domain: "Fitness & Training", keywords: ["fitness", "trainer", "workout", "exercise", "strength training"] },
    { domain: "Startup & Business", keywords: ["startup", "founder", "entrepreneur", "business mentor", "venture", "pitch", "mvp"] },
    { domain: "Legal Advisory", keywords: ["lawyer", "attorney", "legal", "contract", "litigation"] },
    { domain: "Accounting & Tax", keywords: ["accountant", "tax", "cpa", "bookkeeping", "audit"] },
    { domain: "Software Engineering", keywords: ["software", "developer", "programmer", "coding", "engineer", "api", "javascript", "python"] },
    { domain: "Education", keywords: ["teacher", "tutor", "education", "lesson", "curriculum"] },
    { domain: "Marketing", keywords: ["marketing", "seo", "brand", "growth", "campaign"] },
    { domain: "Human Resources", keywords: ["hr", "human resources", "recruit", "hiring", "talent"] },
    { domain: "Sales", keywords: ["sales", "pipeline", "crm", "lead generation"] },
    { domain: "Product Management", keywords: ["product manager", "product management", "roadmap", "user story"] },
    { domain: "UX Design", keywords: ["ux", "ui", "designer", "user experience", "wireframe"] },
    { domain: "Data Science", keywords: ["data science", "analytics", "machine learning", "ml", "ai"] },
    { domain: "Finance & Investing", keywords: ["finance", "investment", "investing", "stocks", "portfolio"] },
    { domain: "Real Estate", keywords: ["real estate", "property", "realtor", "mortgage"] },
    { domain: "Travel", keywords: ["travel", "trip", "itinerary", "flight", "hotel", "tour"] },
    { domain: "Culinary", keywords: ["chef", "cooking", "recipe", "kitchen", "baking"] },
    { domain: "Customer Support", keywords: ["customer support", "helpdesk", "support agent"] },
    { domain: "Cybersecurity", keywords: ["cybersecurity", "security", "infosec", "penetration", "vulnerability"] }
];

function safeErrorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}

function createGroqModel(temperature = 0.7) {
    return new ChatOpenAI({
        model: GROQ_MODEL,
        temperature,
        apiKey: process.env.GROQ_API_KEY,
        configuration: {
            baseURL: GROQ_BASE_URL,
        },
    });
}

function normalizeText(value) {
    return typeof value === "string" ? value.toLowerCase() : "";
}

function extractDomainFromText(description) {
    const text = normalizeText(description);
    if (!text) return "";

    let bestMatch = { domain: "", score: 0 };

    for (const entry of DOMAIN_KEYWORDS) {
        let score = 0;
        for (const keyword of entry.keywords) {
            if (text.includes(keyword)) {
                score += 1;
            }
        }
        if (score > bestMatch.score) {
            bestMatch = { domain: entry.domain, score };
        }
    }

    return bestMatch.score > 0 ? bestMatch.domain : "";
}

function sanitizeDomain(value) {
    return typeof value === "string" ? value.trim() : "";
}

export function buildIdentityPrompt(agentName, domain, description, tone) {
    const name = agentName || "Specialist Assistant";
    const roleText = description?.trim() || "Provide domain-specific guidance.";
    const toneLine = tone ? `\nTone: ${tone}.` : "";

    return `You are ${name}, a highly specialized AI assistant in ${domain}.\n\nROLE:\n${roleText}${toneLine}\n\nSTRICT RULES:\n- You are NOT a general assistant.\n- You MUST ONLY answer within ${domain}.\n- If a query is outside your domain, politely refuse and redirect.\n- NEVER say phrases like:\n  'I help with a wide range of topics'\n  'I can assist with anything'\n- Maintain domain-specific tone at all times.\n\nTOOL USAGE:\nUse tools only when relevant to your domain.\n\nFINAL RULE:\nIf you break persona, regenerate the response.`;
}

/**
 * Function 1 — forgePersona
 */
export async function forgePersona(description, tone, guardrails) {
    const model = createGroqModel(0.7);

    const extractedDomain = extractDomainFromText(description);

    const promptText = `Convert this persona description into agent config JSON only.
No markdown, no explanation.
Description: {description}, Tone: {tone}, Guardrails: {guardrails}
Return: {{ "name": "...", "systemPrompt": "...", "domain": "...", "sampleReply": "..." }}`;

    const prompt = ChatPromptTemplate.fromTemplate(promptText);

    const chain = RunnableSequence.from([
        prompt,
        model,
        new StringOutputParser()
    ]);

    const res = await chain.invoke({
        description,
        tone,
        guardrails
    });

    try {
        // Remove markdown code blocks if present
        let cleanedRes = res.trim();
        if (cleanedRes.startsWith('```json')) {
            cleanedRes = cleanedRes.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (cleanedRes.startsWith('```')) {
            cleanedRes = cleanedRes.replace(/```\n?/g, '');
        }

        const parsed = JSON.parse(cleanedRes.trim());
        const modelDomain = sanitizeDomain(parsed.domain);
        const finalDomain = extractedDomain || modelDomain || "General Knowledge";
        const agentName = sanitizeDomain(parsed.name) || `${finalDomain} Specialist`;

        return {
            name: agentName,
            systemPrompt: buildIdentityPrompt(agentName, finalDomain, description, tone),
            domain: finalDomain,
            sampleReply: parsed.sampleReply
        };
    } catch {
        console.error("Failed to parse JSON from Groq response.");
        throw new Error("Invalid format returned by the model during persona creation.");
    }
}

/**
 * Function 2 — chatWithPersona
 */
export async function chatWithPersona(systemPrompt, history, userMessage, enabledTools = []) {
    const model = createGroqModel(0.7);

    const hasReadFileTool = Array.isArray(enabledTools) && enabledTools.includes("Read File");

    // Formatting history from generic {role, content} to Langchain message objects
    const formattedHistory = history.map(msg => {
        if (msg.role === "user") return new HumanMessage(msg.content);
        if (msg.role === "assistant") return new AIMessage(msg.content);
        return new AIMessage(msg.content);
    });

    // If tools are enabled, use agent with tools
    if (hasReadFileTool) {
        try {
            const agent = createReactAgent({
                llm: model,
                tools: [readFileTool],
                prompt: systemPrompt
            });

            const result = await agent.invoke({
                messages: [
                    ...formattedHistory,
                    new HumanMessage(userMessage)
                ]
            });

            const lastMessage = result.messages[result.messages.length - 1];
            return typeof lastMessage.content === "string"
                ? lastMessage.content
                : JSON.stringify(lastMessage.content);
        } catch (error) {
            console.error("Agent with tools failed, falling back to simple chat:", safeErrorMessage(error));
            // Fall back to simple chat without tools
        }
    }

    // Simple chat without tools (or fallback)
    const messages = [
        new HumanMessage(systemPrompt),
        ...formattedHistory,
        new HumanMessage(userMessage)
    ];

    const response = await model.invoke(messages);
    return typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);
}

/**
 * Function 3 — judgeMessage
 */
export async function judgeMessage(message, context) {
    const model = createGroqModel(0);

    const promptText = `Is this message safe and on-topic for a {context} AI agent?
Message: {message}
Reply with ONLY one word: SAFE or UNSAFE`;

    const prompt = ChatPromptTemplate.fromTemplate(promptText);

    const chain = RunnableSequence.from([
        prompt,
        model,
        new StringOutputParser()
    ]);

    const res = await chain.invoke({
        context,
        message
    });

    return res.trim();
}
