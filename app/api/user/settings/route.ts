import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import { verifyToken } from '@/lib/auth'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth-config-simple"

function logSettingsError(context: string, error: unknown) {
  console.error(context, {
    name: error instanceof Error ? error.name : 'Error',
    message: error instanceof Error ? error.message : String(error)
  })
}

/**
 * Common function to get userId from session or JWT
 */
async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  // 1. Try to get session from NextAuth (for web users)
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.id) {
    return (session?.user as any).id
  }

  // 2. Fallback to custom JWT (for API/Mobile clients)
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    try {
      const decoded = verifyToken(token)
      if (decoded && decoded.userId) {
        return decoded.userId
      }
    } catch {
      console.error("JWT Verification failed")
    }
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const userId = await getAuthenticatedUserId(request)
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or missing token' },
        { status: 401 }
      )
    }

    const { smtpConfig } = await request.json()

    if (!smtpConfig) {
      return NextResponse.json(
        { error: 'smtpConfig is required' },
        { status: 400 }
      )
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { smtpConfig } },
      { new: true }
    )

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'SMTP settings updated successfully'
    })
  } catch (error: unknown) {
    logSettingsError('Error updating SMTP settings', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const userId = await getAuthenticatedUserId(request)
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or missing token' },
        { status: 401 }
      )
    }

    const user = await User.findById(userId).select('smtpConfig').lean().maxTimeMS(2000)

    return NextResponse.json({
      success: true,
      smtpConfig: user?.smtpConfig || {
        host: '',
        port: 465,
        user: '',
        pass: ''
      }
    })
  } catch (error: unknown) {
    logSettingsError('Error fetching SMTP settings', error)
    // Fallback response to avoid hanging UI
    return NextResponse.json({
      success: true,
      smtpConfig: { host: '', port: 465, user: '', pass: '' }
    })
  }
}
