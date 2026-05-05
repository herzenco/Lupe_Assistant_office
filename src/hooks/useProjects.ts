'use client'

import { useState, useEffect, useCallback } from 'react'

export interface Project {
  id: string
  name: string
  slug: string
  description: string | null
  file_count: number | null
  file_count_updated_at: string | null
  created_at: string
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProjects = useCallback(async () => {
    const res = await fetch('/api/projects')
    if (res.ok) {
      setProjects(await res.json())
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const createProject = async (name: string, slug: string, description?: string) => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug, description }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error)
    }
    const project = await res.json()
    setProjects(prev => [...prev, project].sort((a, b) => a.name.localeCompare(b.name)))
    return project
  }

  // Helper: get color for a project (uses slug-based hash for dynamic projects)
  const getProjectColor = (projectName: string): string => {
    const KNOWN_COLORS: Record<string, string> = {
      'Xelerate': '#6366f1',
      'Xyren': '#f59e0b',
      'ProntoBooks': '#10b981',
      'Herzen Co.': '#3b82f6',
      'Skydeo': '#8b5cf6',
      'Family Office': '#ec4899',
      'Xcaret': '#14b8a6',
      'Brain': '#ef4444',
    }
    if (KNOWN_COLORS[projectName]) return KNOWN_COLORS[projectName]
    // Generate a stable color from project name
    let hash = 0
    for (let i = 0; i < projectName.length; i++) {
      hash = projectName.charCodeAt(i) + ((hash << 5) - hash)
    }
    const hue = Math.abs(hash) % 360
    return `hsl(${hue}, 60%, 55%)`
  }

  const updateProject = async (slug: string, patch: { name?: string; description?: string; file_count?: number }) => {
    const res = await fetch(`/api/projects/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error)
    }
    const updated = await res.json()
    setProjects(prev => prev.map(p => p.slug === slug ? updated : p))
    return updated
  }

  const deleteProject = async (slug: string) => {
    const res = await fetch(`/api/projects/${slug}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error)
    }
    setProjects(prev => prev.filter(p => p.slug !== slug))
  }

  return { projects, loading, createProject, updateProject, deleteProject, getProjectColor, refetch: fetchProjects }
}
