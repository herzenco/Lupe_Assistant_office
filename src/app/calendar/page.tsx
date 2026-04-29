'use client'

import { useState, useCallback, useMemo } from 'react'
import { usePolling } from '@/hooks/usePolling'
import { PageHeader } from '@/components/PageHeader'
import { PROJECT_COLORS, PRIORITY_COLORS } from '@/lib/constants'
import type { ProjectTag, TaskPriority } from '@/lib/types'
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, format, addWeeks, subWeeks, addMonths, subMonths,
  isSameDay, isToday
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'

interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  type: 'task' | 'google'
  project_tag?: string
  priority?: string
  status?: string
  calendar_source?: string
}

export default function CalendarPage() {
  const [view, setView] = useState<'week' | 'month'>('week')
  const [offset, setOffset] = useState(0)

  const { rangeStart, rangeEnd, label, days } = useMemo(() => {
    const now = new Date()
    let base: Date, start: Date, end: Date

    if (view === 'week') {
      base = offset < 0 ? subWeeks(now, -offset) : offset > 0 ? addWeeks(now, offset) : now
      start = startOfWeek(base, { weekStartsOn: 1 })
      end = endOfWeek(base, { weekStartsOn: 1 })
    } else {
      base = offset < 0 ? subMonths(now, -offset) : offset > 0 ? addMonths(now, offset) : now
      start = startOfMonth(base)
      end = endOfMonth(base)
    }

    return {
      rangeStart: start,
      rangeEnd: end,
      label: view === 'week'
        ? `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
        : format(start, 'MMMM yyyy'),
      days: eachDayOfInterval({ start, end }),
    }
  }, [view, offset])

  const fetchEvents = useCallback(async () => {
    const params = new URLSearchParams({
      from: rangeStart.toISOString(),
      to: rangeEnd.toISOString(),
    })
    const res = await fetch(`/api/calendar?${params}`)
    if (!res.ok) throw new Error('Failed to fetch')
    const data = await res.json()
    return data.events as CalendarEvent[]
  }, [rangeStart, rangeEnd])

  const { data: events, loading } = usePolling(fetchEvents, 120_000)

  const getEventsForDay = (day: Date) => {
    return (events || []).filter(e => isSameDay(new Date(e.start), day))
  }

  return (
    <div>
      <PageHeader
        title="Calendar"
        action={
          <div className="flex items-center bg-zinc-800 rounded-lg p-1">
            <button onClick={() => { setView('week'); setOffset(0) }} className={clsx('px-3 py-1.5 text-xs font-medium rounded-md transition-colors', view === 'week' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200')}>Week</button>
            <button onClick={() => { setView('month'); setOffset(0) }} className={clsx('px-3 py-1.5 text-xs font-medium rounded-md transition-colors', view === 'month' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200')}>Month</button>
          </div>
        }
      />

      {/* Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => setOffset(o => o - 1)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <span className="text-sm font-semibold text-zinc-200">{label}</span>
        <button onClick={() => setOffset(o => o + 1)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
          <ChevronRight size={20} />
        </button>
      </div>

      {loading ? (
        <div className="text-center text-zinc-500 py-12">Loading...</div>
      ) : view === 'week' ? (
        /* Week View */
        <div className="space-y-1">
          {days.map(day => {
            const dayEvents = getEventsForDay(day)
            const today = isToday(day)
            return (
              <div key={day.toISOString()} className={clsx('rounded-lg p-4', today ? 'bg-indigo-950/30 border border-indigo-500/20' : 'bg-zinc-900 border border-zinc-800')}>
                <div className="flex items-center gap-3 mb-2">
                  <span className={clsx('text-xs font-semibold uppercase', today ? 'text-indigo-400' : 'text-zinc-500')}>
                    {format(day, 'EEE')}
                  </span>
                  <span className={clsx('text-sm font-medium', today ? 'text-white' : 'text-zinc-300')}>
                    {format(day, 'MMM d')}
                  </span>
                  {today && <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-600 text-white">Today</span>}
                </div>
                {dayEvents.length === 0 ? (
                  <p className="text-xs text-zinc-600 pl-1">No events</p>
                ) : (
                  <div className="space-y-1.5">
                    {dayEvents.map(event => (
                      <div key={event.id} className="flex items-center gap-2 pl-1">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{
                            background: event.project_tag
                              ? PROJECT_COLORS[event.project_tag as ProjectTag]
                              : event.priority
                                ? PRIORITY_COLORS[event.priority as TaskPriority]
                                : '#6366f1'
                          }}
                        />
                        <span className="text-sm text-zinc-300 truncate">{event.title}</span>
                        {event.project_tag && (
                          <span className="text-xs text-zinc-500 flex-shrink-0">{event.project_tag}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        /* Month View Grid */
        <div>
          <div className="grid grid-cols-7 gap-px mb-1">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
              <div key={d} className="text-center text-xs font-semibold text-zinc-500 py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px">
            {/* Pad start of month */}
            {Array.from({ length: (days[0].getDay() + 6) % 7 }).map((_, i) => (
              <div key={`pad-${i}`} className="bg-zinc-900/30 rounded p-2 min-h-[80px]" />
            ))}
            {days.map(day => {
              const dayEvents = getEventsForDay(day)
              const today = isToday(day)
              return (
                <div key={day.toISOString()} className={clsx('rounded p-2 min-h-[80px]', today ? 'bg-indigo-950/30 border border-indigo-500/20' : 'bg-zinc-900 border border-zinc-800/50')}>
                  <span className={clsx('text-xs font-medium', today ? 'text-indigo-400' : 'text-zinc-500')}>
                    {format(day, 'd')}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 3).map(event => (
                      <div key={event.id} className="text-xs text-zinc-400 truncate flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: event.project_tag ? PROJECT_COLORS[event.project_tag as ProjectTag] : '#6366f1' }} />
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-xs text-zinc-600">+{dayEvents.length - 3} more</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
