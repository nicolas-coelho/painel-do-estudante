import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Calendar as CalendarIcon,
  CheckCircle2,
  Circle,
  Eye,
  EyeOff,
  Filter,
  GripVertical,
  HelpCircle,
  LayoutGrid,
  Pencil,
  Plus,
} from 'lucide-react';
import { Course, EisenhowerQuadrant, PriorityLevel, Task, TaskType } from '../types';
import { useNotification } from '../context/NotificationContext';
import { formatDateBR, parseDateToISO } from '../dateUtils';
import {
  QUADRANT_LIST,
  applyTaskPriority,
  getQuadrantAxes,
  getQuadrantConfig,
  getTaskQuadrant,
} from '../priorityUtils';

interface PriorityMatrixProps {
  tasks: Task[];
  courses: Course[];
  onUpdateTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onCreateTaskInQuadrant: (urgency: PriorityLevel, importance: PriorityLevel) => void;
}

const MATRIX_DRAG_MIME = 'application/x-eisenhower-task';

const getLocalDateStr = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTaskTimestamp = (dueDate?: string | null): number => {
  if (!dueDate || !dueDate.trim()) return Infinity;
  const iso = parseDateToISO(dueDate);
  const time = new Date(iso || dueDate).getTime();
  return isNaN(time) ? Infinity : time;
};

const getTypeBadge = (t: TaskType) => {
  switch (t) {
    case 'Prova':
      return 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/50';
    case 'Trabalho':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-200 dark:border-purple-900/50';
    case 'Exercício':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50';
    case 'Leitura':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50';
    default:
      return 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 border border-stone-200 dark:border-stone-700';
  }
};

export const PriorityMatrix: React.FC<PriorityMatrixProps> = ({
  tasks,
  courses,
  onUpdateTask,
  onEditTask,
  onCreateTaskInQuadrant,
}) => {
  const { showToast } = useNotification();
  const todayStr = getLocalDateStr();

  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [showCompleted, setShowCompleted] = useState<boolean>(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverQuadrant, setDragOverQuadrant] = useState<EisenhowerQuadrant | null>(null);

  const visibleCourses = courses.filter(
    (c) => c.inProgress !== false || tasks.some((t) => t.courseId === c.id)
  );

  useEffect(() => {
    if (selectedCourseFilter !== 'all' && !visibleCourses.some((c) => c.id === selectedCourseFilter)) {
      setSelectedCourseFilter('all');
    }
  }, [selectedCourseFilter, visibleCourses]);

  const courseFilteredTasks = tasks.filter(
    (t) => selectedCourseFilter === 'all' || t.courseId === selectedCourseFilter
  );

  const completedCount = courseFilteredTasks.filter((t) => t.status === 'done').length;

  const displayedTasks = showCompleted
    ? courseFilteredTasks
    : courseFilteredTasks.filter((t) => t.status !== 'done');

  const sortTasks = (list: Task[]) =>
    [...list].sort((a, b) => {
      const doneA = a.status === 'done' ? 1 : 0;
      const doneB = b.status === 'done' ? 1 : 0;
      if (doneA !== doneB) return doneA - doneB;

      const timeA = getTaskTimestamp(a.dueDate);
      const timeB = getTaskTimestamp(b.dueDate);
      if (timeA !== timeB) return timeA - timeB;

      return a.name.localeCompare(b.name, 'pt-BR');
    });

  const unclassifiedTasks = sortTasks(
    displayedTasks.filter((t) => getTaskQuadrant(t) === null)
  );

  const handleAssignQuadrant = (task: Task, quadrant: EisenhowerQuadrant | '') => {
    if (!quadrant) {
      const updated = applyTaskPriority(task, '', '');
      onUpdateTask(updated);
      showToast('info', 'Classificação removida', `"${task.name}" voltou para atividades sem classificação.`);
      return;
    }

    const { urgency, importance } = getQuadrantAxes(quadrant);
    const cfg = getQuadrantConfig(quadrant);
    const updated = applyTaskPriority(task, urgency, importance);
    onUpdateTask(updated);
    showToast(
      'success',
      'Prioridade atualizada',
      `"${task.name}" movida para ${cfg.shortLabel}.`
    );
  };

  // Drag-and-drop HTML5 isolado via MIME exclusivo
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData(MATRIX_DRAG_MIME, taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(taskId);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverQuadrant(null);
  };

  const handleDragOver = (e: React.DragEvent, quadrant: EisenhowerQuadrant) => {
    if (!e.dataTransfer.types.includes(MATRIX_DRAG_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverQuadrant !== quadrant) {
      setDragOverQuadrant(quadrant);
    }
  };

  const handleDragLeave = (e: React.DragEvent, quadrant: EisenhowerQuadrant) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      if (dragOverQuadrant === quadrant) {
        setDragOverQuadrant(null);
      }
    }
  };

  const handleDrop = (e: React.DragEvent, targetQuadrant: EisenhowerQuadrant) => {
    const taskId = e.dataTransfer.getData(MATRIX_DRAG_MIME);
    setDragOverQuadrant(null);
    setDraggedTaskId(null);
    if (!taskId) return;

    e.preventDefault();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    if (getTaskQuadrant(task) !== targetQuadrant) {
      handleAssignQuadrant(task, targetQuadrant);
    }
  };

  const renderDueDateInfo = (task: Task) => {
    if (!task.dueDate) return null;
    const iso = parseDateToISO(task.dueDate);
    const isIsoDate = /^\d{4}-\d{2}-\d{2}$/.test(iso);
    const isLate =
      task.status !== 'done' &&
      Boolean(iso) &&
      (isIsoDate ? iso < todayStr : new Date(iso) < new Date(new Date().setHours(0, 0, 0, 0)));
    const isDueToday = iso ? iso === todayStr : task.dueDate === todayStr;

    return (
      <span
        className={`inline-flex items-center gap-1 text-[10px] ${
          isLate
            ? 'text-red-600 dark:text-red-400 font-semibold'
            : isDueToday
            ? 'text-amber-600 dark:text-amber-400 font-semibold'
            : 'text-[#787774] dark:text-[#9b9a97]'
        }`}
      >
        <CalendarIcon className="w-2.5 h-2.5" />
        <span>{formatDateBR(task.dueDate)}</span>
        {isLate && <AlertCircle className="w-2.5 h-2.5" />}
      </span>
    );
  };

  return (
    <section className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <LayoutGrid className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-bold text-[#37352f] dark:text-[#f3f3f2] tracking-tight">
              Matriz de Priorização
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900/50">
              Eisenhower
            </span>
          </div>
          <p className="text-xs text-[#787774] dark:text-[#9b9a97] mt-0.5">
            Classifique suas atividades por Urgência e Importância para priorizar o que fazer primeiro.
          </p>
        </div>

        {/* Controles à direita */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#202020] border border-[#e9e9e8] dark:border-[#2f2f2f] rounded-lg px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-[#787774] dark:text-[#9b9a97] shrink-0" />
            <select
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
              aria-label="Filtrar matriz por disciplina"
              className="bg-transparent text-xs font-medium text-[#37352f] dark:text-[#f3f3f2] focus:outline-none cursor-pointer"
            >
              <option value="all" className="dark:bg-[#202020]">
                Todas as disciplinas ({tasks.length})
              </option>
              {visibleCourses.map((c) => {
                const count = tasks.filter((t) => t.courseId === c.id).length;
                return (
                  <option key={c.id} value={c.id} className="dark:bg-[#202020]">
                    {c.code} - {c.name} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowCompleted((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              showCompleted
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white dark:bg-[#202020] border-[#e9e9e8] dark:border-[#2f2f2f] text-[#787774] dark:text-[#9b9a97] hover:text-[#37352f] dark:hover:text-white'
            }`}
          >
            {showCompleted ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>
              Mostrar concluídas{completedCount > 0 ? ` (${completedCount})` : ''}
            </span>
          </button>
        </div>
      </div>

      {/* Cabeçalhos do Eixo X (visível em md+) */}
      <div className="hidden md:grid grid-cols-2 gap-4 px-1">
        <div className="text-center text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
          Urgente
        </div>
        <div className="text-center text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          Não Urgente
        </div>
      </div>

      {/* Grade 2x2 dos Quadrantes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {QUADRANT_LIST.map((cfg) => {
          const quadrantTasks = sortTasks(
            displayedTasks.filter((t) => getTaskQuadrant(t) === cfg.id)
          );
          const isOver = dragOverQuadrant === cfg.id;

          return (
            <div
              key={cfg.id}
              onDragOver={(e) => handleDragOver(e, cfg.id)}
              onDragLeave={(e) => handleDragLeave(e, cfg.id)}
              onDrop={(e) => handleDrop(e, cfg.id)}
              className={`rounded-2xl p-4 border transition-all flex flex-col min-h-[240px] ${
                isOver ? cfg.dragOverClass : cfg.containerClass
              }`}
            >
              {/* Header do quadrante */}
              <div className="flex items-start justify-between gap-2 pb-3 mb-3 border-b border-black/5 dark:border-white/10">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.badgeClass}`}>
                      {cfg.code}
                    </span>
                    <h3 className={`text-sm font-bold ${cfg.accentClass}`}>
                      {cfg.title}
                    </h3>
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-white/80 dark:bg-[#252525] text-[#37352f] dark:text-[#d4d4d4] border border-black/5 dark:border-white/10">
                      {quadrantTasks.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-[#787774] dark:text-[#9b9a97]">
                    <span className="font-semibold">{cfg.subtitle}</span>
                    <span className="opacity-50">•</span>
                    <span>{cfg.description}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onCreateTaskInQuadrant(cfg.urgency, cfg.importance)}
                  className="p-1.5 rounded-lg bg-white/80 dark:bg-[#252525] border border-black/5 dark:border-white/10 text-[#787774] hover:text-[#37352f] dark:hover:text-white hover:shadow-xs transition-all shrink-0"
                  title={`Nova atividade em ${cfg.shortLabel}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Lista de atividades no quadrante */}
              <div className="space-y-2 flex-1 overflow-y-auto max-h-[300px] pr-0.5">
                {quadrantTasks.map((task) => {
                  const course = courses.find((c) => c.id === task.courseId);
                  const isDone = task.status === 'done';
                  const isDragging = draggedTaskId === task.id;

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onEditTask(task)}
                      title="Clique para editar ou arraste para outro quadrante"
                      className={`group bg-white dark:bg-[#252525] p-2.5 rounded-xl border border-[#e9e9e8] dark:border-[#333] hover:border-blue-400 dark:hover:border-blue-500/60 hover:shadow-sm transition-all cursor-pointer select-none ${
                        isDone ? 'opacity-70' : ''
                      } ${isDragging ? 'opacity-40 scale-[0.98] ring-2 ring-blue-500' : ''}`}
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="w-3.5 h-3.5 text-stone-300 dark:text-stone-600 group-hover:text-stone-500 mt-0.5 shrink-0 cursor-grab active:cursor-grabbing" />

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateTask({
                              ...task,
                              status: isDone ? 'todo' : 'done',
                            });
                          }}
                          className="mt-0.5 text-[#787774] dark:text-[#9b9a97] hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors shrink-0"
                          title={isDone ? 'Reabrir atividade' : 'Marcar como concluída'}
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Circle className="w-4 h-4" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <h4
                              className={`text-xs font-semibold text-[#37352f] dark:text-[#f3f3f2] leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors ${
                                isDone ? 'line-through text-[#787774] dark:text-[#9b9a97]' : ''
                              }`}
                            >
                              {task.name}
                            </h4>
                          </div>

                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {course && (
                                <span
                                  className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                                  style={{ backgroundColor: `${course.color}18`, color: course.color }}
                                >
                                  {course.code}
                                </span>
                              )}
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${getTypeBadge(task.type)}`}>
                                {task.type}
                              </span>
                              {task.status === 'in_progress' && (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                                  Em Andamento
                                </span>
                              )}
                              {renderDueDateInfo(task)}
                            </div>

                            {/* Seletor rápido + Editar */}
                            <div
                              className="flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <select
                                value={cfg.id}
                                onChange={(e) =>
                                  handleAssignQuadrant(
                                    task,
                                    e.target.value as EisenhowerQuadrant | ''
                                  )
                                }
                                aria-label={`Mover prioridade de ${task.name}`}
                                className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-[#37352f] dark:text-[#d4d4d4] border border-[#e9e9e8] dark:border-[#333] focus:outline-none focus:border-blue-500 cursor-pointer"
                              >
                                <option value="do_now" className="dark:bg-[#202020]">Q1</option>
                                <option value="schedule" className="dark:bg-[#202020]">Q2</option>
                                <option value="delegate" className="dark:bg-[#202020]">Q3</option>
                                <option value="eliminate" className="dark:bg-[#202020]">Q4</option>
                                <option value="" className="dark:bg-[#202020]">Sem classif.</option>
                              </select>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditTask(task);
                                }}
                                className="p-1 text-stone-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded transition-colors"
                                title="Editar atividade"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {quadrantTasks.length === 0 && (
                  <div className="h-32 flex flex-col items-center justify-center text-center px-3 border border-dashed border-black/10 dark:border-white/10 rounded-xl bg-white/40 dark:bg-[#191919]/30">
                    <span className="text-xs font-medium text-[#787774] dark:text-[#9b9a97]">
                      Nenhuma atividade neste quadrante
                    </span>
                    <span className="text-[11px] text-[#9b9a97] dark:text-[#787774] mt-0.5">
                      Arraste uma atividade para cá ou clique em +
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Área de atividades sem classificação */}
      {unclassifiedTasks.length > 0 && (
        <div className="rounded-2xl border border-dashed border-[#d8d7d3] dark:border-[#383838] bg-[#faf9f6]/80 dark:bg-[#1d1d1d]/80 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#787774] dark:text-[#9b9a97] shrink-0" />
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#37352f] dark:text-[#f3f3f2]">
                  Atividades sem classificação ({unclassifiedTasks.length})
                </h3>
                <p className="text-[11px] text-[#787774] dark:text-[#9b9a97]">
                  Arraste para um dos quadrantes acima ou escolha uma prioridade com 1 clique:
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {unclassifiedTasks.map((task) => {
              const course = courses.find((c) => c.id === task.courseId);
              const isDone = task.status === 'done';
              const isDragging = draggedTaskId === task.id;
              const partialHint =
                task.urgency === 'high'
                  ? 'Urgente · falta Importância'
                  : task.urgency === 'low'
                  ? 'Não Urgente · falta Importância'
                  : task.importance === 'high'
                  ? 'Importante · falta Urgência'
                  : task.importance === 'low'
                  ? 'Não Importante · falta Urgência'
                  : null;

              return (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  onDragEnd={handleDragEnd}
                  className={`group bg-white dark:bg-[#252525] p-3 rounded-xl border border-[#e9e9e8] dark:border-[#333] hover:border-blue-400 dark:hover:border-blue-500/60 shadow-xs transition-all space-y-2 select-none ${
                    isDone ? 'opacity-70' : ''
                  } ${isDragging ? 'opacity-40 scale-[0.98] ring-2 ring-blue-500' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    <GripVertical className="w-3.5 h-3.5 text-stone-300 dark:text-stone-600 group-hover:text-stone-500 mt-0.5 shrink-0 cursor-grab active:cursor-grabbing" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <button
                        type="button"
                        onClick={() => onEditTask(task)}
                        className={`text-left text-xs font-semibold text-[#37352f] dark:text-[#f3f3f2] hover:text-blue-600 dark:hover:text-blue-400 transition-colors leading-snug ${
                          isDone ? 'line-through text-[#787774] dark:text-[#9b9a97]' : ''
                        }`}
                      >
                        {task.name}
                      </button>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {course && (
                          <span
                            className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: `${course.color}18`, color: course.color }}
                          >
                            {course.code}
                          </span>
                        )}
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${getTypeBadge(task.type)}`}>
                          {task.type}
                        </span>
                        {renderDueDateInfo(task)}
                      </div>

                      {partialHint && (
                        <div className="text-[10px] font-medium text-amber-700 dark:text-amber-400">
                          {partialHint}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onEditTask(task)}
                      className="p-1 text-stone-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded transition-colors shrink-0"
                      title="Editar atividade"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Botões de classificação em 1 clique */}
                  <div className="grid grid-cols-4 gap-1 pt-1 border-t border-[#f0f0ee] dark:border-[#303030]">
                    {QUADRANT_LIST.map((cfg) => (
                      <button
                        key={cfg.id}
                        type="button"
                        onClick={() => handleAssignQuadrant(task, cfg.id)}
                        className={`px-1.5 py-1 rounded-md text-[10px] font-semibold border transition-colors truncate ${cfg.quickButtonClass}`}
                        title={`${cfg.shortLabel} (${cfg.subtitle})`}
                      >
                        {cfg.quickActionLabel}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
