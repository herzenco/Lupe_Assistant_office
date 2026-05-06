'use client'

import { useState, useCallback } from 'react'
import { usePolling } from '@/hooks/usePolling'
import { useProjects } from '@/hooks/useProjects'
import { NewProjectModal } from '@/components/NewProjectModal'
import { PageHeader } from '@/components/PageHeader'
import { ACTION_TYPE_LABELS, ACTION_TYPE_COLORS, ACTION_TYPES } from '@/lib/constants'
import type { Action, ActionType } from '@/lib/types'
import { Search, FolderPlus } from 'lucide-react'
import { format } from 'date-fns'

interface ActionsData {
  actions: Action[]
  grouped: Record<string, Action[]>
  total: number
  page: number
  total_pages: number
}

export default function ActionsPage() {
  const { projects, getProjectColor, createProject } = useProjects()
  const [showNewProject, setShowNewProject] = useState(false)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterProject, setFilterProject] = useState('')

  const fetchActions = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), limit: '50' })
    if (search) params.set('search', search)
    if (filterType) params.set('action_type', filterType)
    if (filterProject) params.set('project_tag', filterProject)

    const res = await fetch(`/api/actions?${params}`)
    if (!res.ok) throw new Error('Failed to fetch')
    return res.json() as Promise<ActionsData>
  }, [page, search, filterType, filterProject])

  const { data, loading } = usePolling(fetchActions, 60_000)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
  }

  return (
    <div>
      <PageHeader title="Action Log" subtitle="Every business action Lupe takes" />

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <form onSubmit={handleSearch} className="flex-1 min-w-[200px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search actions..."
            className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
          />
        </form>
        <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1) }} className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300">
          <option value="">All Types</option>
          {ACTION_TYPES.map(t => <option key={t} value={t}>{ACTION_TYPE_LABELS[t]}</option>)}
        </select>
        <select value={filterProject} onChange={e => { setFilterProject(e.target.value); setPage(1) }} className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300">
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.slug} value={p.name}>{p.name}</option>)}
        </select>
        <button
          onClick={() => setShowNewProject(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-zinc-400 bg-zinc-800 border border-zinc-700 rounded-lg hover:text-zinc-200 hover:border-zinc-600 transition-colors"
        >
          <FolderPlus size={14} /> New Project
        </button>
      </div>

      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreate={createProject}
        />
      )}

      {loading ? (
        <div className="text-center text-zinc-500 py-12">Loading...</div>
      ) : !data?.actions?.length ? (
        <div className="text-center text-zinc-500 py-12">No actions logged yet.</div>
      ) : (
        <>
          {/* Grouped by day */}
          {Object.entries(data.grouped)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([day, actions]) => (
              <div key={day} className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-sm font-semibold text-zinc-300">
                    {format(new Date(day + 'T00:00:00'), 'MMMM d, yyyy')}
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500">
                    {actions.length} action{actions.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-1">
                  {actions.map(action => (
                    <div key={action.id} className="flex items-center gap-3 py-2.5 px-4 rounded-lg hover:bg-zinc-900/50 transition-colors">
                      <span className="text-xs text-zinc-600 w-14 flex-shrink-0 font-mono">
                        {format(new Date(action.timestamp), 'HH:mm')}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                        style={{
                          background: `${ACTION_TYPE_COLORS[action.action_type as ActionType]}20`,
                          color: ACTION_TYPE_COLORS[action.action_type as ActionType],
                        }}
                      >
                        {ACTION_TYPE_LABELS[action.action_type as ActionType]}
                      </span>
                      {action.project_tag && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                          style={{
                            background: `${getProjectColor(action.project_tag)}15`,
                            color: getProjectColor(action.project_tag),
                          }}
                        >
                          {action.project_tag}
                        </span>
                      )}
                      <span className="text-sm text-zinc-300 truncate">{action.summary}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

          {/* Pagination */}
          {data.total_pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm bg-zinc-800 rounded-lg text-zinc-300 disabled:opacity-50 hover:bg-zinc-700 transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-zinc-500">Page {page} of {data.total_pages}</span>
              <button
                onClick={() => setPage(p => Math.min(data.total_pages, p + 1))}
                disabled={page >= data.total_pages}
                className="px-3 py-1.5 text-sm bg-zinc-800 rounded-lg text-zinc-300 disabled:opacity-50 hover:bg-zinc-700 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
