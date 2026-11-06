import React, { useState } from 'react';
import { Course, Task, TaskStatus, TaskType } from '../types';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Plus,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Trash2,
  ExternalLink,
  Sparkles,
  CalendarDays,
  X,
  Filter,
} from 'lucide-react';

interface HomeTabProps {
  courses: Course[];
  tasks: Task[];
  darkMode: boolean;
  onAddTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onNavigateTab?: (tab: string) => void;
}

const LOCAL_STORAGE_CALENDAR_ID = 'painel_google_calendar_id';

const getLocalDateStr = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const HomeTab: React.FC<HomeTabProps> = ({
  courses,
  tasks,
  darkMode,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onNavigateTab,
}) => {
  const todayStr = getLocalDateStr();

  // Task creation modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [taskCourseId, setTaskCourseId] = useState(courses[0]?.id || '');
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('todo');
  const [taskType, setTaskType] = useState<TaskType>('Trabalho');
  const [taskDueDate, setTaskDueDate] = useState(todayStr);
  const [taskNotes, setTaskNotes] = useState('');

  // Course filter for the task board
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');

  // Calendar mode & navigation state
  const [calendarViewMode, setCalendarViewMode] = useState<'interactive' | 'google'>('interactive');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(todayStr);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState<Date>(new Date());

  // Google Calendar config
  const [calendarId] = useState<string>(() => {
    return localStorage.getItem(LOCAL_STORAGE_CALENDAR_ID) || '';
  });
  const cleanCalendarId = calendarId.trim();
  const encodedId = encodeURIComponent(cleanCalendarId);
  const googleEmbedUrl = cleanCalendarId
    ? `https://calendar.google.com/calendar/embed?src=${encodedId}&ctz=America%2FSao_Paulo&mode=MONTH&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=1&showCalendars=0&showTz=0`
    : '';

  // Filter tasks for Today's Deliveries
  const todayDeliveries = tasks.filter((t) => t.dueDate === todayStr);
  const overdueTasks = tasks.filter((t) => t.status !== 'done' && t.dueDate < todayStr);
  const pendingTodayCount = todayDeliveries.filter((t) => t.status !== 'done').length;

  // Upcoming exams from courses
  const allExams = courses.flatMap((c) =>
    (c.grades || [])
      .filter((g) => g.date)
      .map((g) => ({
        course: c,
        exam: g,
        date: g.date!,
      }))
  );

  // Filtered tasks for the Kanban Board
  const filteredTasks = tasks.filter(
    (t) => selectedCourseFilter === 'all' || t.courseId === selectedCourseFilter
  );

  const columns: { id: TaskStatus; label: string; badgeColor: string }[] = [
    { id: 'todo', label: 'A Fazer', badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' },
    { id: 'in_progress', label: 'Em Andamento', badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400' },
    { id: 'done', label: 'Concluído', badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' },
  ];

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) return;

    const newTask: Task = {
      id: `task-${Date.now()}`,
      name: taskName.trim(),
      courseId: taskCourseId || courses[0]?.id || '',
      status: taskStatus,
      type: taskType,
      dueDate: taskDueDate || todayStr,
      notes: taskNotes.trim(),
    };

    onAddTask(newTask);
    setIsTaskModalOpen(false);
    setTaskName('');
    setTaskNotes('');
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

  const createGoogleCalendarEventUrl = (title: string, date: string, details?: string) => {
    const formattedDate = date.replace(/-/g, '');
    const dates = `${formattedDate}/${formattedDate}`;
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: dates,
      details: details || 'Adicionado via Painel do Estudante',
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  // Calendar generator helpers
  const year = currentCalendarMonth.getFullYear();
  const month = currentCalendarMonth.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const handlePrevMonth = () => {
    setCurrentCalendarMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentCalendarMonth(new Date(year, month + 1, 1));
  };

  // Activities for the selected calendar date
  const selectedDateTasks = tasks.filter((t) => t.dueDate === selectedCalendarDate);
  const selectedDateExams = allExams.filter((e) => e.date === selectedCalendarDate);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* ======================================================== */}
      {/* 1. TOPO: PRINCIPAIS ENTREGAS DO DIA                      */}
      {/* ======================================================== */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                <Clock className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-bold text-[#37352f] dark:text-[#f3f3f2] tracking-tight">
                Principais Entregas de Hoje
              </h2>
              {todayDeliveries.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300">
                  {pendingTodayCount} pendente{pendingTodayCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-xs text-[#787774] dark:text-[#9b9a97] mt-0.5">
              Atividades e entregas acadêmicas com prazo previsto para o dia de hoje.
            </p>
          </div>

          <button
            onClick={() => {
              setTaskDueDate(todayStr);
              setIsTaskModalOpen(true);
            }}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Entrega</span>
          </button>
        </div>

        {/* Warning if overdue tasks exist */}
        {overdueTasks.length > 0 && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                Atenção: Você possui <b>{overdueTasks.length}</b> entrega{overdueTasks.length > 1 ? 's' : ''} com prazo anterior a hoje ainda não concluída{overdueTasks.length > 1 ? 's' : ''}.
              </span>
            </div>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('tasks')}
                className="text-[11px] font-semibold underline hover:text-amber-900 dark:hover:text-amber-200 ml-2 shrink-0"
              >
                Ver no Quadro
              </button>
            )}
          </div>
        )}

        {/* Deliveries Cards Grid */}
        {todayDeliveries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {todayDeliveries.map((task) => {
              const course = courses.find((c) => c.id === task.courseId);
              const isDone = task.status === 'done';

              return (
                <div
                  key={task.id}
                  className={`p-4 rounded-xl border transition-all shadow-sm flex flex-col justify-between gap-3 ${
                    isDone
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 opacity-75'
                      : 'bg-white dark:bg-[#202020] border-[#e9e9e8] dark:border-[#2f2f2f] hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
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

                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 animate-pulse">
                        Prazo Hoje
                      </span>
                    </div>

                    <div className="flex items-start gap-2.5 pt-1">
                      <button
                        onClick={() =>
                          onUpdateTask({
                            ...task,
                            status: isDone ? 'todo' : 'done',
                          })
                        }
                        className="mt-0.5 text-[#787774] dark:text-[#9b9a97] hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors shrink-0"
                        title={isDone ? 'Marcar como não concluída' : 'Marcar como entregue'}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <h4
                          className={`text-sm font-semibold text-[#37352f] dark:text-[#f3f3f2] ${
                            isDone ? 'line-through text-[#787774] dark:text-[#9b9a97]' : ''
                          }`}
                        >
                          {task.name}
                        </h4>
                        {task.notes && (
                          <p className="text-xs text-[#787774] dark:text-[#9b9a97] mt-1 line-clamp-2">
                            {task.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#f0f0ee] dark:border-[#2a2a2a] text-xs">
                    <span className="text-[11px] text-[#787774] dark:text-[#9b9a97]">
                      Status:{' '}
                      <b className={isDone ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                        {task.status === 'done' ? 'Concluído' : task.status === 'in_progress' ? 'Em Andamento' : 'A Fazer'}
                      </b>
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          onUpdateTask({
                            ...task,
                            status: task.status === 'todo' ? 'in_progress' : task.status === 'in_progress' ? 'done' : 'todo',
                          })
                        }
                        className="px-2 py-0.5 text-[10px] rounded bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors font-medium text-[#37352f] dark:text-white"
                      >
                        {task.status === 'todo' ? 'Iniciar →' : task.status === 'in_progress' ? 'Concluir ✓' : 'Reabrir ↺'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-stone-50 dark:from-stone-900/60 dark:via-[#1e1e1e] dark:to-stone-900/40 p-5 rounded-2xl border border-blue-100 dark:border-[#2f2f2f] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#37352f] dark:text-[#f3f3f2]">
                  Nenhuma entrega urgente com prazo para hoje!
                </h4>
                <p className="text-xs text-[#787774] dark:text-[#9b9a97] mt-0.5">
                  Excelente! Todas as suas tarefas de hoje estão em dia. Aproveite para adiantar as entregas da semana no quadro abaixo.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setTaskDueDate(todayStr);
                setIsTaskModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-white dark:bg-[#252525] hover:bg-stone-100 dark:hover:bg-stone-800 text-[#37352f] dark:text-white text-xs font-medium rounded-lg border border-[#e9e9e8] dark:border-[#333] transition-all shadow-sm shrink-0"
            >
              + Adicionar entrega para hoje
            </button>
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* 2. MEIO: QUADROS DE TAREFAS DESSAS ATIVIDADES             */}
      {/* ======================================================== */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <CheckCircle2 className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-bold text-[#37352f] dark:text-[#f3f3f2] tracking-tight">
                Quadro de Tarefas das Atividades
              </h2>
            </div>
            <p className="text-xs text-[#787774] dark:text-[#9b9a97] mt-0.5">
              Visualize e altere o status das atividades e entregas das disciplinas.
            </p>
          </div>

          {/* Course filter pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 max-w-full">
            <span className="text-xs text-[#787774] dark:text-[#9b9a97] flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3" />
            </span>
            <button
              onClick={() => setSelectedCourseFilter('all')}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all shrink-0 ${
                selectedCourseFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-[#efeeea] dark:bg-[#262626] text-[#787774] dark:text-[#9b9a97] hover:text-[#37352f]'
              }`}
            >
              Todas ({tasks.length})
            </button>
            {courses.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCourseFilter(c.id)}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                  selectedCourseFilter === c.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-[#efeeea] dark:bg-[#262626] text-[#787774] dark:text-[#9b9a97] hover:text-[#37352f]'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                <span>{c.code}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 3 Kanban Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {columns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);

            return (
              <div
                key={col.id}
                className="bg-[#f7f6f3]/80 dark:bg-[#1e1e1e] rounded-xl p-3.5 border border-[#e9e9e8] dark:border-[#2f2f2f] flex flex-col min-h-[380px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#e9e9e8] dark:border-[#2f2f2f]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#787774] dark:text-[#9b9a97]">
                      {col.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${col.badgeColor}`}>
                      {colTasks.length}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setTaskStatus(col.id);
                      setIsTaskModalOpen(true);
                    }}
                    className="p-1 rounded text-[#787774] hover:text-[#37352f] dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors"
                    title={`Adicionar tarefa em ${col.label}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Cards List */}
                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[500px] pr-0.5">
                  {colTasks.map((task) => {
                    const course = courses.find((c) => c.id === task.courseId);
                    const isLate = task.status !== 'done' && task.dueDate < todayStr;
                    const isDueToday = task.dueDate === todayStr;

                    return (
                      <div
                        key={task.id}
                        className="bg-white dark:bg-[#252525] p-3 rounded-lg border border-[#e9e9e8] dark:border-[#333] hover:shadow transition-all space-y-2"
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

                        <h4 className="text-xs font-medium text-[#37352f] dark:text-[#f3f3f2] leading-snug">
                          {task.name}
                        </h4>

                        {task.notes && (
                          <p className="text-[11px] text-[#787774] dark:text-[#9b9a97] line-clamp-2">
                            {task.notes}
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-1 text-[11px] text-[#787774] dark:text-[#9b9a97]">
                          <div
                            className={`flex items-center gap-1 ${
                              isLate
                                ? 'text-red-600 dark:text-red-400 font-semibold'
                                : isDueToday
                                ? 'text-amber-600 dark:text-amber-400 font-semibold'
                                : ''
                            }`}
                          >
                            <CalendarIcon className="w-3 h-3" />
                            <span>{task.dueDate}</span>
                            {isLate && <AlertCircle className="w-3 h-3" />}
                          </div>

                          {/* Quick stage switch */}
                          <div className="flex items-center gap-1">
                            {col.id !== 'todo' && (
                              <button
                                onClick={() =>
                                  onUpdateTask({
                                    ...task,
                                    status: col.id === 'done' ? 'in_progress' : 'todo',
                                  })
                                }
                                className="p-1 text-[10px] bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded transition-colors"
                                title="Voltar etapa"
                              >
                                <ArrowLeft className="w-3 h-3" />
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
                                className="p-1 text-[10px] bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded transition-colors"
                                title="Avançar etapa"
                              >
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              onClick={() => onDeleteTask(task.id)}
                              className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors ml-0.5"
                              title="Excluir tarefa"
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
                      Nenhuma tarefa nesta etapa
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. EM BAIXO: CALENDÁRIO COM MINHAS ATIVIDADES             */}
      {/* ======================================================== */}
      <section className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <CalendarDays className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-bold text-[#37352f] dark:text-[#f3f3f2] tracking-tight">
                Meu Calendário de Atividades
              </h2>
            </div>
            <p className="text-xs text-[#787774] dark:text-[#9b9a97] mt-0.5">
              Visualize seus prazos, entregas, provas e eventos acadêmicos diretamente no calendário.
            </p>
          </div>

          {/* Toggle between Interactive Grid vs Google Calendar Embed */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-[#efeeea] dark:bg-[#202020] p-1 rounded-lg text-xs">
              <button
                onClick={() => setCalendarViewMode('interactive')}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  calendarViewMode === 'interactive'
                    ? 'bg-white dark:bg-[#2a2a2a] text-[#37352f] dark:text-white shadow-sm'
                    : 'text-[#787774] dark:text-[#9b9a97]'
                }`}
              >
                Calendário do Painel
              </button>
              <button
                onClick={() => setCalendarViewMode('google')}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  calendarViewMode === 'google'
                    ? 'bg-white dark:bg-[#2a2a2a] text-[#37352f] dark:text-white shadow-sm'
                    : 'text-[#787774] dark:text-[#9b9a97]'
                }`}
              >
                Google Calendar
              </button>
            </div>

            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('calendar')}
                className="p-1.5 rounded-lg border border-[#e9e9e8] dark:border-[#333] text-[#787774] hover:text-[#37352f] dark:hover:text-white text-xs flex items-center gap-1 transition-colors"
                title="Abrir aba completa do Google Calendar"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {calendarViewMode === 'interactive' ? (
          /* Interactive Academic Calendar + Selected Day Detail */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Month Calendar Grid (2 cols) */}
            <div className="lg:col-span-2 bg-white dark:bg-[#202020] rounded-2xl border border-[#e9e9e8] dark:border-[#2f2f2f] p-5 shadow-sm space-y-4">
              {/* Header month switcher */}
              <div className="flex items-center justify-between pb-3 border-b border-[#e9e9e8] dark:border-[#2f2f2f]">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm md:text-base text-[#37352f] dark:text-[#f3f3f2]">
                    {monthNames[month]} {year}
                  </h3>
                  <button
                    onClick={() => {
                      setCurrentCalendarMonth(new Date());
                      setSelectedCalendarDate(todayStr);
                    }}
                    className="px-2 py-0.5 text-[10px] rounded font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100"
                  >
                    Hoje
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePrevMonth}
                    className="p-1.5 rounded-lg border border-[#e9e9e8] dark:border-[#333] hover:bg-stone-50 dark:hover:bg-stone-800 text-[#787774] dark:text-[#9b9a97]"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNextMonth}
                    className="p-1.5 rounded-lg border border-[#e9e9e8] dark:border-[#333] hover:bg-stone-50 dark:hover:bg-stone-800 text-[#787774] dark:text-[#9b9a97]"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-[#787774] dark:text-[#9b9a97] uppercase">
                <span>Dom</span>
                <span>Seg</span>
                <span>Ter</span>
                <span>Qua</span>
                <span>Qui</span>
                <span>Sex</span>
                <span>Sáb</span>
              </div>

              {/* Day cells grid */}
              <div className="grid grid-cols-7 gap-1.5">
                {/* Empty cells before month start */}
                {Array.from({ length: firstDayIndex }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-16 md:h-20 rounded-lg bg-stone-50/50 dark:bg-[#1a1a1a]/50 opacity-30" />
                ))}

                {/* Days of month */}
                {Array.from({ length: totalDaysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const isToday = dateString === todayStr;
                  const isSelected = dateString === selectedCalendarDate;

                  // Tasks & Exams for this day
                  const dayTasks = tasks.filter((t) => t.dueDate === dateString);
                  const dayExams = allExams.filter((e) => e.date === dateString);
                  const hasActivities = dayTasks.length > 0 || dayExams.length > 0;

                  return (
                    <button
                      key={dateString}
                      onClick={() => setSelectedCalendarDate(dateString)}
                      className={`h-16 md:h-20 p-1.5 rounded-xl border flex flex-col justify-between text-left transition-all ${
                        isSelected
                          ? 'border-blue-600 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-500/20'
                          : isToday
                          ? 'border-amber-400 dark:border-amber-600 bg-amber-50/30 dark:bg-amber-950/20'
                          : 'border-[#f0f0ee] dark:border-[#2a2a2a] hover:bg-stone-50 dark:hover:bg-[#252525]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span
                          className={`text-xs font-semibold px-1.5 py-0.2 rounded-md ${
                            isToday
                              ? 'bg-amber-500 text-white font-bold'
                              : isSelected
                              ? 'bg-blue-600 text-white'
                              : 'text-[#37352f] dark:text-[#f3f3f2]'
                          }`}
                        >
                          {dayNum}
                        </span>

                        {hasActivities && (
                          <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">
                            {dayTasks.length + dayExams.length}
                          </span>
                        )}
                      </div>

                      {/* Micro activity indicators */}
                      <div className="w-full space-y-0.5 overflow-hidden">
                        {dayExams.map((e) => (
                          <div
                            key={e.exam.id}
                            className="text-[9px] font-semibold truncate px-1 rounded bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                            title={`Prova: ${e.course.code} - ${e.exam.name}`}
                          >
                            📝 {e.course.code}
                          </div>
                        ))}
                        {dayTasks.slice(0, 2).map((t) => (
                          <div
                            key={t.id}
                            className={`text-[9px] truncate px-1 rounded ${
                              t.status === 'done'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 line-through'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                            }`}
                            title={t.name}
                          >
                            • {t.name}
                          </div>
                        ))}
                        {dayTasks.length > 2 && (
                          <div className="text-[8px] text-[#787774] dark:text-[#9b9a97] px-1">
                            +{dayTasks.length - 2} mais
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Date Details Sidebar (1 col) */}
            <div className="bg-white dark:bg-[#202020] rounded-2xl border border-[#e9e9e8] dark:border-[#2f2f2f] p-4 space-y-4 shadow-sm flex flex-col justify-between">
              <div className="space-y-3">
                <div className="pb-3 border-b border-[#e9e9e8] dark:border-[#2f2f2f]">
                  <div className="text-[11px] font-semibold text-[#787774] dark:text-[#9b9a97] uppercase tracking-wider">
                    Atividades do Dia Selecionado
                  </div>
                  <div className="text-base font-bold text-[#37352f] dark:text-[#f3f3f2] mt-0.5 flex items-center justify-between">
                    <span>{selectedCalendarDate}</span>
                    {selectedCalendarDate === todayStr && (
                      <span className="text-[10px] px-2 py-0.5 bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 rounded-full font-medium">
                        Hoje
                      </span>
                    )}
                  </div>
                </div>

                {/* List of Exams for the selected date */}
                {selectedDateExams.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">
                      Provas & Avaliações ({selectedDateExams.length})
                    </span>
                    {selectedDateExams.map(({ course, exam, date }) => (
                      <div
                        key={exam.id}
                        className="p-2.5 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold"
                            style={{ backgroundColor: `${course.color}20`, color: course.color }}
                          >
                            {course.code}
                          </span>
                          <span className="text-[10px] font-medium text-red-600 dark:text-red-400">
                            Avaliação
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-[#37352f] dark:text-[#f3f3f2]">
                          {exam.name}
                        </div>
                        <a
                          href={createGoogleCalendarEventUrl(
                            `[${course.code}] ${exam.name}`,
                            date,
                            `Prova de ${course.name} (${course.code}). Local: ${course.roomOrLink || 'A definir'}`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline pt-0.5"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Agendar no Google Calendar</span>
                        </a>
                      </div>
                    ))}
                  </div>
                )}

                {/* List of Tasks for the selected date */}
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-[#787774] dark:text-[#9b9a97] uppercase tracking-wider">
                    Entregas & Tarefas ({selectedDateTasks.length})
                  </span>

                  {selectedDateTasks.length > 0 ? (
                    <div className="space-y-2">
                      {selectedDateTasks.map((t) => {
                        const course = courses.find((c) => c.id === t.courseId);
                        const isDone = t.status === 'done';

                        return (
                          <div
                            key={t.id}
                            className={`p-2.5 rounded-lg border space-y-1.5 transition-all ${
                              isDone
                                ? 'border-[#e9e9e8] dark:border-[#2f2f2f] bg-stone-50 dark:bg-[#1f1f1f] opacity-75'
                                : 'border-[#e9e9e8] dark:border-[#333] bg-[#faf9f6] dark:bg-[#252525]'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getTypeBadge(t.type)}`}>
                                {t.type}
                              </span>
                              {course && (
                                <span className="text-[10px] font-mono font-bold text-[#787774] dark:text-[#9b9a97]">
                                  {course.code}
                                </span>
                              )}
                            </div>

                            <div
                              className={`text-xs font-medium text-[#37352f] dark:text-[#f3f3f2] ${
                                isDone ? 'line-through text-[#787774]' : ''
                              }`}
                            >
                              {t.name}
                            </div>

                            <div className="flex items-center justify-between pt-1 text-[10px]">
                              <button
                                onClick={() =>
                                  onUpdateTask({
                                    ...t,
                                    status: isDone ? 'todo' : 'done',
                                  })
                                }
                                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                              >
                                {isDone ? 'Reabrir tarefa' : 'Marcar como concluída'}
                              </button>
                              <a
                                href={createGoogleCalendarEventUrl(
                                  `[${course ? course.code : 'Entrega'}] ${t.name}`,
                                  t.dueDate,
                                  t.notes || 'Entrega acadêmica'
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#787774] dark:text-[#9b9a97] hover:text-blue-600"
                                title="Criar evento no Google Calendar"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-xs text-[#9b9a97]">
                      Nenhuma tarefa agendada para esta data.
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Add for Selected Day */}
              <button
                onClick={() => {
                  setTaskDueDate(selectedCalendarDate);
                  setIsTaskModalOpen(true);
                }}
                className="w-full py-2 px-3 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-[#37352f] dark:text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar atividade neste dia</span>
              </button>
            </div>
          </div>
        ) : (
          /* Google Calendar Embed View */
          <div className="bg-white dark:bg-[#202020] rounded-2xl border border-[#e9e9e8] dark:border-[#2f2f2f] shadow-sm overflow-hidden flex flex-col">
            {cleanCalendarId ? (
              <div className="relative w-full h-[540px] bg-white">
                <iframe
                  title="Google Calendar Integrado"
                  src={googleEmbedUrl}
                  className="w-full h-full border-0"
                  style={{ filter: darkMode ? 'invert(90%) hue-rotate(180deg)' : 'none' }}
                />
              </div>
            ) : (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mx-auto">
                  <CalendarIcon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-sm text-[#37352f] dark:text-[#f3f3f2]">
                  Agenda do Google não configurada
                </h3>
                <p className="text-xs text-[#787774] dark:text-[#9b9a97] max-w-sm mx-auto">
                  Configure o seu e-mail do Google na aba do Google Calendar para ver sua agenda oficial sincronizada aqui.
                </p>
                {onNavigateTab && (
                  <button
                    onClick={() => onNavigateTab('calendar')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-sm transition-all inline-flex items-center gap-1.5"
                  >
                    <span>Abrir Configuração da Agenda</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* MODAL: ADICIONAR NOVA TAREFA / ENTREGA                   */}
      {/* ======================================================== */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#202020] rounded-2xl border border-[#e9e9e8] dark:border-[#2f2f2f] w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-base text-[#37352f] dark:text-[#f3f3f2] flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>Nova Atividade / Entrega</span>
              </h3>
              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="p-1 text-[#787774] hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4 text-xs md:text-sm">
              <div>
                <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium text-xs">
                  Nome da Atividade / Entrega *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Entregar Relatório do Laboratório 2"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium text-xs">
                    Disciplina
                  </label>
                  <select
                    value={taskCourseId}
                    onChange={(e) => setTaskCourseId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500 text-xs"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id} className="dark:bg-[#202020]">
                        {c.code} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium text-xs">
                    Tipo
                  </label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value as TaskType)}
                    className="w-full px-3 py-2 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500 text-xs"
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
                  <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium text-xs">
                    Status Inicial
                  </label>
                  <select
                    value={taskStatus}
                    onChange={(e) => setTaskStatus(e.target.value as TaskStatus)}
                    className="w-full px-3 py-2 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500 text-xs"
                  >
                    <option value="todo" className="dark:bg-[#202020]">A Fazer</option>
                    <option value="in_progress" className="dark:bg-[#202020]">Em Andamento</option>
                    <option value="done" className="dark:bg-[#202020]">Concluído</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium text-xs">
                    Data de Entrega
                  </label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium text-xs">
                  Anotações / Instruções
                </label>
                <textarea
                  rows={3}
                  placeholder="Instruções, links ou notas da entrega..."
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg text-xs font-medium hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-sm transition-colors"
                >
                  Salvar Atividade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
