import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { readFileTool } from "./readFileTool.js";

const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

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

/**
 * Function 1 — forgePersona
 */
export async function forgePersona(description, tone, guardrails) {
    const model = createGroqModel(0.7);

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
        return parsed;
    } catch (e) {
        console.error("Failed to parse JSON from Groq:", res);
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
            console.error("Agent with tools failed, falling back to simple chat:", error.message);
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
