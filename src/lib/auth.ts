import { SignJWT, jwtVerify } from 'jose'

function getSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is required')
  }
  return new TextEncoder().encode(secret)
}

export async function signJWT(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret())
}

export async function verifyJWT(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload
  } catch {
    return null
  }
}

export function checkPin(input: string): boolean {
  const configuredPin = process.env.LOGIN_PIN || process.env.LOGIN_PASSWORD
  return Boolean(configuredPin) && input === configuredPin
}
