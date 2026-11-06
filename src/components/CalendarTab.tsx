import React, { useState, useEffect } from 'react';
import { Course, Task } from '../types';
import {
  Calendar as CalendarIcon,
  ExternalLink,
  Plus,
  Settings,
  Clock,
  BookOpen,
  CheckCircle2,
  CalendarDays,
  Sparkles,
} from 'lucide-react';

interface CalendarTabProps {
  courses: Course[];
  tasks: Task[];
  darkMode: boolean;
  calendarId: string;
  onUpdateCalendarId: (id: string) => void;
}

export const CalendarTab: React.FC<CalendarTabProps> = ({
  courses,
  tasks,
  darkMode,
  calendarId,
  onUpdateCalendarId,
}) => {
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [tempId, setTempId] = useState<string>(calendarId || 'nicolasplcoelho@gmail.com');
  const [calendarView, setCalendarView] = useState<'MONTH' | 'WEEK' | 'AGENDA'>('MONTH');

  const activeId = calendarId || 'nicolasplcoelho@gmail.com';

  // Clean and encode calendar ID for embed URL
  const cleanCalendarId = activeId.trim();
  const encodedId = encodeURIComponent(cleanCalendarId);

  // Google Calendar embed URL
  const embedUrl = cleanCalendarId
    ? `https://calendar.google.com/calendar/embed?src=${encodedId}&ctz=America%2FSao_Paulo&mode=${calendarView}&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=1&showCalendars=0&showTz=0`
    : '';

  // Get upcoming exams from courses
  const upcomingExams = courses
    .flatMap((c) =>
      (c.grades || [])
        .filter((g) => g.date)
        .map((g) => ({
          course: c,
          exam: g,
          date: g.date!,
        }))
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  // Get upcoming tasks
  const upcomingTasks = tasks
    .filter((t) => t.status !== 'done' && t.dueDate)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateCalendarId(tempId.trim());
    setIsConfigOpen(false);
  };

  // Helper to open Google Calendar quick add event
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

  return (
    <div className="space-y-6">
      {/* Top Banner / Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-[#202020] p-4 rounded-xl border border-[#e9e9e8] dark:border-[#2f2f2f] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-lg">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold text-base text-[#37352f] dark:text-[#f3f3f2] flex items-center gap-2">
              Google Calendar Integrado
              {cleanCalendarId && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-medium">
                  Conectado
                </span>
              )}
            </h2>
            <p className="text-xs text-[#787774] dark:text-[#9b9a97]">
              Visualize e gerencie suas aulas, provas e compromissos diretamente no calendário do Google
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              setTempId(calendarId);
              setIsConfigOpen(true);
            }}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#e9e9e8] dark:border-[#333] hover:bg-stone-50 dark:hover:bg-stone-800 transition-all text-[#37352f] dark:text-white"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Configurar Agenda</span>
          </button>

          <a
            href="https://calendar.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg shadow-sm transition-all"
          >
            <span>Abrir no Google</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Calendar View (3 cols) */}
        <div className="lg:col-span-3 space-y-3">
          {cleanCalendarId ? (
            <div className="bg-white dark:bg-[#202020] rounded-2xl border border-[#e9e9e8] dark:border-[#2f2f2f] shadow-sm overflow-hidden flex flex-col">
              {/* Calendar sub-header */}
              <div className="px-4 py-3 border-b border-[#e9e9e8] dark:border-[#2f2f2f] flex items-center justify-between bg-[#fcfbf9] dark:bg-[#252525]">
                <div className="flex items-center gap-1 bg-[#efeeea] dark:bg-[#1e1e1e] p-1 rounded-lg text-xs">
                  <button
                    onClick={() => setCalendarView('MONTH')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      calendarView === 'MONTH'
                        ? 'bg-white dark:bg-[#2a2a2a] text-[#37352f] dark:text-white shadow-sm'
                        : 'text-[#787774] dark:text-[#9b9a97]'
                    }`}
                  >
                    Mês
                  </button>
                  <button
                    onClick={() => setCalendarView('WEEK')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      calendarView === 'WEEK'
                        ? 'bg-white dark:bg-[#2a2a2a] text-[#37352f] dark:text-white shadow-sm'
                        : 'text-[#787774] dark:text-[#9b9a97]'
                    }`}
                  >
                    Semana
                  </button>
                  <button
                    onClick={() => setCalendarView('AGENDA')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      calendarView === 'AGENDA'
                        ? 'bg-white dark:bg-[#2a2a2a] text-[#37352f] dark:text-white shadow-sm'
                        : 'text-[#787774] dark:text-[#9b9a97]'
                    }`}
                  >
                    Agenda
                  </button>
                </div>

                <a
                  href={`https://calendar.google.com/calendar/u/0/r`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novo Evento</span>
                </a>
              </div>

              {/* Responsive Iframe Container */}
              <div className="relative w-full h-[620px] bg-white">
                <iframe
                  title="Google Calendar"
                  src={embedUrl}
                  className="w-full h-full border-0"
                  style={{ filter: darkMode ? 'invert(90%) hue-rotate(180deg)' : 'none' }}
                />
              </div>
            </div>
          ) : (
            /* Setup Prompt if Calendar ID is not set yet */
            <div className="bg-white dark:bg-[#202020] rounded-2xl border border-dashed border-[#e9e9e8] dark:border-[#333] p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto">
                <CalendarDays className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="font-semibold text-lg text-[#37352f] dark:text-[#f3f3f2]">
                  Conecte seu Google Calendar
                </h3>
                <p className="text-xs text-[#787774] dark:text-[#9b9a97]">
                  Insira o seu e-mail do Gmail ou o ID da sua agenda do Google para embutir o calendário completo aqui com suas aulas e eventos.
                </p>
              </div>

              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={() => setIsConfigOpen(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-sm transition-all flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Configurar ID da Agenda</span>
                </button>
              </div>

              <div className="text-[11px] text-[#9b9a97] max-w-sm mx-auto pt-2">
                Dica: O ID padrão é simplesmente o seu próprio endereço de e-mail (ex: <code>seunome@gmail.com</code>). Certifique-se de que a agenda esteja com permissão de visualização.
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Upcoming Academic Deadlines (1 col) */}
        <div className="space-y-4">
          {/* Upcoming Exams card */}
          <div className="bg-white dark:bg-[#202020] rounded-xl border border-[#e9e9e8] dark:border-[#2f2f2f] p-4 space-y-3 shadow-sm">
            <h3 className="font-semibold text-xs text-[#787774] dark:text-[#9b9a97] uppercase tracking-wider flex items-center justify-between">
              <span>Provas Agendadas</span>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">
                {upcomingExams.length}
              </span>
            </h3>

            {upcomingExams.length > 0 ? (
              <div className="space-y-2.5">
                {upcomingExams.slice(0, 5).map(({ course, exam, date }) => (
                  <div
                    key={exam.id}
                    className="p-2.5 rounded-lg border border-[#f0f0ee] dark:border-[#2a2a2a] bg-[#faf9f6] dark:bg-[#252525] space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold"
                        style={{ backgroundColor: `${course.color}20`, color: course.color }}
                      >
                        {course.code}
                      </span>
                      <span className="text-[11px] font-medium text-stone-500">{date}</span>
                    </div>

                    <div className="font-medium text-xs text-[#37352f] dark:text-[#f3f3f2]">
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
                      className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline pt-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Adicionar ao Google Calendar</span>
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-[#9b9a97]">
                Nenhuma data de prova cadastrada nas disciplinas.
              </div>
            )}
          </div>

          {/* Upcoming Tasks card */}
          <div className="bg-white dark:bg-[#202020] rounded-xl border border-[#e9e9e8] dark:border-[#2f2f2f] p-4 space-y-3 shadow-sm">
            <h3 className="font-semibold text-xs text-[#787774] dark:text-[#9b9a97] uppercase tracking-wider flex items-center justify-between">
              <span>Prazos de Tarefas</span>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                {upcomingTasks.length}
              </span>
            </h3>

            {upcomingTasks.length > 0 ? (
              <div className="space-y-2">
                {upcomingTasks.slice(0, 5).map((t) => {
                  const course = courses.find((c) => c.id === t.courseId);
                  return (
                    <div
                      key={t.id}
                      className="p-2.5 rounded-lg border border-[#f0f0ee] dark:border-[#2a2a2a] bg-[#faf9f6] dark:bg-[#252525] space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[10px] font-medium text-[#9b9a97]">
                          {course ? course.code : 'Geral'}
                        </span>
                        <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                          {t.dueDate}
                        </span>
                      </div>
                      <div className="font-medium text-xs text-[#37352f] dark:text-[#f3f3f2] truncate">
                        {t.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-[#9b9a97]">
                Nenhuma tarefa pendente com prazo.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Configuration Modal */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#202020] rounded-xl border border-[#e9e9e8] dark:border-[#2f2f2f] w-full max-w-md shadow-2xl p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-base text-[#37352f] dark:text-[#f3f3f2]">
                Conectar Agenda do Google
              </h3>
              <p className="text-xs text-[#787774] dark:text-[#9b9a97] mt-1">
                Insira o seu e-mail do Google (ex: <code>seuemail@gmail.com</code>) ou o ID de compartilhamento de qualquer agenda do Google Calendar.
              </p>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#787774] dark:text-[#9b9a97] mb-1">
                  E-mail do Google / ID da Agenda
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: estudante@gmail.com"
                  value={tempId}
                  onChange={(e) => setTempId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="text-[11px] text-[#787774] dark:text-[#9b9a97] space-y-1 bg-[#f7f6f3] dark:bg-[#252525] p-3 rounded-lg">
                <p className="font-medium">Como liberar a visualização no Google Calendar:</p>
                <ol className="list-decimal list-inside space-y-0.5 text-[10px]">
                  <li>Acesse o Google Calendar no navegador.</li>
                  <li>Clique nos 3 pontos ao lado da sua agenda → <b>Configurações e compartilhamento</b>.</li>
                  <li>Em <b>Permissões de acesso</b>, marque <i>"Disponibilizar para o público"</i> (ou acesse com a mesma conta logada no navegador).</li>
                </ol>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfigOpen(false)}
                  className="px-3.5 py-2 border border-[#e9e9e8] dark:border-[#333] rounded-lg text-xs font-medium hover:bg-stone-50 dark:hover:bg-stone-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-sm"
                >
                  Salvar Agenda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
