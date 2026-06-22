import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateTimerStats, summarizeToday } from '../src/lib/timerStats.ts'

function localIso(year: number, month: number, day: number, hour: number, minute = 0) {
  return new Date(year, month - 1, day, hour, minute, 0).toISOString()
}

test('calculateTimerStats counts only overlapping seconds in each period', () => {
  const asOf = new Date(2026, 5, 1, 1, 0, 0)
  const stats = calculateTimerStats([
    {
      project: 'Xyren',
      started_at: localIso(2025, 12, 31, 23, 30),
      stopped_at: localIso(2026, 1, 1, 0, 30),
      duration_seconds: 3600,
    },
    {
      project: 'Xyren',
      started_at: localIso(2026, 5, 31, 23, 30),
      stopped_at: localIso(2026, 6, 1, 0, 30),
      duration_seconds: 3600,
    },
    {
      project: 'Xyren',
      started_at: localIso(2026, 6, 1, 0, 45),
      stopped_at: null,
      duration_seconds: null,
    },
  ], asOf)

  assert.equal(stats.projects[0].year, 6300)
  assert.equal(stats.projects[0].month, 2700)
  assert.equal(stats.projects[0].week, 4500)
  assert.equal(stats.projects[0].today, 2700)
  assert.deepEqual(stats.totals, { today: 2700, week: 4500, month: 2700, year: 6300 })
})

test('summarizeToday includes the today overlap for sessions that started yesterday', () => {
  const asOf = new Date(2026, 5, 1, 1, 0, 0)
  const summary = summarizeToday([
    {
      project: 'Herzen Co.',
      started_at: localIso(2026, 5, 31, 23, 30),
      stopped_at: localIso(2026, 6, 1, 0, 30),
      duration_seconds: 3600,
    },
  ], asOf)

  assert.deepEqual(summary, [{ project: 'Herzen Co.', totalToday: 1800 }])
})
