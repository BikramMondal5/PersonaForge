import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

function getJwtSecret() {
  const jwtSecret = process.env.JWT_SECRET

  if (!jwtSecret) {
    throw new Error('Please define the JWT_SECRET environment variable')
  }

  return jwtSecret
}

function getVerificationSecrets() {
  const secrets = [process.env.JWT_SECRET, process.env.NEXTAUTH_SECRET].filter(
    (secret): secret is string => Boolean(secret)
  )

  if (secrets.length === 0) {
    throw new Error('Please define the JWT_SECRET or NEXTAUTH_SECRET environment variable')
  }

  return secrets
}

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return await bcrypt.hash(password, saltRounds)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword)
}

export function generateToken(payload: object): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' })
}

export function verifyToken(token: string): any {
  const secrets = getVerificationSecrets()

  for (const secret of secrets) {
    try {
      return jwt.verify(token, secret)
    } catch {
      // Try the next configured secret before rejecting the token.
    }
  }

  throw new Error('Invalid token')
}

export interface JWTPayload {
  userId: string
  email: string
  fullName: string
  plan: string
}
