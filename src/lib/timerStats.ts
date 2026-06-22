export interface TimerSessionLike {
  project: string
  started_at: string
  stopped_at: string | null
  duration_seconds?: number | null
}

export interface TimerStatsProject {
  project: string
  today: number
  week: number
  month: number
  year: number
}

export interface TimerStatsResult {
  asOf: string
  projects: TimerStatsProject[]
  totals: { today: number; week: number; month: number; year: number }
}

function periodStarts(asOf: Date) {
  const todayStart = new Date(asOf)
  todayStart.setHours(0, 0, 0, 0)

  const weekStart = new Date(asOf)
  weekStart.setDate(asOf.getDate() - asOf.getDay())
  weekStart.setHours(0, 0, 0, 0)

  return {
    todayStart,
    weekStart,
    monthStart: new Date(asOf.getFullYear(), asOf.getMonth(), 1),
    yearStart: new Date(asOf.getFullYear(), 0, 1),
  }
}

function overlapSeconds(session: TimerSessionLike, start: Date, end: Date): number {
  const sessionStart = new Date(session.started_at)
  const sessionEnd = session.stopped_at ? new Date(session.stopped_at) : end
  const overlapStart = Math.max(sessionStart.getTime(), start.getTime())
  const overlapEnd = Math.min(sessionEnd.getTime(), end.getTime())

  return Math.max(0, Math.round((overlapEnd - overlapStart) / 1000))
}

export function calculateTimerStats(sessions: TimerSessionLike[], asOf = new Date()): TimerStatsResult {
  const { todayStart, weekStart, monthStart, yearStart } = periodStarts(asOf)
  const projectStats: Record<string, Omit<TimerStatsProject, 'project'>> = {}

  for (const session of sessions) {
    const year = overlapSeconds(session, yearStart, asOf)
    if (year === 0) continue

    if (!projectStats[session.project]) {
      projectStats[session.project] = { today: 0, week: 0, month: 0, year: 0 }
    }

    const stats = projectStats[session.project]
    stats.year += year
    stats.month += overlapSeconds(session, monthStart, asOf)
    stats.week += overlapSeconds(session, weekStart, asOf)
    stats.today += overlapSeconds(session, todayStart, asOf)
  }

  const totals = { today: 0, week: 0, month: 0, year: 0 }
  const projects = Object.entries(projectStats).map(([project, times]) => {
    totals.today += times.today
    totals.week += times.week
    totals.month += times.month
    totals.year += times.year
    return { project, ...times }
  })

  return {
    asOf: asOf.toISOString(),
    projects,
    totals,
  }
}

export function summarizeToday(sessions: TimerSessionLike[], asOf = new Date()) {
  const { todayStart } = periodStarts(asOf)
  const byProject: Record<string, number> = {}

  for (const session of sessions) {
    const totalToday = overlapSeconds(session, todayStart, asOf)
    if (totalToday === 0) continue
    byProject[session.project] = (byProject[session.project] || 0) + totalToday
  }

  return Object.entries(byProject).map(([project, totalToday]) => ({
    project,
    totalToday,
  }))
}
