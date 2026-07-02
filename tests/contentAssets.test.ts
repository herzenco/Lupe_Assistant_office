import assert from 'node:assert/strict'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import test from 'node:test'
import {
  buildContentAssetPublicUrl,
  getContentAssetExpiry,
  getContentAssetFileMetadata,
  getContentAssetPublicStatus,
  getContentAssetRelativePath,
  getContentAssetToken,
  normalizeContentAssetBaseDirs,
  resolveContentAssetPath,
} from '../src/lib/contentAssets.ts'

test('resolveContentAssetPath accepts files inside allowed base directories', () => {
  const base = '/tmp/lupe-shared'
  const resolved = resolveContentAssetPath('/tmp/lupe-shared/social/post.png', [base])

  assert.equal(resolved.absolutePath, '/tmp/lupe-shared/social/post.png')
  assert.equal(resolved.relativePath, 'social/post.png')
})

test('resolveContentAssetPath rejects sibling and traversal paths outside allowed base directories', () => {
  assert.throws(
    () => resolveContentAssetPath('/tmp/lupe-shared-evil/post.png', ['/tmp/lupe-shared']),
    /inside an approved base directory/
  )

  assert.throws(
    () => resolveContentAssetPath('/tmp/lupe-shared/../private/post.png', ['/tmp/lupe-shared']),
    /inside an approved base directory/
  )
})

test('normalizeContentAssetBaseDirs reads comma-separated environment values', () => {
  const dirs = normalizeContentAssetBaseDirs('/Users/lupe/Shared, /Volumes/Lupe Assets ')

  assert.deepEqual(dirs, ['/Users/lupe/Shared', '/Volumes/Lupe Assets'])
})

test('getContentAssetRelativePath preserves nested asset locations', () => {
  const relative = getContentAssetRelativePath('/Users/lupe/Shared/Instagram/post.webp', '/Users/lupe/Shared')

  assert.equal(relative, 'Instagram/post.webp')
})

test('getContentAssetFileMetadata supports image files and hashes content', async () => {
  const dir = join(tmpdir(), `content-assets-${Date.now()}`)
  const file = join(dir, 'post.jpg')
  await mkdir(dir, { recursive: true })
  await writeFile(file, 'fake image bytes')

  try {
    const metadata = await getContentAssetFileMetadata(file)

    assert.equal(metadata.filename, 'post.jpg')
    assert.equal(metadata.mimeType, 'image/jpeg')
    assert.equal(metadata.size, 16)
    assert.match(metadata.hash, /^[a-f0-9]{64}$/)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('getContentAssetFileMetadata rejects unsupported file types', async () => {
  const dir = join(tmpdir(), `content-assets-${Date.now()}`)
  const file = join(dir, 'post.txt')
  await mkdir(dir, { recursive: true })
  await writeFile(file, 'not media')

  try {
    await assert.rejects(
      () => getContentAssetFileMetadata(file),
      /Supported types/
    )
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('getContentAssetToken returns unguessable url-safe tokens', () => {
  const token = getContentAssetToken()

  assert.match(token, /^[A-Za-z0-9_-]{32,}$/)
})

test('getContentAssetExpiry supports explicit expiration and ttl seconds', () => {
  const now = new Date('2026-07-02T12:00:00.000Z')

  assert.equal(
    getContentAssetExpiry({ expiresAt: '2026-07-02T13:30:00.000Z' }, now).toISOString(),
    '2026-07-02T13:30:00.000Z'
  )
  assert.equal(
    getContentAssetExpiry({ ttlSeconds: 600 }, now).toISOString(),
    '2026-07-02T12:10:00.000Z'
  )
})

test('getContentAssetPublicStatus treats expired and cleaned exposures as unavailable', () => {
  const now = new Date('2026-07-02T12:00:00.000Z')

  assert.equal(
    getContentAssetPublicStatus({ status: 'active', expires_at: '2026-07-02T12:10:00.000Z', cleaned_up_at: null }, now),
    'active'
  )
  assert.equal(
    getContentAssetPublicStatus({ status: 'active', expires_at: '2026-07-02T11:59:59.000Z', cleaned_up_at: null }, now),
    'expired'
  )
  assert.equal(
    getContentAssetPublicStatus({ status: 'revoked', expires_at: '2026-07-02T12:10:00.000Z', cleaned_up_at: '2026-07-02T12:01:00.000Z' }, now),
    'cleaned'
  )
})

test('buildContentAssetPublicUrl creates clean dashboard public URLs', () => {
  assert.equal(
    buildContentAssetPublicUrl('https://dashboard.example.com/', 'abc123'),
    'https://dashboard.example.com/public/content-assets/abc123'
  )
})
