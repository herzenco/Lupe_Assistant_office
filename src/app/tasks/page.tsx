'use client'

import { useState } from 'react'
import { useTasks } from '@/hooks/useTasks'
import { PageHeader } from '@/components/PageHeader'
import { TASK_STATUSES, TASK_STATUS_LABELS, PROJECT_TAGS, PROJECT_COLORS, PRIORITY_COLORS, TASK_PRIORITIES } from '@/lib/constants'
import type { TaskStatus, Task, ProjectTag, TaskPriority } from '@/lib/types'
import { Plus, X, Calendar, Clock, MessageSquare, Flag, Layers, Send } from 'lucide-react'
import { clsx } from 'clsx'
import { format, formatDistanceToNow } from 'date-fns'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'

export default function TasksPage() {
  const { tasks, loading, createTask, updateTask, moveTask, deleteTask } = useTasks()
  const [showAdd, setShowAdd] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [filterProject, setFilterProject] = useState<string>('')
  const [filterPriority, setFilterPriority] = useState<string>('')
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board')
  const [noteText, setNoteText] = useState('')

  // New task form
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newProject, setNewProject] = useState<string>('')
  const [newPriority, setNewPriority] = useState<TaskPriority>('normal')
  const [newDueDate, setNewDueDate] = useState('')

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
    if (selectedTask?.id === result.draggableId) {
      setSelectedTask({ ...selectedTask, status: newStatus })
    }
  }

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    await createTask({
      title: newTitle,
      description: newDesc,
      priority: newPriority,
      project_tag: (newProject || null) as ProjectTag | null,
      due_date: newDueDate || null,
    })
    setNewTitle('')
    setNewDesc('')
    setNewProject('')
    setNewPriority('normal')
    setNewDueDate('')
    setShowAdd(false)
  }

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    await moveTask(taskId, newStatus)
    if (selectedTask?.id === taskId) {
      setSelectedTask({ ...selectedTask, status: newStatus })
    }
  }

  const handleAddNote = async () => {
    if (!noteText.trim() || !selectedTask) return
    const updated = await updateTask(selectedTask.id, { add_note: noteText, author: 'herzen' })
    if (updated) setSelectedTask(updated)
    setNoteText('')
  }

  const openTask = (task: Task) => {
    // Refresh from tasks array to get latest
    const fresh = tasks.find(t => t.id === task.id) || task
    setSelectedTask(fresh)
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
            <textarea
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
              rows={3}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 mb-3 resize-none"
            />
            <div className="flex gap-3 mb-3">
              <select value={newProject} onChange={e => setNewProject(e.target.value)} className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300">
                <option value="">No Project</option>
                {PROJECT_TAGS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={newPriority} onChange={e => setNewPriority(e.target.value as TaskPriority)} className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 capitalize">
                {TASK_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <input
              type="date"
              value={newDueDate}
              onChange={e => setNewDueDate(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-indigo-500 mb-4"
            />
            <button type="submit" disabled={!newTitle.trim()} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors">
              Create Task
            </button>
          </form>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelectedTask(null)}>
          <div onClick={e => e.stopPropagation()} className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-start justify-between">
              <div className="flex-1 min-w-0 pr-4">
                <h3 className="text-lg font-semibold text-white">{selectedTask.title}</h3>
                {selectedTask.project_tag && (
                  <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded" style={{
                    background: `${PROJECT_COLORS[selectedTask.project_tag as ProjectTag]}20`,
                    color: PROJECT_COLORS[selectedTask.project_tag as ProjectTag]
                  }}>
                    {selectedTask.project_tag}
                  </span>
                )}
              </div>
              <button onClick={() => setSelectedTask(null)} className="text-zinc-500 hover:text-zinc-300 flex-shrink-0">
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Status</label>
                  <select
                    value={selectedTask.status}
                    onChange={e => handleStatusChange(selectedTask.id, e.target.value as TaskStatus)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200"
                  >
                    {TASK_STATUSES.map(s => <option key={s} value={s}>{TASK_STATUS_LABELS[s]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Priority</label>
                  <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
                    <Flag size={14} style={{ color: PRIORITY_COLORS[selectedTask.priority] }} />
                    <span className="text-sm text-zinc-200 capitalize">{selectedTask.priority}</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Complexity</label>
                  <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
                    <Layers size={14} className="text-zinc-400" />
                    <span className="text-sm text-zinc-200 capitalize">{selectedTask.complexity}</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Due Date</label>
                  <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
                    <Calendar size={14} className="text-zinc-400" />
                    <span className="text-sm text-zinc-200">
                      {selectedTask.due_date ? format(new Date(selectedTask.due_date), 'MMM d, yyyy') : 'None'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedTask.description && (
                <div>
                  <label className="text-xs text-zinc-500 block mb-2">Description</label>
                  <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3">
                    <p className="text-sm text-zinc-300 whitespace-pre-wrap">{selectedTask.description}</p>
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="flex items-center gap-4 text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  Created {formatDistanceToNow(new Date(selectedTask.created_at), { addSuffix: true })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  Updated {formatDistanceToNow(new Date(selectedTask.updated_at), { addSuffix: true })}
                </span>
              </div>

              {/* Notes thread */}
              <div>
                <label className="text-xs text-zinc-500 flex items-center gap-1.5 mb-3">
                  <MessageSquare size={12} />
                  Notes ({selectedTask.notes?.length || 0})
                </label>

                {selectedTask.notes && selectedTask.notes.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {selectedTask.notes.map((note, i) => (
                      <div key={i} className="flex gap-3">
                        <div className={clsx(
                          'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                          note.author === 'lupe' ? 'bg-indigo-600 text-white' : 'bg-zinc-700 text-zinc-300'
                        )}>
                          {note.author === 'lupe' ? 'L' : 'H'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-semibold text-zinc-300 capitalize">{note.author}</span>
                            <span className="text-xs text-zinc-600">
                              {formatDistanceToNow(new Date(note.timestamp), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-400 mt-0.5">{note.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add note */}
                <div className="flex gap-2">
                  <input
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                    placeholder="Add a note..."
                    className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={!noteText.trim()}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-colors"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>

              {/* Delete */}
              <div className="pt-3 border-t border-zinc-800">
                <button
                  onClick={() => { deleteTask(selectedTask.id); setSelectedTask(null) }}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Delete task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-zinc-500 py-12">Loading...</div>
      ) : viewMode === 'board' ? (
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
                            onClick={() => openTask(task)}
                            className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 mb-2 hover:border-zinc-700 transition-colors cursor-pointer"
                          >
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-zinc-200">{task.title}</p>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                  <span className="inline-block w-2 h-2 rounded-full" style={{ background: PRIORITY_COLORS[task.priority] }} />
                                  {task.project_tag && (
                                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${PROJECT_COLORS[task.project_tag as ProjectTag]}20`, color: PROJECT_COLORS[task.project_tag as ProjectTag] }}>
                                      {task.project_tag}
                                    </span>
                                  )}
                                  {task.due_date && (
                                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                                      <Calendar size={10} />
                                      {task.due_date}
                                    </span>
                                  )}
                                  {task.notes?.length > 0 && (
                                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                                      <MessageSquare size={10} />
                                      {task.notes.length}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
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
            <TaskListView tasks={filteredTasks} onOpen={openTask} />
          </div>
        </DragDropContext>
      ) : (
        <TaskListView tasks={filteredTasks} onOpen={openTask} />
      )}
    </div>
  )
}

function TaskListView({ tasks, onOpen }: { tasks: Task[]; onOpen: (task: Task) => void }) {
  return (
    <div className="space-y-2">
      {tasks.length === 0 ? (
        <div className="text-center text-zinc-500 py-12">No tasks. Create one to get started.</div>
      ) : (
        tasks.map(task => (
          <div
            key={task.id}
            onClick={() => onOpen(task)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center gap-3 cursor-pointer hover:border-zinc-700 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: PRIORITY_COLORS[task.priority] }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200">{task.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {task.project_tag && (
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${PROJECT_COLORS[task.project_tag as ProjectTag]}20`, color: PROJECT_COLORS[task.project_tag as ProjectTag] }}>
                        {task.project_tag}
                      </span>
                    )}
                    {task.due_date && (
                      <span className="text-xs text-zinc-500 flex items-center gap-1">
                        <Calendar size={10} />
                        {task.due_date}
                      </span>
                    )}
                    {task.notes?.length > 0 && (
                      <span className="text-xs text-zinc-500 flex items-center gap-1">
                        <MessageSquare size={10} />
                        {task.notes.length}
                      </span>
                    )}
                  </div>
                </div>
              </div>
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
