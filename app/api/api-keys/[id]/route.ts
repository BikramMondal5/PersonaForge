import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import ApiKey from '@/models/ApiKey'
import { verifyToken } from '@/lib/auth'

// Delete/Revoke API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params

    // Find and delete the API key (only if it belongs to the user)
    const apiKey = await ApiKey.findOneAndDelete({
      _id: id,
      userId
    })

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'API key revoked successfully'
    }, { status: 200 })

  } catch (error: any) {
    console.error('Delete API key error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Update API key (toggle active status or rename)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const { isActive, name } = await request.json()

    const updateData: any = {}
    if (typeof isActive === 'boolean') updateData.isActive = isActive
    if (name) updateData.name = name

    const apiKey = await ApiKey.findOneAndUpdate(
      { _id: id, userId },
      updateData,
      { new: true }
    )

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'API key updated successfully',
      apiKey: {
        id: apiKey._id,
        name: apiKey.name,
        isActive: apiKey.isActive
      }
    }, { status: 200 })

  } catch (error: any) {
    console.error('Update API key error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
