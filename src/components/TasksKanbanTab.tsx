import React, { useState } from 'react';
import { Task, Course, TaskStatus, TaskType } from '../types';
import { Plus, Calendar, CheckSquare, Clock, AlertCircle, Trash2, X } from 'lucide-react';

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
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const columns: { id: TaskStatus; label: string; color: string }[] = [
    { id: 'todo', label: 'A Fazer', color: 'border-amber-500/30' },
    { id: 'in_progress', label: 'Em Andamento', color: 'border-blue-500/30' },
    { id: 'done', label: 'Concluído', color: 'border-emerald-500/30' },
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

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {columns.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.status === col.id);
          return (
            <div
              key={col.id}
              className={`flex flex-col bg-[#f7f6f3]/60 dark:bg-[#1e1e1e] rounded-xl p-3 border border-[#e9e9e8] dark:border-[#2f2f2f] min-h-[400px]`}
            >
              <div className="flex items-center justify-between pb-3 px-1 border-b border-[#e9e9e8] dark:border-[#2f2f2f] mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#787774] dark:text-[#9b9a97]">
                  {col.label}
                </span>
                <span className="text-xs font-mono font-bold bg-[#e9e9e8] dark:bg-[#2d2d2d] px-2 py-0.5 rounded-full">
                  {colTasks.length}
                </span>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto">
                {colTasks.map((task) => {
                  const course = courses.find((c) => c.id === task.courseId);
                  const isLate = task.status !== 'done' && new Date(task.dueDate) < new Date(new Date().setHours(0,0,0,0));

                  return (
                    <div
                      key={task.id}
                      className="group bg-white dark:bg-[#252525] p-3.5 rounded-lg border border-[#e9e9e8] dark:border-[#333333] hover:shadow-md transition-all space-y-2 relative"
                    >
                      <div className="flex items-center justify-between gap-1">
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

                      <h4 className="text-xs md:text-sm font-medium text-[#37352f] dark:text-[#f3f3f2]">
                        {task.name}
                      </h4>

                      {task.notes && (
                        <p className="text-[11px] text-[#787774] dark:text-[#9b9a97] line-clamp-2">
                          {task.notes}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-1 text-[11px] text-[#787774] dark:text-[#9b9a97]">
                        <div className={`flex items-center gap-1 ${isLate ? 'text-red-500 font-semibold' : ''}`}>
                          <Calendar className="w-3 h-3" />
                          <span>{task.dueDate}</span>
                          {isLate && <AlertCircle className="w-3 h-3" />}
                        </div>

                        {/* Status switcher */}
                        <div className="flex items-center gap-1">
                          {col.id !== 'todo' && (
                            <button
                              onClick={() =>
                                onUpdateTask({
                                  ...task,
                                  status: col.id === 'done' ? 'in_progress' : 'todo',
                                })
                              }
                              className="px-1.5 py-0.5 text-[10px] bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 rounded"
                              title="Recuar status"
                            >
                              ←
                            </button>
                          )}
                          {col.id !== 'done' && (
                            <button
                              onClick={() =>
                                onUpdateTask({
                                  ...task,
                                  status: col.id === 'todo' ? 'in_progress' : 'done',
                                })
                              }
                              className="px-1.5 py-0.5 text-[10px] bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 rounded"
                              title="Avançar status"
                            >
                              →
                            </button>
                          )}
                          <button
                            onClick={() => onDeleteTask(task.id)}
                            className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded"
                            title="Excluir"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {colTasks.length === 0 && (
                  <div className="h-28 flex items-center justify-center text-xs text-[#787774] dark:text-[#666] border border-dashed border-[#e9e9e8] dark:border-[#333] rounded-lg">
                    Nenhuma tarefa aqui
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
