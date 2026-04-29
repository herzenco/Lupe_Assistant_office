'use client'

import { useState, useCallback } from 'react'
import { usePolling } from '@/hooks/usePolling'
import { PageHeader } from '@/components/PageHeader'
import { format, formatDistanceStrict } from 'date-fns'
import { Search, ChevronDown, ChevronUp, MessageSquare, Clock, DollarSign } from 'lucide-react'
import type { Session } from '@/lib/types'

interface SessionsData {
  sessions: Omit<Session, 'transcript'>[]
  total: number
  page: number
  total_pages: number
}

export default function SessionsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [transcript, setTranscript] = useState<Session['transcript'] | null>(null)
  const [loadingTranscript, setLoadingTranscript] = useState(false)

  const fetchSessions = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (search) params.set('search', search)

    const res = await fetch(`/api/sessions?${params}`)
    if (!res.ok) throw new Error('Failed to fetch')
    return res.json() as Promise<SessionsData>
  }, [page, search])

  const { data, loading } = usePolling(fetchSessions, 60_000)

  const toggleExpand = async (sessionId: string) => {
    if (expandedId === sessionId) {
      setExpandedId(null)
      setTranscript(null)
      return
    }

    setExpandedId(sessionId)
    setLoadingTranscript(true)
    try {
      const res = await fetch(`/api/sessions?session_id=${sessionId}`)
      const session = await res.json()
      setTranscript(session.transcript || [])
    } catch {
      setTranscript([])
    }
    setLoadingTranscript(false)
  }

  return (
    <div>
      <PageHeader title="Session Log" subtitle="Chat and task session archive" />

      <form onSubmit={e => { e.preventDefault(); setPage(1) }} className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search sessions by summary..."
          className="w-full pl-10 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
        />
      </form>

      {loading ? (
        <div className="text-center text-zinc-500 py-12">Loading...</div>
      ) : !data?.sessions?.length ? (
        <div className="text-center text-zinc-500 py-12">No sessions recorded yet.</div>
      ) : (
        <>
          <div className="space-y-2">
            {data.sessions.map(session => {
              const isExpanded = expandedId === session.session_id
              const duration = session.ended_at
                ? formatDistanceStrict(new Date(session.started_at), new Date(session.ended_at))
                : 'ongoing'

              return (
                <div key={session.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleExpand(session.session_id)}
                    className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-zinc-200 truncate">
                          {session.summary || session.session_id}
                        </span>
                        {session.model && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 flex-shrink-0">{session.model}</span>
                        )}
                        {session.channel && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 flex-shrink-0">{session.channel}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {format(new Date(session.started_at), 'MMM d, HH:mm')} · {duration}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare size={11} />
                          {(session.token_count / 1000).toFixed(1)}k tokens
                        </span>
                        {session.cost_usd > 0 && (
                          <span className="flex items-center gap-1">
                            <DollarSign size={11} />
                            ${Number(session.cost_usd).toFixed(3)}
                          </span>
                        )}
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-zinc-800">
                      {session.summary && (
                        <div className="mt-4 mb-4">
                          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Summary</p>
                          <p className="text-sm text-zinc-300">{session.summary}</p>
                        </div>
                      )}
                      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Transcript</p>
                      {loadingTranscript ? (
                        <p className="text-sm text-zinc-500">Loading transcript...</p>
                      ) : !transcript?.length ? (
                        <p className="text-sm text-zinc-500">No transcript available.</p>
                      ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {transcript.map((msg, i) => (
                            <div key={i} className="flex gap-3">
                              <span className="text-xs font-mono text-zinc-600 w-12 flex-shrink-0 pt-0.5 capitalize">{msg.role}</span>
                              <p className="text-sm text-zinc-300 whitespace-pre-wrap">{msg.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {data.total_pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 text-sm bg-zinc-800 rounded-lg text-zinc-300 disabled:opacity-50 hover:bg-zinc-700">Previous</button>
              <span className="text-sm text-zinc-500">Page {page} of {data.total_pages}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= data.total_pages} className="px-3 py-1.5 text-sm bg-zinc-800 rounded-lg text-zinc-300 disabled:opacity-50 hover:bg-zinc-700">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
