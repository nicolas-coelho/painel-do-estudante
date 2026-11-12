import React, { useState, useEffect } from 'react';
import { Course, Task, TaskStatus, TaskType, PersonalBill, PersonalAppointment } from '../types';
import { useNotification } from '../context/NotificationContext';
import { formatDateBR, parseDateToISO } from '../dateUtils';
import { getClassesForDayOfWeek, getEventDateStr, getEventTimeStr } from '../calendarUtils';
import { getSavedCalendarToken, fetchGoogleCalendarEvents, GoogleCalendarEvent } from '../googleCalendar';
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
  GraduationCap,
  Video,
  MapPin,
  RefreshCw,
  Wallet,
  GripVertical,
  Pencil,
} from 'lucide-react';

interface HomeTabProps {
  courses: Course[];
  tasks: Task[];
  darkMode: boolean;
  calendarId?: string;
  personalBills?: PersonalBill[];
  personalAppointments?: PersonalAppointment[];
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
  calendarId: propCalendarId,
  personalBills = [],
  personalAppointments = [],
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onNavigateTab,
}) => {
  const { showToast, showConfirm } = useNotification();
  const todayStr = getLocalDateStr();

  // Task creation/edit modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
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

  // Google Calendar config & events
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
  const calendarId = propCalendarId || localStorage.getItem(LOCAL_STORAGE_CALENDAR_ID) || 'nicolasplcoelho@gmail.com';

  useEffect(() => {
    const savedToken = getSavedCalendarToken();
    fetchGoogleCalendarEvents(savedToken, undefined, undefined, calendarId)
      .then((evts) => setGoogleEvents(evts))
      .catch((err) => console.log('Google Calendar sync in Home:', err));
  }, [calendarId]);

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

  // Acompanha estritamente as disciplinas cadastradas em andamento (ou com tarefas atribuídas)
  const visibleCourses = courses.filter(
    (c) => c.inProgress !== false || tasks.some((t) => t.courseId === c.id)
  );

  useEffect(() => {
    if (selectedCourseFilter !== 'all' && !visibleCourses.some((c) => c.id === selectedCourseFilter)) {
      setSelectedCourseFilter('all');
    }
  }, [selectedCourseFilter, visibleCourses]);

  useEffect(() => {
    if (!taskCourseId || !visibleCourses.some((c) => c.id === taskCourseId)) {
      setTaskCourseId(visibleCourses[0]?.id || courses[0]?.id || '');
    }
  }, [visibleCourses]);

  // Filtered tasks for the Kanban Board
  const filteredTasks = tasks.filter(
    (t) => selectedCourseFilter === 'all' || t.courseId === selectedCourseFilter
  );

  const columns: { id: TaskStatus; label: string; badgeColor: string }[] = [
    { id: 'todo', label: 'A Fazer', badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' },
    { id: 'in_progress', label: 'Em Andamento', badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400' },
    { id: 'done', label: 'Concluído', badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' },
  ];

  const handleOpenCreateTask = (initialStatus: TaskStatus = 'todo', defaultDate: string = todayStr) => {
    setEditingTask(null);
    setTaskName('');
    setTaskCourseId(visibleCourses[0]?.id || courses[0]?.id || '');
    setTaskStatus(initialStatus);
    setTaskType('Trabalho');
    setTaskDueDate(defaultDate);
    setTaskNotes('');
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskName(task.name);
    setTaskCourseId(task.courseId);
    setTaskStatus(task.status);
    setTaskType(task.type);
    setTaskDueDate(parseDateToISO(task.dueDate) || task.dueDate || todayStr);
    setTaskNotes(task.notes || '');
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) return;

    if (editingTask) {
      const updated: Task = {
        ...editingTask,
        name: taskName.trim(),
        courseId: taskCourseId || visibleCourses[0]?.id || courses[0]?.id || '',
        status: taskStatus,
        type: taskType,
        dueDate: taskDueDate || editingTask.dueDate,
        notes: taskNotes.trim(),
      };
      onUpdateTask(updated);
      showToast('success', 'Atividade Atualizada', `"${taskName.trim()}" foi atualizada com sucesso.`);
    } else {
      const newTask: Task = {
        id: `task-${Date.now()}`,
        name: taskName.trim(),
        courseId: taskCourseId || visibleCourses[0]?.id || courses[0]?.id || '',
        status: taskStatus,
        type: taskType,
        dueDate: taskDueDate || todayStr,
        notes: taskNotes.trim(),
      };
      onAddTask(newTask);
      showToast('success', 'Atividade Criada', `"${taskName.trim()}" foi adicionada.`);
    }

    setIsTaskModalOpen(false);
    setEditingTask(null);
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

  // Drag and drop state for the Kanban board
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<TaskStatus | null>(null);

  // Converte data para timestamp numérico para ordenação (datas mais próximas no topo)
  const getTaskTimestamp = (dueDate?: string | null): number => {
    if (!dueDate || !dueDate.trim()) return Infinity;
    const iso = parseDateToISO(dueDate);
    const time = new Date(iso || dueDate).getTime();
    return isNaN(time) ? Infinity : time;
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
      showToast(
        'success',
        'Status Atualizado',
        `A atividade "${taskToMove.name}" foi movida para ${
          targetStatus === 'todo' ? 'A Fazer' : targetStatus === 'in_progress' ? 'Em Andamento' : 'Concluído'
        }.`
      );
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
  const selectedDateParts = selectedCalendarDate.split('-').map(Number);
  const selectedDateObj = selectedDateParts.length === 3 ? new Date(selectedDateParts[0], selectedDateParts[1] - 1, selectedDateParts[2]) : new Date();
  const selectedDayOfWeek = !isNaN(selectedDateObj.getTime()) ? selectedDateObj.getDay() : -1;
  const selectedDateClasses = selectedDayOfWeek >= 0 ? getClassesForDayOfWeek(courses, selectedDayOfWeek) : [];
  const selectedDateTasks = tasks.filter((t) => t.dueDate === selectedCalendarDate);
  const selectedDateExams = allExams.filter((e) => e.date === selectedCalendarDate);
  const selectedDateGoogleEvents = googleEvents.filter((ev) => getEventDateStr(ev) === selectedCalendarDate);

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
            onClick={() => handleOpenCreateTask('todo', todayStr)}
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

        {/* Lembrete de Vida Pessoal & Contas a Pagar */}
        {(() => {
          const pending = personalBills.filter((b) => b.status === 'pending');
          const dueToday = pending.filter((b) => b.dueDate === todayStr);
          const overdue = pending.filter((b) => b.dueDate < todayStr);
          if (dueToday.length === 0 && overdue.length === 0) return null;

          return (
            <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-950 dark:text-emerald-200 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold block text-sm">
                    {dueToday.length > 0
                      ? `Lembrete Financeiro: Você tem ${dueToday.length} conta(s) a pagar hoje!`
                      : `Atenção: Você tem ${overdue.length} conta(s) em atraso na Vida Pessoal.`}
                  </span>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    {dueToday.map((b) => `${b.title} (R$ ${b.amount.toFixed(2)})`).join(', ') ||
                      overdue.map((b) => `${b.title}`).join(', ')}
                  </span>
                </div>
              </div>
              {onNavigateTab && (
                <button
                  onClick={() => onNavigateTab('personal')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition-colors shrink-0 self-start sm:self-auto shadow-xs"
                >
                  Ver Vida Pessoal & Finanças →
                </button>
              )}
            </div>
          );
        })()}

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
                          onClick={() => handleOpenEditTask(task)}
                          className={`text-sm font-semibold text-[#37352f] dark:text-[#f3f3f2] cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${
                            isDone ? 'line-through text-[#787774] dark:text-[#9b9a97]' : ''
                          }`}
                          title="Clique para editar prazo ou descrição"
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
                        type="button"
                        onClick={() => handleOpenEditTask(task)}
                        className="p-1 rounded bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-[#787774] hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title="Editar atividade (prazo, descrição...)"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
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
              onClick={() => handleOpenCreateTask('todo', todayStr)}
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
            {visibleCourses.map((c) => {
              const count = tasks.filter((t) => t.courseId === c.id).length;
              return (
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
                  <span className="text-[10px] opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Helpful Hint */}
        <div className="flex items-center gap-2 text-[11px] text-[#787774] dark:text-[#9b9a97] bg-white/60 dark:bg-[#202020]/60 px-3 py-1.5 rounded-lg border border-[#e9e9e8] dark:border-[#2f2f2f] w-fit">
          <GripVertical className="w-3.5 h-3.5 text-blue-500" />
          <span>Arraste os cartões entre as colunas ou clique em um cartão para editar prazos e detalhes.</span>
        </div>

        {/* 3 Kanban Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {columns.map((col) => {
            // Ordena as atividades pela data de entrega mais próxima no topo; tarefas sem data ficam no final
            const colTasks = filteredTasks
              .filter((t) => t.status === col.id)
              .sort((a, b) => {
                const timeA = getTaskTimestamp(a.dueDate);
                const timeB = getTaskTimestamp(b.dueDate);
                if (timeA !== timeB) return timeA - timeB;
                return a.name.localeCompare(b.name, 'pt-BR');
              });
            const isOver = dragOverColId === col.id;

            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={(e) => handleDragLeave(e, col.id)}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`rounded-xl p-3.5 border transition-all flex flex-col min-h-[380px] ${
                  isOver
                    ? 'bg-blue-50/60 dark:bg-blue-950/20 border-blue-400 dark:border-blue-500 ring-2 ring-blue-400/20 shadow-md'
                    : 'bg-[#f7f6f3]/80 dark:bg-[#1e1e1e] border-[#e9e9e8] dark:border-[#2f2f2f]'
                }`}
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
                    onClick={() => handleOpenCreateTask(col.id, todayStr)}
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
                    const taskIso = parseDateToISO(task.dueDate);
                    const isLate = task.status !== 'done' && Boolean(taskIso) && new Date(taskIso) < new Date(new Date().setHours(0,0,0,0));
                    const isDueToday = taskIso ? taskIso === todayStr : task.dueDate === todayStr;
                    const isDragging = draggedTaskId === task.id;

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => handleOpenEditTask(task)}
                        title="Clique para editar prazo ou descrição"
                        className={`group bg-white dark:bg-[#252525] p-3 rounded-lg border border-[#e9e9e8] dark:border-[#333] hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-md transition-all space-y-2 select-none cursor-pointer ${
                          isDragging ? 'opacity-40 scale-[0.98] ring-2 ring-blue-500 shadow-none' : ''
                        }`}
                      >
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
                          <GripVertical className="w-3.5 h-3.5 text-stone-300 dark:text-stone-600 group-hover:text-stone-500 shrink-0 cursor-grab active:cursor-grabbing" />
                        </div>

                        <h4 className="text-xs font-medium text-[#37352f] dark:text-[#f3f3f2] leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
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
                            <span>{formatDateBR(task.dueDate)}</span>
                            {isLate && <AlertCircle className="w-3 h-3" />}
                          </div>

                          {/* Quick stage switch + Edit + Delete */}
                          <div className="flex items-center gap-1">
                            {col.id !== 'todo' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUpdateTask({
                                    ...task,
                                    status: col.id === 'done' ? 'in_progress' : 'todo',
                                  });
                                }}
                                className="p-1 text-[10px] bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded transition-colors"
                                title="Voltar etapa"
                              >
                                <ArrowLeft className="w-3 h-3" />
                              </button>
                            )}
                            {col.id !== 'done' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUpdateTask({
                                    ...task,
                                    status: col.id === 'todo' ? 'in_progress' : 'done',
                                  });
                                }}
                                className="p-1 text-[10px] bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded transition-colors"
                                title="Avançar etapa"
                              >
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditTask(task);
                              }}
                              className="p-1 text-stone-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded transition-colors ml-0.5"
                              title="Editar atividade (prazo, descrição...)"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
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
                  const dateObj = new Date(year, month, dayNum);
                  const dayOfWeek = dateObj.getDay();
                  const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const isToday = dateString === todayStr;
                  const isSelected = dateString === selectedCalendarDate;

                  // 1. Aulas da semana
                  const dayClasses = getClassesForDayOfWeek(courses, dayOfWeek);

                  // 2. Provas agendadas
                  const dayExams = allExams.filter((e) => e.date === dateString);

                  // 3. Tarefas / entregas
                  const dayTasks = tasks.filter((t) => t.dueDate === dateString);

                  // 4. Eventos do Google Calendar
                  const dayGoogle = googleEvents.filter((ev) => getEventDateStr(ev) === dateString);

                  const totalCount = dayClasses.length + dayExams.length + dayTasks.length + dayGoogle.length;
                  const hasActivities = totalCount > 0;

                  return (
                    <button
                      key={dateString}
                      onClick={() => setSelectedCalendarDate(dateString)}
                      className={`h-20 md:h-24 p-1.5 rounded-xl border flex flex-col justify-between text-left transition-all ${
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
                            {totalCount}
                          </span>
                        )}
                      </div>

                      {/* Micro activity indicators */}
                      <div className="w-full space-y-0.5 overflow-hidden">
                        {/* Provas */}
                        {dayExams.map((e) => (
                          <div
                            key={e.exam.id}
                            className="text-[9px] font-semibold truncate px-1 rounded bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                            title={`Prova: ${e.course.code} - ${e.exam.name}`}
                          >
                            📝 {e.course.code}
                          </div>
                        ))}

                        {/* Aulas da semana */}
                        {dayClasses.map((cls, idx) => (
                          <div
                            key={`cls-${cls.course.id}-${idx}`}
                            className="text-[9px] font-medium truncate px-1 rounded text-white"
                            style={{ backgroundColor: cls.course.color }}
                            title={`Aula: ${cls.course.name} (${cls.course.code}) - ${cls.time}`}
                          >
                            🎓 {cls.course.code}
                          </div>
                        ))}

                        {/* Tarefas */}
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

                        {/* Google Calendar */}
                        {dayGoogle.slice(0, 1).map((ev) => (
                          <div
                            key={ev.id}
                            className="text-[9px] truncate px-1 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                            title={`Google Calendar: ${ev.summary}`}
                          >
                            📅 {ev.summary}
                          </div>
                        ))}

                        {totalCount > 3 && (
                          <div className="text-[8px] text-[#787774] dark:text-[#9b9a97] px-1 font-semibold">
                            +{totalCount - 3} mais
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
                    <span>{formatDateBR(selectedCalendarDate)}</span>
                    {selectedCalendarDate === todayStr && (
                      <span className="text-[10px] px-2 py-0.5 bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 rounded-full font-medium">
                        Hoje
                      </span>
                    )}
                  </div>
                </div>

                {/* 1. Aulas Programadas do Dia */}
                {selectedDateClasses.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>Aulas da Grade ({selectedDateClasses.length})</span>
                    </span>
                    {selectedDateClasses.map(({ course, time, room }, idx) => (
                      <div
                        key={`home-cls-${course.id}-${idx}`}
                        className="p-2.5 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-[#faf9f6] dark:bg-[#252525] space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold"
                            style={{ backgroundColor: `${course.color}20`, color: course.color }}
                          >
                            {course.code}
                          </span>
                          <span className="text-[10px] font-medium text-stone-600 dark:text-stone-300 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-stone-400" />
                            {time}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-[#37352f] dark:text-[#f3f3f2]">
                          {course.name}
                        </div>
                        <div className="text-[11px] text-[#787774] dark:text-[#9b9a97] flex items-center justify-between pt-0.5">
                          <span>Prof: {course.professor || 'Não informado'}</span>
                          {room && (
                            <span className="truncate flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-stone-400" />
                              {room}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 2. Provas do Dia */}
                {selectedDateExams.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Provas & Avaliações ({selectedDateExams.length})</span>
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
                          <span className="text-[10px] font-medium text-red-600 dark:text-red-400 font-semibold">
                            Prova
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

                {/* 3. Tarefas & Entregas */}
                {selectedDateTasks.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-semibold text-[#787774] dark:text-[#9b9a97] uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Entregas & Tarefas ({selectedDateTasks.length})</span>
                    </span>
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
                  </div>
                )}

                {/* 4. Eventos do Google Calendar */}
                {selectedDateGoogleEvents.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      <span>Google Calendar ({selectedDateGoogleEvents.length})</span>
                    </span>
                    {selectedDateGoogleEvents.map((ev) => {
                      const timeStr = getEventTimeStr(ev);
                      return (
                        <div
                          key={ev.id}
                          className="p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-1"
                        >
                          <div className="flex items-center justify-between text-[10px] text-emerald-700 dark:text-emerald-300 font-medium">
                            <span>Google Calendar</span>
                            {timeStr && <span>{timeStr}</span>}
                          </div>
                          <div className="text-xs font-semibold text-[#37352f] dark:text-[#f3f3f2]">
                            {ev.summary}
                          </div>
                          {ev.hangoutLink && (
                            <a
                              href={ev.hangoutLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline pt-0.5"
                            >
                              <Video className="w-3 h-3" />
                              <span>Entrar no Google Meet</span>
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Estado vazio para o dia */}
                {selectedDateClasses.length === 0 &&
                  selectedDateExams.length === 0 &&
                  selectedDateTasks.length === 0 &&
                  selectedDateGoogleEvents.length === 0 && (
                    <div className="py-8 text-center text-xs text-[#9b9a97] space-y-1.5 bg-[#f7f6f3]/50 dark:bg-[#1a1a1a]/50 rounded-xl p-4 border border-dashed border-[#e9e9e8] dark:border-[#333]">
                      <CalendarDays className="w-6 h-6 mx-auto opacity-40 text-stone-400" />
                      <p className="font-medium text-[#787774] dark:text-[#9b9a97]">
                        Nenhuma atividade programada para este dia.
                      </p>
                      <p className="text-[11px] text-[#9b9a97]">
                        Você pode adiantar suas matérias ou adicionar uma tarefa abaixo.
                      </p>
                    </div>
                )}
              </div>

              {/* Quick Add for Selected Day */}
              <button
                onClick={() => handleOpenCreateTask('todo', selectedCalendarDate)}
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
      {/* MODAL: ADICIONAR / EDITAR TAREFA OU ENTREGA              */}
      {/* ======================================================== */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#202020] rounded-2xl border border-[#e9e9e8] dark:border-[#2f2f2f] w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-base text-[#37352f] dark:text-[#f3f3f2] flex items-center gap-2">
                {editingTask ? (
                  <>
                    <Pencil className="w-4 h-4 text-blue-600" />
                    <span>Editar Atividade / Entrega</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-blue-600" />
                    <span>Nova Atividade / Entrega</span>
                  </>
                )}
              </h3>
              <button
                onClick={() => {
                  setIsTaskModalOpen(false);
                  setEditingTask(null);
                }}
                className="p-1 text-[#787774] hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-4 text-xs md:text-sm">
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
                    {visibleCourses.map((c) => (
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
                    {editingTask ? 'Status' : 'Status Inicial'}
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
                  onClick={() => {
                    setIsTaskModalOpen(false);
                    setEditingTask(null);
                  }}
                  className="px-3.5 py-2 rounded-lg text-xs font-medium hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-sm transition-colors"
                >
                  {editingTask ? 'Salvar Alterações' : 'Salvar Atividade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
