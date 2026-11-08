import React, { useState } from 'react';
import { Task, Course, TaskStatus, TaskType } from '../types';
import { useNotification } from '../context/NotificationContext';
import { Plus, Calendar, AlertCircle, Trash2, X, GripVertical } from 'lucide-react';

interface TasksKanbanTabProps {
  tasks: Task[];
  courses: Course[];
  onAddTask: (t: Task) => void;
  onUpdateTask: (t: Task) => void;
  onDeleteTask: (id: string) => void;
}

export const TasksKanbanTab: React.FC<TasksKanbanTabProps> = ({
  tasks,
  courses,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
}) => {
  const { showToast, showConfirm } = useNotification();
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<TaskStatus | null>(null);

  // New task form state
  const [name, setName] = useState('');
  const [courseId, setCourseId] = useState(courses[0]?.id || '');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [type, setType] = useState<TaskType>('Trabalho');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  const filteredTasks = tasks.filter(
    (t) => selectedCourse === 'all' || t.courseId === selectedCourse
  );

  const columns: { id: TaskStatus; label: string; badgeColor: string }[] = [
    { id: 'todo', label: 'A Fazer', badgeColor: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400' },
    { id: 'in_progress', label: 'Em Andamento', badgeColor: 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400' },
    { id: 'done', label: 'Concluído', badgeColor: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' },
  ];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newTask: Task = {
      id: `task-${Date.now()}`,
      name: name.trim(),
      courseId: courseId || courses[0]?.id || '',
      status,
      type,
      dueDate: dueDate || new Date().toISOString().split('T')[0],
      notes: notes.trim(),
    };

    onAddTask(newTask);
    setIsModalOpen(false);
    setName('');
    setNotes('');
  };

  const getTypeBadge = (t: TaskType) => {
    switch (t) {
      case 'Prova':
        return 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400';
      case 'Trabalho':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400';
      case 'Exercício':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400';
      case 'Leitura':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400';
      default:
        return 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300';
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(id);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverColId(null);
  };

  const handleDragOver = (e: React.DragEvent, colId: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColId !== colId) {
      setDragOverColId(colId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, colId: TaskStatus) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      if (dragOverColId === colId) {
        setDragOverColId(null);
      }
    }
  };

  const handleDrop = (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverColId(null);
    setDraggedTaskId(null);

    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    const taskToMove = tasks.find((t) => t.id === taskId);
    if (taskToMove && taskToMove.status !== targetStatus) {
      onUpdateTask({
        ...taskToMove,
        status: targetStatus,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedCourse('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all shrink-0 ${
              selectedCourse === 'all'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-[#efeeea] dark:bg-[#2a2a2a] text-[#787774] dark:text-[#9b9a97] hover:text-[#37352f]'
            }`}
          >
            Todas ({tasks.length})
          </button>
          {courses.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCourse(c.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all shrink-0 flex items-center gap-1.5 ${
                selectedCourse === c.id
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-[#efeeea] dark:bg-[#2a2a2a] text-[#787774] dark:text-[#9b9a97] hover:text-[#37352f]'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
              <span>{c.code}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Tarefa</span>
        </button>
      </div>

      {/* Helpful Hint */}
      <div className="flex items-center gap-2 text-[11px] text-[#787774] dark:text-[#9b9a97] bg-white/60 dark:bg-[#202020]/60 px-3 py-1.5 rounded-lg border border-[#e9e9e8] dark:border-[#2f2f2f] w-fit">
        <GripVertical className="w-3.5 h-3.5 text-blue-500" />
        <span>Arraste e solte os cartões entre as colunas para mudar o status da tarefa.</span>
      </div>

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {columns.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.status === col.id);
          const isOver = dragOverColId === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={(e) => handleDragLeave(e, col.id)}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`flex flex-col rounded-xl p-3.5 border transition-all min-h-[440px] ${
                isOver
                  ? 'bg-blue-50/60 dark:bg-blue-950/20 border-blue-400 dark:border-blue-500 ring-2 ring-blue-400/20 shadow-md'
                  : 'bg-[#f7f6f3]/70 dark:bg-[#1e1e1e] border-[#e9e9e8] dark:border-[#2f2f2f]'
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 px-1 border-b border-[#e9e9e8] dark:border-[#2f2f2f] mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#37352f] dark:text-[#f3f3f2]">
                    {col.label}
                  </span>
                  <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${col.badgeColor}`}>
                    {colTasks.length}
                  </span>
                </div>
              </div>

              {/* Cards List */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {colTasks.map((task) => {
                  const course = courses.find((c) => c.id === task.courseId);
                  const isLate = task.status !== 'done' && new Date(task.dueDate) < new Date(new Date().setHours(0,0,0,0));
                  const isDragging = draggedTaskId === task.id;

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      className={`group bg-white dark:bg-[#252525] p-3.5 rounded-xl border border-[#e9e9e8] dark:border-[#333333] hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-md transition-all space-y-2 relative select-none cursor-grab active:cursor-grabbing ${
                        isDragging ? 'opacity-40 scale-[0.98] ring-2 ring-blue-500 shadow-none' : ''
                      }`}
                    >
                      {/* Card Header with Badges & Drag Icon */}
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${getTypeBadge(task.type)}`}>
                            {task.type}
                          </span>
                          {course && (
                            <span
                              className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: `${course.color}18`, color: course.color }}
                            >
                              {course.code}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-stone-400 group-hover:text-stone-600 dark:text-stone-500 dark:group-hover:text-stone-300 transition-colors">
                          <GripVertical className="w-3.5 h-3.5" />
                        </div>
                      </div>

                      {/* Card Title */}
                      <h4 className="text-xs md:text-sm font-medium text-[#37352f] dark:text-[#f3f3f2] leading-snug">
                        {task.name}
                      </h4>

                      {/* Card Notes */}
                      {task.notes && (
                        <p className="text-[11px] text-[#787774] dark:text-[#9b9a97] line-clamp-2 leading-relaxed">
                          {task.notes}
                        </p>
                      )}

                      {/* Card Footer */}
                      <div className="flex items-center justify-between pt-1 text-[11px] text-[#787774] dark:text-[#9b9a97]">
                        <div className={`flex items-center gap-1 ${isLate ? 'text-red-500 font-semibold' : ''}`}>
                          <Calendar className="w-3 h-3" />
                          <span>{task.dueDate}</span>
                          {isLate && <AlertCircle className="w-3 h-3" />}
                        </div>

                        {/* Status switcher fallback buttons + Delete */}
                        <div className="flex items-center gap-1">
                          {col.id !== 'todo' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateTask({
                                  ...task,
                                  status: col.id === 'done' ? 'in_progress' : 'todo',
                                });
                              }}
                              className="px-1.5 py-0.5 text-[10px] bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded transition-colors"
                              title="Recuar status"
                            >
                              ←
                            </button>
                          )}
                          {col.id !== 'done' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateTask({
                                  ...task,
                                  status: col.id === 'todo' ? 'in_progress' : 'done',
                                });
                              }}
                              className="px-1.5 py-0.5 text-[10px] bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded transition-colors"
                              title="Avançar status"
                            >
                              →
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              showConfirm({
                                title: 'Excluir Tarefa',
                                message: `Tem certeza que deseja excluir a atividade "${task.name}"?`,
                                confirmText: 'Excluir',
                                danger: true,
                                onConfirm: () => {
                                  onDeleteTask(task.id);
                                  showToast('info', 'Tarefa Excluída', `"${task.name}" foi removida.`);
                                },
                              });
                            }}
                            className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors"
                            title="Excluir tarefa"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Drop Target Helper when Dragging Over */}
                {isOver && (
                  <div className="h-16 border-2 border-dashed border-blue-400 dark:border-blue-500 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 flex items-center justify-center text-xs text-blue-600 dark:text-blue-400 font-medium animate-pulse">
                    Solte aqui para mover para {col.label}
                  </div>
                )}

                {colTasks.length === 0 && !isOver && (
                  <div className="h-32 flex flex-col items-center justify-center text-xs text-[#787774] dark:text-[#666] border border-dashed border-[#e9e9e8] dark:border-[#333] rounded-xl p-4 text-center">
                    <span>Nenhuma tarefa aqui</span>
                    <span className="text-[10px] text-stone-400 mt-1">Arraste um cartão para cá</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Add Task */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#202020] rounded-xl border border-[#e9e9e8] dark:border-[#2f2f2f] w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Nova Tarefa / Entrega</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs md:text-sm">
              <div>
                <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Nome da Tarefa *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Entregar Relatório do Trabalho 1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Disciplina</label>
                  <select
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id} className="dark:bg-[#202020]">
                        {c.code} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Tipo</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as TaskType)}
                    className="w-full px-3 py-2 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500"
                  >
                    <option value="Trabalho" className="dark:bg-[#202020]">Trabalho</option>
                    <option value="Prova" className="dark:bg-[#202020]">Prova</option>
                    <option value="Exercício" className="dark:bg-[#202020]">Exercício</option>
                    <option value="Leitura" className="dark:bg-[#202020]">Leitura</option>
                    <option value="Outro" className="dark:bg-[#202020]">Outro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Status Inicial</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                    className="w-full px-3 py-2 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500"
                  >
                    <option value="todo" className="dark:bg-[#202020]">A Fazer</option>
                    <option value="in_progress" className="dark:bg-[#202020]">Em Andamento</option>
                    <option value="done" className="dark:bg-[#202020]">Concluído</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Data de Entrega</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Anotações / Descrição</label>
                <textarea
                  rows={3}
                  placeholder="Detalhes, links ou instruções da entrega..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow"
                >
                  Salvar Tarefa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
