import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Agent from '@/models/Agent'
import { verifyToken } from '@/lib/auth'
import { getToken } from 'next-auth/jwt'

async function getAuthenticatedUserId(request: NextRequest) {
  const authHeader = request.headers.get('authorization')

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)
    return decoded.userId
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  })

  return token?.userId as string | undefined
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()

    const userId = await getAuthenticatedUserId(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      )
    }

    const { id } = await params
    const updates = await request.json()

    // Find the agent and verify ownership
    const agent = await Agent.findOne({ _id: id, userId })

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    // Allow specific updates
    if (updates.testCount !== undefined) {
      agent.testCount += 1
      agent.lastTested = new Date()
    }

    if (updates.isDeployed !== undefined) {
      agent.isDeployed = updates.isDeployed
    }

    if (updates.totalApiCalls !== undefined) {
      agent.totalApiCalls += 1
    }

    await agent.save()

    return NextResponse.json({
      message: 'Agent updated successfully',
      agent
    })

  } catch (error: any) {
    console.error('Update agent error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()

    const userId = await getAuthenticatedUserId(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      )
    }

    const { id } = await params
    const deletedAgent = await Agent.findOneAndDelete({ _id: id, userId })

    if (!deletedAgent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'Agent deleted successfully'
    })

  } catch (error: any) {
    console.error('Delete agent error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
