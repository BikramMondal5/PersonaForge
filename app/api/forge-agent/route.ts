import { NextRequest, NextResponse } from 'next/server'

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
]

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.toLowerCase() : ''
}

function extractDomainFromText(description: string) {
  const text = normalizeText(description)
  if (!text) return ''

  let bestMatch = { domain: '', score: 0 }

  for (const entry of DOMAIN_KEYWORDS) {
    let score = 0
    for (const keyword of entry.keywords) {
      if (text.includes(keyword)) {
        score += 1
      }
    }
    if (score > bestMatch.score) {
      bestMatch = { domain: entry.domain, score }
    }
  }

  return bestMatch.score > 0 ? bestMatch.domain : ''
}

function sanitizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function buildIdentityPrompt(agentName: string, domain: string, description: string, tone?: string) {
  const name = agentName || 'Specialist Assistant'
  const roleText = description?.trim() || 'Provide domain-specific guidance.'
  const toneLine = tone ? `\nTone: ${tone}.` : ''

  return `You are ${name}, a highly specialized AI assistant in ${domain}.\n\nROLE:\n${roleText}${toneLine}\n\nSTRICT RULES:\n- You are NOT a general assistant.\n- You MUST ONLY answer within ${domain}.\n- If a query is outside your domain, politely refuse and redirect.\n- NEVER say phrases like:\n  'I help with a wide range of topics'\n  'I can assist with anything'\n- Maintain domain-specific tone at all times.\n\nTOOL USAGE:\nUse tools only when relevant to your domain.\n\nFINAL RULE:\nIf you break persona, regenerate the response.`
}

function deriveAgentName(prompt: string, domain: string) {
  const text = normalizeText(prompt)
  if (text.includes('mentor')) return `${domain} Mentor`
  if (text.includes('doctor')) return `${domain} Doctor`
  if (text.includes('advisor') || text.includes('adviser')) return `${domain} Advisor`
  return `${domain} Specialist`
}

function logForgeError(error: unknown) {
  console.error('Forge API error', {
    name: error instanceof Error ? error.name : 'Error',
    message: error instanceof Error ? error.message : String(error)
  })
}

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const apiKey = process.env.GROQ_API_KEY

    const extractedDomain = extractDomainFromText(prompt)

    // For demonstration purposes, if API key is missing, we'll return a mock response
    // but the implementation is ready for Groq
    if (!apiKey) {
      console.warn('GROQ_API_KEY is missing. Returning mock response for Forge Engine.')

      // Simulate brief delay
      await new Promise(resolve => setTimeout(resolve, 3000))

      const fallbackDomain = extractedDomain || "General Knowledge"
      const agentName = deriveAgentName(prompt, fallbackDomain)

      return NextResponse.json({
        agentName,
        tone: "Professional",
        domain: fallbackDomain,
        memory: "session",
        responseStyle: "Clear and concise",
        guardrails: [
          "No illegal advice",
          "Maintain professional tone",
          "Avoid harmful or unethical guidance"
        ],
        systemPrompt: buildIdentityPrompt(agentName, fallbackDomain, prompt)
      })
    }

    const systemInstruction = `You are an AI system that converts descriptions of AI assistants into structured agent configurations.

Analyze the user description and generate a configuration with the following fields:
- agentName
- tone
- domain
- memory (stateless, session, or persistent)
- responseStyle
- guardrails (array of strings)
- systemPrompt

Field limits:
- agentName, tone, domain, and responseStyle must each be 100 characters or less.
- Each guardrail must be 100 characters or less.
- systemPrompt must be 2000 characters or less.

Return only valid JSON. Use this format:
{
  "agentName": "...",
  "tone": "...",
  "domain": "...",
  "memory": "...",
  "responseStyle": "...",
  "guardrails": [...],
  "systemPrompt": "..."
}

User description:
${prompt}`

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You generate structured JSON configurations for AI agents based on the provided description.' },
          { role: 'user', content: systemInstruction }
        ],
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json({ error: errorData.error?.message || 'Groq AI request failed' }, { status: response.status })
    }

    const data = await response.json()
    const content = data.choices[0].message.content

    try {
      const config = JSON.parse(content)

      const modelDomain = sanitizeText(config.domain)
      const finalDomain = extractedDomain || modelDomain || "General Knowledge"
      const agentName = sanitizeText(config.agentName) || deriveAgentName(prompt, finalDomain)

      return NextResponse.json({
        ...config,
        agentName,
        domain: finalDomain,
        systemPrompt: buildIdentityPrompt(agentName, finalDomain, prompt, config.tone)
      })
    } catch {
      return NextResponse.json({ error: 'Failed to parse Groq AI response' }, { status: 500 })
    }

  } catch (error: unknown) {
    logForgeError(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
