import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import ApiKey from '@/models/ApiKey'
import { verifyToken } from '@/lib/auth'
import { generateApiKey, hashApiKey, getKeyPrefix, maskApiKey } from '@/lib/apiKey'

// Get all API keys for user
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

    const apiKeys = await ApiKey.find({ userId })
      .sort({ createdAt: -1 })
      .select('-keyHash -__v')

    // Mask the keys for display
    const maskedKeys = apiKeys.map(key => {
      // If we have keySuffix, we use it, otherwise fall back to maskApiKey
      let keyPreview = key.keyPrefix;
      if (key.apiKey) {
        keyPreview = maskApiKey(key.apiKey);
      } else if (key.keySuffix) {
        keyPreview = `${key.keyPrefix}${'*'.repeat(17)}${key.keySuffix}`;
      } else {
        keyPreview = maskApiKey(key.keyPrefix);
      }

      return {
        id: key._id,
        name: key.name,
        apiKey: key.apiKey || null,
        keyPreview,
        isActive: key.isActive,
        lastUsedAt: key.lastUsedAt,
        createdAt: key.createdAt
      };
    })

    return NextResponse.json({ apiKeys: maskedKeys }, { status: 200 })

  } catch (error: unknown) {
    console.error('Get API keys error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Create new API key
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

    const { name } = await request.json()

    // Generate new API key
    const apiKey = generateApiKey()
    const keyHash = hashApiKey(apiKey)
    const keyPrefix = getKeyPrefix(apiKey)
    const keySuffix = apiKey.slice(-6)

    // Store hashed version
    const newApiKey = await ApiKey.create({
      keyHash,
      keyPrefix,
      keySuffix,
      apiKey, // Full key available via this endpoint only right now, or whatever logic was implemented
      userId,
      name: name || 'API Key'
    })

    return NextResponse.json({
      message: 'API key created successfully',
      apiKey,
      id: newApiKey._id,
      name: newApiKey.name,
      createdAt: newApiKey.createdAt,
      warning: 'Keep this key secure and do not share it publicly.'
    }, { status: 201 })

  } catch (error: unknown) {
    console.error('Create API key error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
