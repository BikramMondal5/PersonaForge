import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Agent from '@/models/Agent'
import User from '@/models/User'
import { verifyToken } from '@/lib/auth'

const FIELD_LIMITS = {
  name: 100,
  description: 500,
  systemPrompt: 2000,
  tone: 100,
  domain: 100,
  responseStyle: 100,
  listItem: 100
} as const

function limitText(value: unknown, maxLength: number) {
  const text = typeof value === 'string' ? value.trim() : ''

  if (text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, maxLength - 3).trimEnd()}...`
}

function limitStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => limitText(item, FIELD_LIMITS.listItem))
    .filter(Boolean)
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T) {
  return typeof value === 'string' && allowed.includes(value as T) ? value as T : fallback
}

function isValidationError(error: unknown): error is { name: string; errors?: Record<string, { message?: string }> } {
  return typeof error === 'object' && error !== null && 'name' in error && error.name === 'ValidationError'
}

// Get user's agents
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const authHeader = request.headers.get('authorization')
    let userId: string

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const decoded = verifyToken(token)
      userId = decoded.userId
    } else {
      // Fallback to session
      const { getToken } = await import('next-auth/jwt')
      const token = await getToken({ 
        req: request,
        secret: process.env.NEXTAUTH_SECRET 
      })

      if (!token || !token.userId) {
        return NextResponse.json(
          { error: 'Authorization required' },
          { status: 401 }
        )
      }
      userId = token.userId as string
    }

    const agents = await Agent.find({ userId })
      .sort({ createdAt: -1 })
      .select('-__v')

    return NextResponse.json({ agents }, { status: 200 })

  } catch (error: unknown) {
    console.error('Get agents error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Create new agent
export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const authHeader = request.headers.get('authorization')
    let userId: string

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const decoded = verifyToken(token)
      userId = decoded.userId
    } else {
      // Fallback to session
      const { getToken } = await import('next-auth/jwt')
      const token = await getToken({ 
        req: request,
        secret: process.env.NEXTAUTH_SECRET 
      })

      if (!token || !token.userId) {
        return NextResponse.json(
          { error: 'Authorization required' },
          { status: 401 }
        )
      }
      userId = token.userId as string
    }

    const {
      name,
      description,
      systemPrompt,
      tone,
      domain,
      responseStyle,
      guardrails,
      tools,
      memoryMode,
      responseLength,
      safetyFilters
    } = await request.json()

    const agentInput = {
      name: limitText(name, FIELD_LIMITS.name),
      description: limitText(description, FIELD_LIMITS.description),
      systemPrompt: limitText(systemPrompt, FIELD_LIMITS.systemPrompt),
      tone: limitText(tone, FIELD_LIMITS.tone),
      domain: limitText(domain, FIELD_LIMITS.domain),
      responseStyle: limitText(responseStyle, FIELD_LIMITS.responseStyle),
      guardrails: limitStringList(guardrails),
      tools: limitStringList(tools),
      memoryMode: oneOf(memoryMode, ['stateless', 'session', 'persistent'] as const, 'session'),
      responseLength: oneOf(responseLength, ['short', 'medium', 'long'] as const, 'medium'),
      safetyFilters: safetyFilters !== undefined ? Boolean(safetyFilters) : true
    }

    // Validation
    if (!agentInput.name || !agentInput.description || !agentInput.systemPrompt || !agentInput.tone || !agentInput.domain || !agentInput.responseStyle) {
      return NextResponse.json(
        { error: 'All required fields must be provided' },
        { status: 400 }
      )
    }

    // Check user's plan limits
    const user = await User.findById(userId)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const agentCount = await Agent.countDocuments({ userId })
    
    // Plan limits
    const planLimits = {
      starter: 5,
      pro: Infinity,
      enterprise: Infinity
    }

    if (agentCount >= planLimits[user.plan as keyof typeof planLimits]) {
      return NextResponse.json(
        { error: `Your ${user.plan} plan allows maximum ${planLimits[user.plan as keyof typeof planLimits]} agents` },
        { status: 403 }
      )
    }

    // Create agent
    const agent = await Agent.create({
      userId,
      ...agentInput
    })

    // Update user's agent count
    user.agentsCreated += 1
    await user.save()

    return NextResponse.json({
      message: 'Agent created successfully',
      agent: {
        id: agent._id,
        name: agent.name,
        description: agent.description,
        tone: agent.tone,
        domain: agent.domain,
        responseStyle: agent.responseStyle,
        memoryMode: agent.memoryMode,
        responseLength: agent.responseLength,
        safetyFilters: agent.safetyFilters,
        tools: agent.tools,
        isDeployed: agent.isDeployed,
        createdAt: agent.createdAt
      }
    }, { status: 201 })

  } catch (error: unknown) {
    console.error('Create agent error:', error)

    if (isValidationError(error)) {
      const validationMessages = Object.values(error.errors || {})
        .map((validationError) => validationError.message)
        .filter((message): message is string => Boolean(message))

      return NextResponse.json(
        { error: validationMessages[0] || 'Invalid agent data' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
