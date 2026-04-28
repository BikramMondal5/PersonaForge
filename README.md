# 🚀✨ PersonaForge - "Turn prompts into powerful, purpose-driven agents"

![Screenshot](./screenshot.png)
PersonaForge is an advanced **AI agent platform** that enables users to create **specialized, persona-driven AI assistants** using natural language. Designed for reliability and safety, PersonaForge ensures agents strictly adhere to their defined roles and **never degrade into generic assistants**.

Built with modern web technologies and scalable cloud architecture, PersonaForge demonstrates how AI systems can be **controlled, safe, and domain-specific**, aligning with the **Open Innovation theme of Google Solution Challenge 2026**.

# 🌍 Google Solution Challenge 2026 – Open Innovation

PersonaForge addresses a core challenge in modern AI systems:

> ❗ AI assistants often lose context, break persona, or generate unsafe/generic responses.

### 💡 Our Solution:
- Structured persona enforcement  
- Multi-layer guardrails  
- Tool-augmented intelligent agents  

# ✨ Key Features

## 🧠 Persona-Driven Intelligence
- **Strict Persona Enforcement**  
  Every agent strictly follows its defined role and never falls back to a generic assistant.

- **Automatic Prompt Structuring**  
  User inputs are transformed into structured, context-aware prompts for better reasoning and consistency.

- **Identity Lock & Override Protection**  
  Prevents agents from changing roles due to user prompts or jailbreak attempts.

## ⚙️ Advanced AI Reasoning
- **Intent Detection & Context Understanding**  
  Identifies user intent and enriches prompts with domain-specific context.

- **Multi-Step Reasoning Pipeline**  
  Ensures responses are logical, structured, and aligned with the agent’s expertise.

- **Adaptive Response Generation**  
  Generates responses tailored to user needs while maintaining persona consistency.

## 🛡️ Safety & Guardrails
- **Multi-Layer Guardrails System**
  - Input validation (unsafe or harmful prompts)
  - Output validation (domain alignment)
  - Generic response detection

- **Jailbreak Resistance**
  Protects against prompt injection and attempts to override agent behavior.

- **Controlled Tool Access**
  Agents can only use approved tools, preventing misuse or unsafe actions.

## 🔁 Intelligent Correction System
- **Automatic Regeneration Engine**  
  Detects off-persona or low-quality responses and regenerates them.

- **Domain Alignment Validation**  
  Ensures every response stays relevant to the agent’s domain.

- **Fallback Strategy**
  Provides safe, domain-specific fallback responses instead of generic answers.

## 🔧 Tool-Enhanced Capabilities
- **File Intelligence (`read_file`)**
  Analyze and extract insights from uploaded files and documents.

- **Web Search & URL Navigation**
  Fetch real-time information and summarize web content.

- **Extensible Tool System**
  Easily integrate additional tools like email automation, calendar, or APIs.

## 🧠 Memory & Context Awareness
- **Conversation Memory**
  Maintains chat history for coherent multi-turn conversations.

- **Session-Based Context**
  Understands previous interactions to provide better responses.

- **Stateful Agent Behavior**
  Enables more human-like, consistent interactions.

## 🔐 Secure & Scalable System
- **API Key Management**
  Secure access control with unique API keys per user.

- **Agent ID-Based Invocation**
  Each agent has a unique identifier for consistent API usage.

- **Cloud-Ready Deployment**
  Designed for scalable deployment using modern cloud infrastructure.

## 🎨 Developer & User Experience
- **Simple Agent Creation**
  Create powerful AI agents using just natural language prompts.

- **Clean Integration APIs**
  Easily integrate agents into apps using Fetch or cURL.

- **Interactive UI & Sandbox**
  Test and refine agents in a real-time environment.

## ☁️ Google Services Used

| Google Service | Purpose |
|---------------|--------|
| Gemini API | Core AI engine for agent reasoning, prompt processing, and response generation |
| Cloud Run | Serverless deployment for AI agent backend with auto-scaling capabilities (Future plan) |
| Google OAuth | Secure user authentication using Google Sign-In |
| Firebase (Firestore) | Database for storing users, agents, API keys, and session data (Future plan) |
| Google Cloud Storage | Storage for user-uploaded files (PDFs, datasets) used by `read_file` tool (Future plan) |
| Speech-to-Text | Converts user voice input into text for voice-enabled AI interaction (Future plan) |
| Text-to-Speech | Converts AI responses into natural voice output for better UX (Future plan) |
| Google Maps Platform | Provides location-based intelligence (e.g., nearby services, contextual queries) (Future plan) |
| Vertex AI | Advanced model management, evaluation, and fine-tuning for agents (Future plan) |
| BigQuery | Analytics on user queries, agent performance, and usage insights (Future plan) |
| Document AI | Extract and process structured data from PDFs and documents (Future plan) |
| Cloud Functions | Background task execution for automation (email, scheduling, workflows) (Future plan) |

# 🛠️ Tech Stack

- Next.js, React, TypeScript  
- Tailwind CSS, Framer Motion  
- MongoDB, Redis  
- LangChain, LangGraph  
- Gemini API
- Firebase Auth, Cloud Run  
- Google Cloud Storage, Speech APIs, Maps  

## ⚙️ Installation

1. Clone the repository:
```bash
git clone https://github.com/BikramMondal5/personaforge.git
```
2. Navigate to the project directory:
```bash
cd personaforge
```
3. Install dependencies:
```bash
npm install
#or
npm install --legacy-peer-deps
```

4. Run the Frontend:
```bash
npm run dev
```

5. Run the Backend:
```bash
#Open a new terminal
cd personaforge-backend
npm install
#or
npm install --legacy-peer-deps
npm start
```
6. Open your browser and navigate to `http://localhost:3000` to view the app.

## 🚀 How to Use

-  **Sign up / Log in** using Google or GitHub to access the dashboard. 
-  **Create an Agent** by describing it in plain English (e.g., “Gynecologist AI” or “Startup Mentor”). 
-  **Forge the Agent** – PersonaForge automatically structures your prompt and locks the agent’s identity. 
-  **Test in Sandbox** – interact with your agent and verify its behavior in real-time. 
-  **Enhance with Tools** – enable features like file reading, web search, or URL visiting. 
-  **Deploy & Integrate** – use your unique `agent_id` and API key to call the agent via Fetch or cURL. 
-  **Manage & Monitor** – track usage, update agents, and manage API keys from the dashboard.

# 📜 License
Licensed under the `Apache License 2.0`. See LICENSE for details.
