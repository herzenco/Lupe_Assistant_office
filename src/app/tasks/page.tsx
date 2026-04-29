'use client'

import { useState } from 'react'
import { useTasks } from '@/hooks/useTasks'
import { PageHeader } from '@/components/PageHeader'
import { TASK_STATUSES, TASK_STATUS_LABELS, PROJECT_TAGS, PROJECT_COLORS, PRIORITY_COLORS, TASK_PRIORITIES } from '@/lib/constants'
import type { TaskStatus, Task, ProjectTag, TaskPriority } from '@/lib/types'
import { Plus, X, GripVertical, Calendar, Tag } from 'lucide-react'
import { clsx } from 'clsx'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'

export default function TasksPage() {
  const { tasks, loading, createTask, moveTask, deleteTask } = useTasks()
  const [showAdd, setShowAdd] = useState(false)
  const [filterProject, setFilterProject] = useState<string>('')
  const [filterPriority, setFilterPriority] = useState<string>('')
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board')

  // New task form
  const [newTitle, setNewTitle] = useState('')
  const [newProject, setNewProject] = useState<string>('')
  const [newPriority, setNewPriority] = useState<TaskPriority>('normal')

  const filteredTasks = tasks.filter(t => {
    if (filterProject && t.project_tag !== filterProject) return false
    if (filterPriority && t.priority !== filterPriority) return false
    return true
  })

  const tasksByStatus = TASK_STATUSES.reduce((acc, status) => {
    acc[status] = filteredTasks.filter(t => t.status === status)
    return acc
  }, {} as Record<TaskStatus, Task[]>)

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return
    const newStatus = result.destination.droppableId as TaskStatus
    moveTask(result.draggableId, newStatus)
  }

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    await createTask({
      title: newTitle,
      priority: newPriority,
      project_tag: (newProject || null) as ProjectTag | null,
    })
    setNewTitle('')
    setNewProject('')
    setNewPriority('normal')
    setShowAdd(false)
  }

  return (
    <div>
      <PageHeader
        title="Task Board"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'board' ? 'list' : 'board')}
              className="px-3 py-1.5 text-xs font-medium text-zinc-400 bg-zinc-800 rounded-lg hover:text-zinc-200 transition-colors"
            >
              {viewMode === 'board' ? 'List' : 'Board'}
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
            >
              <Plus size={16} /> Add Task
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-300">
          <option value="">All Projects</option>
          {PROJECT_TAGS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-300">
          <option value="">All Priorities</option>
          {TASK_PRIORITIES.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
        </select>
      </div>

      {/* Add Task Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <form onClick={e => e.stopPropagation()} onSubmit={handleAddTask} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">New Task</h3>
              <button type="button" onClick={() => setShowAdd(false)} className="text-zinc-500 hover:text-zinc-300"><X size={20} /></button>
            </div>
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Task title"
              autoFocus
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 mb-3"
            />
            <div className="flex gap-3 mb-4">
              <select value={newProject} onChange={e => setNewProject(e.target.value)} className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300">
                <option value="">No Project</option>
                {PROJECT_TAGS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={newPriority} onChange={e => setNewPriority(e.target.value as TaskPriority)} className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 capitalize">
                {TASK_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <button type="submit" disabled={!newTitle.trim()} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors">
              Create Task
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center text-zinc-500 py-12">Loading...</div>
      ) : viewMode === 'board' ? (
        /* Kanban Board */
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="hidden md:grid grid-cols-5 gap-3">
            {TASK_STATUSES.map(status => (
              <Droppable key={status} droppableId={status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={clsx(
                      'rounded-xl p-3 min-h-[300px] transition-colors',
                      snapshot.isDraggingOver ? 'bg-zinc-800/80' : 'bg-zinc-900/50'
                    )}
                  >
                    <div className="flex items-center justify-between mb-3 px-1">
                      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{TASK_STATUS_LABELS[status]}</h3>
                      <span className="text-xs text-zinc-600">{tasksByStatus[status].length}</span>
                    </div>
                    {tasksByStatus[status].map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 mb-2 hover:border-zinc-700 transition-colors"
                          >
                            <TaskCard task={task} compact onDelete={() => deleteTask(task.id)} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            ))}
          </div>

          {/* Mobile list fallback */}
          <div className="md:hidden">
            <TaskListView tasks={filteredTasks} onDelete={deleteTask} />
          </div>
        </DragDropContext>
      ) : (
        <TaskListView tasks={filteredTasks} onDelete={deleteTask} />
      )}
    </div>
  )
}

function TaskCard({ task, compact, onDelete }: { task: Task; compact?: boolean; onDelete: () => void }) {
  return (
    <div>
      <div className="flex items-start gap-2">
        {!compact && <GripVertical size={14} className="text-zinc-600 mt-0.5 flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className={clsx('font-medium text-zinc-200', compact ? 'text-xs' : 'text-sm')}>{task.title}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: PRIORITY_COLORS[task.priority] }} />
            {task.project_tag && (
              <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${PROJECT_COLORS[task.project_tag]}20`, color: PROJECT_COLORS[task.project_tag] }}>
                {task.project_tag}
              </span>
            )}
            {task.due_date && (
              <span className="text-xs text-zinc-500 flex items-center gap-1">
                <Calendar size={10} />
                {task.due_date}
              </span>
            )}
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onDelete() }} className="text-zinc-600 hover:text-red-400 flex-shrink-0">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

function TaskListView({ tasks, onDelete }: { tasks: Task[]; onDelete: (id: string) => void }) {
  return (
    <div className="space-y-2">
      {tasks.length === 0 ? (
        <div className="text-center text-zinc-500 py-12">No tasks. Create one to get started.</div>
      ) : (
        tasks.map(task => (
          <div key={task.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center gap-3">
            <div className="flex-1">
              <TaskCard task={task} onDelete={() => onDelete(task.id)} />
            </div>
            <span className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-400 capitalize flex-shrink-0">
              {TASK_STATUS_LABELS[task.status]}
            </span>
          </div>
        ))
      )}
    </div>
  )
}
