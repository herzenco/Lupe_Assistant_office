'use client'

import { useCallback, useMemo, useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { clsx } from 'clsx'
import { Ban, ExternalLink, Image, Link2, RefreshCw, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { usePolling } from '@/hooks/usePolling'
import type { ContentAsset, ContentAssetExposure } from '@/lib/types'

type ContentAssetWithExposures = ContentAsset & {
  content_asset_exposures?: ContentAssetExposure[]
}

type ContentAssetsResponse = {
  assets: ContentAssetWithExposures[]
}

function activeExposure(asset: ContentAssetWithExposures): ContentAssetExposure | null {
  const now = Date.now()
  return (asset.content_asset_exposures || [])
    .filter(exposure =>
      exposure.status === 'active'
      && !exposure.cleaned_up_at
      && new Date(exposure.expires_at).getTime() > now
    )
    .sort((a, b) => new Date(b.exposed_at).getTime() - new Date(a.exposed_at).getTime())[0] || null
}

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

export default function ContentAssetsPage() {
  const [revoking, setRevoking] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchAssets = useCallback(async () => {
    const res = await fetch(`/api/content-assets?refresh=${refreshKey}`)
    return res.ok ? (res.json() as Promise<ContentAssetsResponse>) : null
  }, [refreshKey])

  const { data } = usePolling(fetchAssets, 30_000)
  const assets = data?.assets || []
  const exposedCount = useMemo(() => assets.filter(asset => activeExposure(asset)).length, [assets])

  const revokeAsset = async (assetId: string) => {
    setRevoking(assetId)
    try {
      await fetch(`/api/content-assets/${assetId}/revoke`, { method: 'POST' })
      setRefreshKey(key => key + 1)
    } finally {
      setRevoking(null)
    }
  }

  return (
    <div>
      <PageHeader title="Content Asset Bridge" subtitle="Registered media and temporary public exposures" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Assets</p>
          <p className="text-2xl font-bold text-white mt-2">{assets.length}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Exposed</p>
          <p className="text-2xl font-bold text-green-400 mt-2">{exposedCount}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Audit Rows</p>
          <p className="text-2xl font-bold text-indigo-300 mt-2">
            {assets.reduce((count, asset) => count + (asset.content_asset_exposures?.length || 0), 0)}
          </p>
        </div>
      </div>

      {assets.length === 0 ? (
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-12 text-center">
          <Image size={28} className="text-zinc-600 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">No registered assets</p>
        </div>
      ) : (
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Asset</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Metadata</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Exposure</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Public URL</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assets.map(asset => {
                  const exposure = activeExposure(asset)
                  const exposureCount = asset.content_asset_exposures?.length || 0
                  return (
                    <tr key={asset.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors align-top">
                      <td className="px-4 py-4 min-w-64">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400">
                            <Image size={18} />
                          </div>
                          <div>
                            <p className="text-zinc-100 font-medium">{asset.filename}</p>
                            <p className="text-zinc-500 text-xs font-mono mt-1 break-all">{asset.relative_path}</p>
                            {asset.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {asset.tags.map(tag => (
                                  <span key={tag} className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[11px]">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-zinc-400 whitespace-nowrap">
                        <p>{asset.mime_type}</p>
                        <p className="text-xs text-zinc-500 mt-1">{formatBytes(asset.size_bytes)}</p>
                        <p className="text-xs text-zinc-600 font-mono mt-1">{asset.sha256.slice(0, 12)}</p>
                      </td>
                      <td className="px-4 py-4 min-w-48">
                        {exposure ? (
                          <div>
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/15 text-green-400">
                              <ShieldCheck size={12} />
                              Active
                            </span>
                            <p className="text-xs text-zinc-500 mt-2">
                              Expires {formatDistanceToNow(new Date(exposure.expires_at), { addSuffix: true })}
                            </p>
                            <p className="text-xs text-zinc-600 mt-1">
                              {format(new Date(exposure.expires_at), 'MMM d, HH:mm')}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-500">
                              <Link2 size={12} />
                              Private
                            </span>
                            <p className="text-xs text-zinc-600 mt-2">{exposureCount} audit {exposureCount === 1 ? 'row' : 'rows'}</p>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 min-w-80">
                        {exposure ? (
                          <a
                            href={exposure.public_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-indigo-300 hover:text-indigo-200 font-mono text-xs break-all"
                          >
                            {exposure.public_url}
                            <ExternalLink size={12} className="shrink-0" />
                          </a>
                        ) : (
                          <span className="text-zinc-600 text-xs">No active URL</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => revokeAsset(asset.id)}
                          disabled={!exposure || revoking === asset.id}
                          className={clsx(
                            'inline-flex items-center justify-center h-9 w-9 rounded-lg transition-colors',
                            exposure
                              ? 'bg-zinc-800 text-zinc-300 hover:bg-red-500/20 hover:text-red-300'
                              : 'bg-zinc-900 text-zinc-700 cursor-not-allowed'
                          )}
                          title="Revoke exposure"
                        >
                          {revoking === asset.id ? <RefreshCw size={16} className="animate-spin" /> : <Ban size={16} />}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
