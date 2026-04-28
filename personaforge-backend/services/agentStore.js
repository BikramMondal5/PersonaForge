import mongoose from 'mongoose';

const AgentSchema = new mongoose.Schema({
    name: { type: String },
    systemPrompt: { type: String },
    domain: { type: String },
    guardrails: [{ type: String }],
    tools: [{ type: String }],
    responseLength: { type: String }
}, {
    collection: 'agents'
});

function getAgentModel() {
    return mongoose.models.Agent || mongoose.model('Agent', AgentSchema);
}

function isObjectId(value) {
    return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
}

async function connectMongo() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        throw new Error('MONGODB_URI is not configured');
    }

    if (mongoose.connection.readyState === 1) {
        return;
    }

    await mongoose.connect(mongoUri);
}

export async function getAgentById(agentId) {
    if (!isObjectId(agentId)) {
        return null;
    }

    await connectMongo();

    const Agent = getAgentModel();
    const agent = await Agent.findById(agentId).lean();

    return agent || null;
}
