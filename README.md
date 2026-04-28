# PersonaForge

PersonaForge is an AI agent platform that enables creation of specialized, persona-driven AI assistants. Built with Next.js and powered by advanced LLM technology, PersonaForge ensures agents maintain strict persona adherence and never fall back to generic assistant behavior.

## ✨ Key Features

- **Strict Persona Enforcement** - Agents always respond within their defined domain
- **Intent-Based Prompt Structuring** - Automatic transformation of user inputs
- **Multi-Layer Validation** - Generic detection + output guardrails
- **Intelligent Regeneration** - Automatic correction of off-persona responses
- **Jailbreak Resistance** - Protection against persona override attempts
- **Tool Integration** - File reading, web search, and custom tools
- **Memory Management** - Conversation history and context retention

## 🚀 Recent Enhancement: Persona Enforcement System

The platform now includes a comprehensive persona enforcement system that ensures agents ALWAYS behave according to their defined persona. See [personaforge-backend/PERSONA_ENFORCEMENT_GUIDE.md](personaforge-backend/PERSONA_ENFORCEMENT_GUIDE.md) for details.

### What's New:
- ✅ Intent-based prompt structuring
- ✅ Enhanced system prompts with strict enforcement
- ✅ Generic response detection
- ✅ Multi-attempt regeneration
- ✅ Domain-specific fallback responses

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Frontend (Next.js)

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

### Backend (PersonaForge Agent Server)

Navigate to the backend directory and start the server:

```bash
cd personaforge-backend
node server.js
```

The backend server will run on [http://localhost:8000](http://localhost:8000).

### Test Persona Enforcement

Run the demonstration script to see how the persona enforcement system works:

```bash
cd personaforge-backend
node test-persona-enforcement.js
```

## 📚 Documentation

### Persona Enforcement System
- **[Persona Enforcement Guide](personaforge-backend/PERSONA_ENFORCEMENT_GUIDE.md)** - Comprehensive documentation
- **[Quick Reference](personaforge-backend/QUICK_REFERENCE.md)** - Quick start guide
- **[Architecture Diagram](personaforge-backend/ARCHITECTURE_DIAGRAM.md)** - Visual system overview
- **[Migration Guide](personaforge-backend/MIGRATION_GUIDE.md)** - Upgrade guide for existing agents
- **[Enhancement Summary](personaforge-backend/ENHANCEMENT_SUMMARY.md)** - What changed and why

### Testing
Run the test script to see prompt transformations and validation layers:
```bash
cd personaforge-backend
node test-persona-enforcement.js
```

## 🎯 How It Works

PersonaForge uses a multi-layer approach to ensure strict persona adherence:

1. **Input Guardrail** - Blocks harmful/unsafe content
2. **Prompt Structuring** - Transforms user input with intent detection
3. **LLM Generation** - Enhanced system prompt with strict enforcement
4. **Generic Detection** - Fast pattern-based validation
5. **Output Guardrail** - LLM-based domain alignment check
6. **Regeneration** - Multi-attempt correction if needed
7. **Memory** - Saves validated conversation history

### Example Transformation

**User Input:** "hi"

**Structured Prompt:**
```
You are a Gynecologist AI Assistant.

CONTEXT: The user has initiated a conversation with a simple greeting.
INSTRUCTION: Respond with a warm, professional greeting that immediately 
establishes your role as a Gynecologist specialist. Guide the user towards 
discussing Gynecologist-related topics.
USER INPUT: "hi"

REMINDER: You MUST respond as a Gynecologist specialist.
```

**Agent Response:** "Hello! I'm here to help with women's health concerns. What brings you in today?"

## 🛠️ Technology Stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Backend:** Node.js, Express
- **LLM:** Groq (Llama 3.3 70B)
- **Database:** MongoDB
- **AI Framework:** LangChain
- **Authentication:** NextAuth.js

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.