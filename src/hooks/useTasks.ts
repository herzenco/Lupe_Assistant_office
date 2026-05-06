'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Task, TaskStatus } from '@/lib/types'

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks')
      if (!res.ok) throw new Error('Failed to fetch tasks')
      const data = await res.json()
      setTasks(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const initialFetch = setTimeout(fetchTasks, 0)
    return () => clearTimeout(initialFetch)
  }, [fetchTasks])

  const createTask = async (task: Partial<Task>) => {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    })
    if (!res.ok) throw new Error('Failed to create task')
    const newTask = await res.json()
    setTasks(prev => [newTask, ...prev])
    return newTask
  }

  const updateTask = async (id: string, updates: Partial<Task> & { add_note?: string; author?: string }) => {
    // Optimistic update for status changes
    if (updates.status) {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: updates.status as TaskStatus } : t))
    }

    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })

    if (!res.ok) {
      // Revert on failure
      await fetchTasks()
      throw new Error('Failed to update task')
    }

    const updated = await res.json()
    setTasks(prev => prev.map(t => t.id === id ? updated : t))
    return updated
  }

  const deleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      await fetchTasks()
      throw new Error('Failed to delete task')
    }
  }

  const moveTask = async (id: string, newStatus: TaskStatus) => {
    return updateTask(id, { status: newStatus })
  }

  return { tasks, loading, error, createTask, updateTask, deleteTask, moveTask, refresh: fetchTasks }
}
