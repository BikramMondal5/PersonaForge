import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

const memoryStore = new Map();
const redis = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, { lazyConnect: true })
    : null;

if (redis) {
    redis.on('error', (error) => {
        console.error("Redis connection error:", error.message);
    });
}

/**
 * Function 1 — getHistory
 */
export async function getHistory(sessionId) {
    if (!redis) {
        return memoryStore.get(sessionId) || [];
    }

    try {
        const data = await redis.get(`session:${sessionId}`);
        if (!data) return [];
        return JSON.parse(data);
    } catch (e) {
        console.error("Redis getHistory error:", e);
        return [];
    }
}

/**
 * Function 2 — saveHistory
 */
export async function saveHistory(sessionId, userMessage, assistantReply) {
    try {
        let history = await getHistory(sessionId);

        history.push({ role: "user", content: userMessage });
        history.push({ role: "assistant", content: assistantReply });

        // Keep only last 12 messages
        if (history.length > 12) {
            history = history.slice(history.length - 12);
        }

        if (!redis) {
            memoryStore.set(sessionId, history);
            return;
        }

        const key = `session:${sessionId}`;
        await redis.set(key, JSON.stringify(history));
        await redis.expire(key, 3600); // 1 hour expiry
    } catch (e) {
        console.error("Redis saveHistory error:", e);
    }
}
