import { createHash, randomBytes } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { basename, extname, isAbsolute, relative, resolve, sep } from 'node:path'

export const CONTENT_ASSET_MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
}

export const DEFAULT_CONTENT_ASSET_TTL_SECONDS = 60 * 60
export const MAX_CONTENT_ASSET_TTL_SECONDS = 60 * 60 * 24

export type ContentAssetMetadata = {
  filename: string
  mimeType: string
  size: number
  hash: string
}

export type ContentAssetResolvedPath = {
  absolutePath: string
  relativePath: string
  baseDir: string
}

export type ContentAssetExpiryInput = {
  expiresAt?: string | null
  ttlSeconds?: number | null
}

export type ContentAssetExposureStatusInput = {
  status: string
  expires_at: string
  cleaned_up_at: string | null
}

export type ContentAssetRegisterInput = {
  path?: unknown
  tags?: unknown
  metadata?: unknown
}

export function normalizeContentAssetBaseDirs(value?: string | null): string[] {
  return (value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => resolve(item))
}

export function getConfiguredContentAssetBaseDirs(): string[] {
  return normalizeContentAssetBaseDirs(
    process.env.CONTENT_ASSET_BASE_DIRS
      || process.env.CONTENT_ASSET_BASE_DIR
      || process.env.LUPE_SHARED_FOLDER
      || process.env.LUPE_GOOGLE_DRIVE_PATH
  )
}

export function getContentAssetRelativePath(absolutePath: string, baseDir: string): string {
  return relative(resolve(baseDir), resolve(absolutePath)).split(sep).join('/')
}

export function resolveContentAssetPath(inputPath: string, baseDirs = getConfiguredContentAssetBaseDirs()): ContentAssetResolvedPath {
  if (!inputPath || typeof inputPath !== 'string') {
    throw new Error('path is required')
  }

  if (baseDirs.length === 0) {
    throw new Error('CONTENT_ASSET_BASE_DIRS or LUPE_SHARED_FOLDER is required')
  }

  const absolutePath = resolve(inputPath)
  if (!isAbsolute(absolutePath)) {
    throw new Error('path must resolve to an absolute file path')
  }

  for (const baseDir of baseDirs) {
    const resolvedBase = resolve(baseDir)
    const rel = relative(resolvedBase, absolutePath)
    const isInside = rel && !rel.startsWith('..') && !isAbsolute(rel)

    if (absolutePath === resolvedBase || isInside) {
      return {
        absolutePath,
        relativePath: getContentAssetRelativePath(absolutePath, resolvedBase),
        baseDir: resolvedBase,
      }
    }
  }

  throw new Error('path must be inside an approved base directory')
}

export function getContentAssetMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase()
  const mimeType = CONTENT_ASSET_MIME_TYPES[ext]

  if (!mimeType) {
    throw new Error('Unsupported content asset type. Supported types: png, jpg, jpeg, webp')
  }

  return mimeType
}

export async function getContentAssetFileMetadata(filePath: string): Promise<ContentAssetMetadata> {
  const mimeType = getContentAssetMimeType(filePath)
  const stats = await stat(filePath)

  if (!stats.isFile()) {
    throw new Error('path must point to a file')
  }

  return {
    filename: basename(filePath),
    mimeType,
    size: stats.size,
    hash: await sha256File(filePath),
  }
}

export function getContentAssetToken(): string {
  return randomBytes(32).toString('base64url')
}

export function getContentAssetExpiry(input: ContentAssetExpiryInput = {}, now = new Date()): Date {
  if (input.expiresAt) {
    const explicit = new Date(input.expiresAt)
    if (Number.isNaN(explicit.getTime())) {
      throw new Error('expires_at must be a valid ISO timestamp')
    }
    if (explicit.getTime() <= now.getTime()) {
      throw new Error('expires_at must be in the future')
    }
    return explicit
  }

  const ttlSeconds = clampTtl(input.ttlSeconds)
  return new Date(now.getTime() + ttlSeconds * 1000)
}

export function getContentAssetPublicStatus(exposure: ContentAssetExposureStatusInput, now = new Date()): 'active' | 'expired' | 'cleaned' | 'revoked' {
  if (exposure.cleaned_up_at) return 'cleaned'
  if (exposure.status === 'revoked') return 'revoked'
  if (new Date(exposure.expires_at).getTime() <= now.getTime()) return 'expired'
  return exposure.status === 'active' ? 'active' : 'revoked'
}

export function buildContentAssetPublicUrl(baseUrl: string, token: string): string {
  if (!baseUrl) {
    throw new Error('CONTENT_ASSET_PUBLIC_BASE_URL or LUPE_DASHBOARD_URL is required')
  }

  const url = new URL(`/public/content-assets/${encodeURIComponent(token)}`, baseUrl)
  return url.toString()
}

export function getConfiguredContentAssetPublicBaseUrl(requestUrl?: string): string {
  return process.env.CONTENT_ASSET_PUBLIC_BASE_URL
    || process.env.LUPE_DASHBOARD_URL
    || requestUrl
    || ''
}

export function normalizeContentAssetRegisterInput(input: ContentAssetRegisterInput) {
  if (typeof input.path !== 'string' || !input.path.trim()) {
    throw new Error('path is required')
  }

  return {
    path: input.path.trim(),
    tags: Array.isArray(input.tags)
      ? input.tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
      : [],
    metadata: input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata)
      ? input.metadata as Record<string, unknown>
      : {},
  }
}

function clampTtl(ttlSeconds?: number | null): number {
  if (ttlSeconds == null) return DEFAULT_CONTENT_ASSET_TTL_SECONDS
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
    throw new Error('ttl_seconds must be a positive number')
  }
  return Math.min(Math.floor(ttlSeconds), MAX_CONTENT_ASSET_TTL_SECONDS)
}

async function sha256File(filePath: string): Promise<string> {
  const hash = createHash('sha256')
  const stream = createReadStream(filePath)

  for await (const chunk of stream) {
    hash.update(chunk)
  }

  return hash.digest('hex')
}
