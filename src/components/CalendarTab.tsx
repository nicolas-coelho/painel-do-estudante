import React, { useState, useEffect } from 'react';
import { Course, Task } from '../types';
import { formatDateBR } from '../dateUtils';
import {
  connectGoogleCalendarApi,
  fetchGoogleCalendarEvents,
  createGoogleCalendarEventDirect,
  getSavedCalendarToken,
  removeCalendarToken,
  getSavedCalendarIcal,
  saveCalendarIcal,
  removeCalendarIcal,
  fetchPermanentCalendarEvents,
  GoogleCalendarEvent,
} from '../googleCalendar';
import { getClassesForDayOfWeek, getEventDateStr, getEventTimeStr } from '../calendarUtils';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  Clock,
  Video,
  MapPin,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  CalendarDays,
  X,
  Trash2,
  Link2,
  Settings,
} from 'lucide-react';

interface CalendarTabProps {
  courses: Course[];
  tasks: Task[];
  darkMode: boolean;
  calendarId?: string;
  onUpdateCalendarId?: (id: string) => void;
}

export const CalendarTab: React.FC<CalendarTabProps> = ({
  courses,
  tasks,
  calendarId,
  onUpdateCalendarId,
}) => {
  const [token, setToken] = useState<string | null>(() => getSavedCalendarToken());
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal para conexão permanente via iCal
  const [isPermanentModalOpen, setIsPermanentModalOpen] = useState(false);
  const [icalInput, setIcalInput] = useState(() => getSavedCalendarIcal() || '');
  const [savedIcal, setSavedIcal] = useState<string | null>(() => getSavedCalendarIcal());

  // Calendar date navigation
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<'month' | 'agenda' | 'official'>('month');

  // Modal new event state
  const [isNewEventModalOpen, setIsNewEventModalOpen] = useState(false);
  const [eventSummary, setEventSummary] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [eventStartTime, setEventStartTime] = useState('10:00');
  const [eventEndTime, setEventEndTime] = useState('11:00');
  const [eventDescription, setEventDescription] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);

  // Carrega eventos: primeiro tenta OAuth (se houver token válido), senão carrega feed permanente!
  const loadEvents = async (authToken?: string | null, targetDate?: Date) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const d = targetDate || currentDate;
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0).toISOString();
      const endWindow = new Date(d.getFullYear() + 1, d.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const events = await fetchGoogleCalendarEvents(authToken, startOfMonth, endWindow, calendarId);
      setGoogleEvents(events);
    } catch (err: any) {
      // Se falhar a chamada OAuth, tenta resgatar eventos do feed permanente
      const fallbackEvents = await fetchPermanentCalendarEvents(calendarId);
      if (fallbackEvents.length > 0) {
        setGoogleEvents(fallbackEvents);
      } else {
        setErrorMsg(err.message || 'Erro ao carregar eventos da API');
      }
      if (err.message?.includes('expirada') || err.message?.includes('SESSION_EXPIRED')) {
        setToken(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Sempre carrega na inicialização automaticamente sem pedir popup!
    loadEvents(token, currentDate);
  }, [token, calendarId, savedIcal]);

  const handleConnectApi = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { token: newToken } = await connectGoogleCalendarApi();
      setToken(newToken);
      setSuccessMsg('Google Calendar conectado via API oficial com sucesso!');
      await loadEvents(newToken, currentDate);
    } catch (err: any) {
      setErrorMsg(err.message || 'Não foi possível autorizar o Google Calendar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    removeCalendarToken();
    setToken(null);
    setGoogleEvents([]);
    setSuccessMsg('Desconectado do Google Calendar');
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !eventSummary.trim()) return;

    setIsCreatingEvent(true);
    setErrorMsg(null);
    try {
      await createGoogleCalendarEventDirect(token, {
        summary: eventSummary.trim(),
        startDate: eventDate,
        startTime: eventStartTime,
        endTime: eventEndTime,
        description: eventDescription,
        location: eventLocation,
      });

      setSuccessMsg('Evento adicionado diretamente no seu Google Calendar!');
      setIsNewEventModalOpen(false);
      setEventSummary('');
      setEventDescription('');
      setEventLocation('');
      await loadEvents(token);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao criar evento');
    } finally {
      setIsCreatingEvent(false);
    }
  };

  // Enviar uma prova do painel diretamente para a API do Google Calendar
  const handleAddExamToGoogle = async (course: Course, exam: any) => {
    if (!token) {
      handleConnectApi();
      return;
    }
    try {
      setIsLoading(true);
      await createGoogleCalendarEventDirect(token, {
        summary: `[${course.code}] ${exam.name}`,
        startDate: exam.date,
        description: `Prova de ${course.name} (${course.code}). Local: ${course.roomOrLink || 'A definir'}`,
        location: course.roomOrLink || undefined,
      });
      setSuccessMsg(`Prova "${exam.name}" adicionada à sua agenda do Google!`);
      await loadEvents(token);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao adicionar prova no Google Calendar');
    } finally {
      setIsLoading(false);
    }
  };

  // Calendar calculations (Month Grid)
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    const newD = new Date(year, month - 1, 1);
    setCurrentDate(newD);
    if (token) loadEvents(token, newD);
  };
  const nextMonth = () => {
    const newD = new Date(year, month + 1, 1);
    setCurrentDate(newD);
    if (token) loadEvents(token, newD);
  };
  const today = () => {
    const newD = new Date();
    setCurrentDate(newD);
    if (token) loadEvents(token, newD);
  };

  // Provas das matérias
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

  // Tarefas com prazo
  const upcomingTasks = tasks
    .filter((t) => t.status !== 'done' && t.dueDate)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  // Helper seguro para converter eventos do Google Calendar para YYYY-MM-DD no fuso LOCAL
  const getEventDateStr = (ev: GoogleCalendarEvent): string => {
    if (!ev || !ev.start) return '';
    if (ev.start.date) return ev.start.date;
    if (ev.start.dateTime) {
      const d = new Date(ev.start.dateTime);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      }
    }
    return '';
  };

  const getEventTimeStr = (ev: GoogleCalendarEvent): string => {
    if (!ev || !ev.start?.dateTime) return '';
    const d = new Date(ev.start.dateTime);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  // Total de eventos no mês atualmente visualizado
  const currentMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const eventsInCurrentMonth = googleEvents.filter((ev) =>
    getEventDateStr(ev).startsWith(currentMonthStr)
  );

  // Map events by date (YYYY-MM-DD)
  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateObj = new Date(year, month, day);
    const dayOfWeek = dateObj.getDay();

    // Aulas da semana (com base no horário das disciplinas)
    const classes = getClassesForDayOfWeek(courses, dayOfWeek);

    // Google API events com proteção contra undefined e fuso horário correto
    const gEvts = googleEvents.filter((ev) => getEventDateStr(ev) === dateStr);

    // Provas
    const exams = upcomingExams.filter((ex) => ex.date === dateStr);

    // Tarefas
    const t = upcomingTasks.filter((tk) => tk.dueDate === dateStr);

    return { classes, gEvts, exams, tasks: t, dateStr };
  };

  const handleSavePermanentIcal = (e: React.FormEvent) => {
    e.preventDefault();
    if (icalInput.trim()) {
      saveCalendarIcal(icalInput.trim());
      setSavedIcal(icalInput.trim());
      setSuccessMsg('Conexão permanente configurada com sucesso! Seus eventos atualizarão continuamente sem precisar de login repetido.');
      setIsPermanentModalOpen(false);
      loadEvents(token, currentDate);
    }
  };

  const handleRemovePermanentIcal = () => {
    removeCalendarIcal();
    setSavedIcal(null);
    setIcalInput('');
    setSuccessMsg('Conexão permanente removida.');
    setIsPermanentModalOpen(false);
    loadEvents(token, currentDate);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / API Status */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-[#202020] p-4 rounded-xl border border-[#e9e9e8] dark:border-[#2f2f2f] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-lg">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-base text-[#37352f] dark:text-[#f3f3f2]">
                Google Calendar
              </h2>
              {token ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  API OAuth Ativa
                </span>
              ) : savedIcal || googleEvents.length > 0 ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  Sincronização Permanente Ativa
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-medium">
                  Modo Agenda Integrada
                </span>
              )}
            </div>
            <p className="text-xs text-[#787774] dark:text-[#9b9a97]">
              {token
                ? `${googleEvents.length} eventos carregados da sua agenda oficial via API`
                : savedIcal
                ? `${googleEvents.length} eventos sincronizados permanentemente sem precisar de login`
                : googleEvents.length > 0
                ? `${googleEvents.length} eventos carregados automaticamente da sua agenda`
                : 'Conecte sua conta ou configure o feed permanente para sincronizar seus compromissos sem expirar'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsPermanentModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#e9e9e8] dark:border-[#333] hover:bg-stone-50 dark:hover:bg-stone-800 rounded-lg text-xs font-medium text-[#37352f] dark:text-white transition-all shadow-xs"
            title="Configurar conexão permanente sem precisar autenticar toda hora"
          >
            <Link2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>{savedIcal ? 'Configuração Permanente ✓' : 'Conexão Permanente (iCal)'}</span>
          </button>

          {token ? (
            <>
              <button
                onClick={() => loadEvents(token, currentDate)}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-[#e9e9e8] dark:border-[#333] hover:bg-stone-50 dark:hover:bg-stone-800 rounded-lg text-xs font-medium text-[#37352f] dark:text-white transition-all"
                title="Sincronizar eventos agora"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Atualizar</span>
              </button>
              <button
                onClick={() => setIsNewEventModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Evento</span>
              </button>
              <button
                onClick={handleDisconnect}
                className="px-2.5 py-1.5 text-xs text-stone-400 hover:text-red-500 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-all"
                title="Desconectar da API do Google"
              >
                Desconectar
              </button>
            </>
          ) : (
            <button
              onClick={handleConnectApi}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-xl shadow-sm transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isLoading ? 'Conectando...' : 'Conectar via Google (OAuth)'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 rounded-lg border border-emerald-200 dark:border-emerald-900/40 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 rounded-xl border border-amber-200 dark:border-amber-900/50 text-xs space-y-3 shadow-xs">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm text-[#37352f] dark:text-[#f3f3f2]">
                  {errorMsg.includes('API_NOT_ENABLED')
                    ? 'A API do Google Calendar precisa ser ativada no Google Cloud'
                    : errorMsg.includes('UNAUTHORIZED_DOMAIN')
                    ? 'Domínio da Vercel não autorizado no Firebase Auth'
                    : errorMsg.includes('SESSION_EXPIRED')
                    ? 'Sessão do Google Calendar expirada'
                    : 'Aviso sobre a API do Google Calendar'}
                </h4>
                <p className="text-xs text-[#787774] dark:text-[#9b9a97] mt-1 leading-relaxed">
                  {errorMsg.replace(/^(API_NOT_ENABLED|UNAUTHORIZED_DOMAIN|SESSION_EXPIRED|POPUP_BLOCKED|OPERATION_NOT_ALLOWED):\s*/, '')}
                </p>
              </div>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-stone-400 hover:text-stone-600 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 pt-1 flex-wrap">
            {errorMsg.includes('API_NOT_ENABLED') && (
              <a
                href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com?project=painel-estudante-8b2c"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
              >
                <span>Ativar Google Calendar API no Google Cloud ↗</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            {errorMsg.includes('UNAUTHORIZED_DOMAIN') && (
              <a
                href="https://console.firebase.google.com/project/painel-estudante-8b2c/authentication/settings"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
              >
                <span>Autorizar Domínio no Firebase ↗</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            {errorMsg.includes('SESSION_EXPIRED') && (
              <button
                onClick={handleConnectApi}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reconectar Conta Google</span>
              </button>
            )}

            <button
              onClick={() => {
                setCalendarView('official');
                setErrorMsg(null);
              }}
              className="px-3 py-1.5 border border-[#e9e9e8] dark:border-[#444] bg-white dark:bg-[#202020] hover:bg-stone-50 dark:hover:bg-stone-800 text-[#37352f] dark:text-white rounded-lg text-xs font-medium transition-all"
            >
              Ver no Modo Google Oficial (Embed Iframe)
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Native Calendar (3 cols) + Academic Sidebar (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white dark:bg-[#202020] rounded-2xl border border-[#e9e9e8] dark:border-[#2f2f2f] shadow-sm overflow-hidden flex flex-col">
            {/* Calendar Controls & Month Switcher */}
            <div className="p-4 border-b border-[#e9e9e8] dark:border-[#2f2f2f] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#fcfbf9] dark:bg-[#252525]">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base md:text-lg capitalize text-[#37352f] dark:text-[#f3f3f2]">
                  {monthName}
                </h3>
                <div className="flex items-center gap-1 border border-[#e9e9e8] dark:border-[#333] rounded-lg p-0.5 bg-white dark:bg-[#1e1e1e]">
                  <button onClick={prevMonth} className="p-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={today} className="px-2 py-0.5 text-xs font-medium hover:bg-stone-100 dark:hover:bg-stone-800 rounded">
                    Hoje
                  </button>
                  <button onClick={nextMonth} className="p-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1 bg-[#efeeea] dark:bg-[#1e1e1e] p-1 rounded-lg">
                  <button
                    onClick={() => setCalendarView('month')}
                    className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                      calendarView === 'month'
                        ? 'bg-white dark:bg-[#2a2a2a] text-[#37352f] dark:text-white shadow-sm'
                        : 'text-[#787774] dark:text-[#9b9a97]'
                    }`}
                  >
                    Grade Mensal
                  </button>
                  <button
                    onClick={() => setCalendarView('agenda')}
                    className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                      calendarView === 'agenda'
                        ? 'bg-white dark:bg-[#2a2a2a] text-[#37352f] dark:text-white shadow-sm'
                        : 'text-[#787774] dark:text-[#9b9a97]'
                    }`}
                  >
                    Lista de Eventos ({googleEvents.length})
                  </button>
                  <button
                    onClick={() => setCalendarView('official')}
                    className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                      calendarView === 'official'
                        ? 'bg-white dark:bg-[#2a2a2a] text-[#37352f] dark:text-white shadow-sm'
                        : 'text-[#787774] dark:text-[#9b9a97]'
                    }`}
                    title="Ver no Google Calendar oficial integrado"
                  >
                    Google Oficial
                  </button>
                </div>

                <a
                  href="https://calendar.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-stone-400 hover:text-blue-600 transition-colors"
                  title="Abrir no Google Calendar oficial"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* MONTH VIEW: Native Responsive Grid */}
            {calendarView === 'month' && (
              <div className="p-3">
                {/* Banner de aviso se houver eventos em outro mês */}
                {googleEvents.length > 0 && eventsInCurrentMonth.length === 0 && (
                  <div className="mb-3 p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-xs text-blue-800 dark:text-blue-300 flex items-center justify-between gap-2">
                    <span>
                      ℹ️ Você tem <b>{googleEvents.length} eventos</b> na sua agenda do Google em outros meses.
                    </span>
                    <button
                      onClick={() => {
                        const firstWithDate = googleEvents.find((e) => getEventDateStr(e));
                        if (firstWithDate) {
                          const dStr = getEventDateStr(firstWithDate);
                          const [y, m] = dStr.split('-').map(Number);
                          setCurrentDate(new Date(y, m - 1, 1));
                        }
                      }}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[11px] font-medium shrink-0 cursor-pointer shadow-xs transition-colors"
                    >
                      Ir para o mês com eventos
                    </button>
                  </div>
                )}

                {/* Days of week header */}
                <div className="grid grid-cols-7 gap-1 text-center font-semibold text-[11px] text-[#9b9a97] uppercase tracking-wider pb-2 border-b border-[#f0f0ee] dark:border-[#2a2a2a]">
                  <div>Dom</div>
                  <div>Seg</div>
                  <div>Ter</div>
                  <div>Qua</div>
                  <div>Qui</div>
                  <div>Sex</div>
                  <div>Sáb</div>
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1 pt-2">
                  {/* Empty slots before first day of month */}
                  {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                    <div key={`empty-${i}`} className="min-h-[85px] p-1.5 rounded-lg bg-stone-50/50 dark:bg-[#1c1c1c]/30" />
                  ))}

                  {/* Days in Month */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const { classes, gEvts, exams, tasks: dayTasks, dateStr } = getEventsForDay(dayNum);
                    const isToday =
                      new Date().toISOString().split('T')[0] === dateStr;

                    return (
                      <div
                        key={`day-${dayNum}`}
                        onClick={() => {
                          setEventDate(dateStr);
                          setIsNewEventModalOpen(true);
                        }}
                        className={`min-h-[95px] p-1.5 rounded-xl border flex flex-col justify-between transition-all cursor-pointer ${
                          isToday
                            ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/10'
                            : 'border-[#f0f0ee] dark:border-[#2a2a2a] bg-white dark:bg-[#1e1e1e] hover:border-blue-300 dark:hover:border-blue-700'
                        }`}
                        title="Clique para adicionar um evento neste dia"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`w-5 h-5 flex items-center justify-center rounded-full text-xs font-semibold ${
                              isToday
                                ? 'bg-blue-600 text-white'
                                : 'text-[#37352f] dark:text-[#f3f3f2]'
                            }`}
                          >
                            {dayNum}
                          </span>
                        </div>

                        {/* Events list inside cell */}
                        <div className="space-y-1 overflow-y-auto max-h-[70px] text-[10px]">
                          {/* Aulas da semana */}
                          {classes.map((cls, idx) => (
                            <div
                              key={`cls-${cls.course.id}-${idx}`}
                              className="px-1.5 py-0.5 rounded font-medium text-white truncate shadow-xs flex items-center gap-1"
                              style={{ backgroundColor: cls.course.color }}
                              title={`Aula: ${cls.course.name} (${cls.course.code}) - ${cls.time} - ${cls.room}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span>🎓</span>
                              <span className="truncate">{cls.course.code}</span>
                            </div>
                          ))}

                          {/* Provas */}
                          {exams.map((ex) => (
                            <div
                              key={ex.exam.id}
                              className="px-1.5 py-0.5 rounded font-medium text-white truncate shadow-xs"
                              style={{ backgroundColor: ex.course.color }}
                              title={`Prova: ${ex.exam.name} (${ex.course.name})`}
                            >
                              📝 {ex.exam.name}
                            </div>
                          ))}

                          {/* Tarefas */}
                          {dayTasks.map((tk) => (
                            <div
                              key={tk.id}
                              className="px-1.5 py-0.5 rounded font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 truncate"
                              title={`Tarefa: ${tk.name}`}
                            >
                              📌 {tk.name}
                            </div>
                          ))}

                          {/* Eventos Google API */}
                          {gEvts.map((ge) => {
                            const time = getEventTimeStr(ge);
                            return (
                              <div
                                key={ge.id}
                                className="px-1.5 py-0.5 rounded font-medium bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 truncate hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors"
                                title={`${time ? `${time} - ` : ''}${ge.summary}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (ge.htmlLink) window.open(ge.htmlLink, '_blank');
                                }}
                              >
                                🗓️ {time ? <span className="font-semibold">{time} </span> : null}{ge.summary}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AGENDA VIEW: List of events */}
            {calendarView === 'agenda' && (
              <div className="divide-y divide-[#f0f0ee] dark:divide-[#2a2a2a] p-4 space-y-3">
                {googleEvents.length > 0 ? (
                  googleEvents.map((evt) => {
                    const startStr = evt.start?.dateTime
                      ? new Date(evt.start.dateTime).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                      : evt.start?.date;
                    return (
                      <div key={evt.id} className="pt-3 pb-2 flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <h4 className="font-semibold text-sm text-[#37352f] dark:text-[#f3f3f2]">
                            {evt.summary}
                          </h4>
                          <div className="flex items-center gap-3 text-xs text-[#787774] dark:text-[#9b9a97]">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {startStr}
                            </span>
                            {evt.location && (
                              <span className="flex items-center gap-1 truncate max-w-xs">
                                <MapPin className="w-3.5 h-3.5" />
                                {evt.location}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              const dStr = getEventDateStr(evt);
                              if (dStr) {
                                const [y, m] = dStr.split('-').map(Number);
                                setCurrentDate(new Date(y, m - 1, 1));
                                setCalendarView('month');
                              }
                            }}
                            className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-[#37352f] dark:text-[#ececed] rounded-lg text-xs font-medium flex items-center gap-1 transition-all cursor-pointer"
                            title="Ver este evento na Grade Mensal"
                          >
                            <CalendarIcon className="w-3.5 h-3.5" />
                            <span>Ver na Grade</span>
                          </button>

                          {evt.hangoutLink && (
                            <a
                              href={evt.hangoutLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shrink-0"
                            >
                              <Video className="w-3.5 h-3.5" />
                              <span>Meet</span>
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-xs text-[#9b9a97] space-y-2">
                    <CalendarDays className="w-8 h-8 mx-auto opacity-40" />
                    <p>Nenhum evento retornado da API do Google Calendar.</p>
                  </div>
                )}
              </div>
            )}

            {/* OFFICIAL VIEW: Google Calendar Embed */}
            {calendarView === 'official' && (
              <div className="p-3 w-full flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs px-3 py-2 bg-[#fcfbf9] dark:bg-[#252525] rounded-lg border border-[#e9e9e8] dark:border-[#2f2f2f]">
                  <span className="text-[#787774] dark:text-[#9b9a97]">
                    Exibindo agenda pública/embutida de: <b className="text-[#37352f] dark:text-[#f3f3f2]">{calendarId || 'nicolasplcoelho@gmail.com'}</b>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const newId = prompt('Insira o seu e-mail do Gmail ou ID da Agenda Google:', calendarId || 'nicolasplcoelho@gmail.com');
                      if (newId && onUpdateCalendarId) {
                        onUpdateCalendarId(newId.trim());
                      }
                    }}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    Alterar e-mail da agenda
                  </button>
                </div>
                <div className="w-full h-[650px]">
                  <iframe
                    src={`https://calendar.google.com/calendar/embed?src=${encodeURIComponent(
                      calendarId || 'nicolasplcoelho@gmail.com'
                    )}&ctz=America%2FSao_Paulo&mode=MONTH&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=1&showCalendars=0&showTz=0`}
                    style={{ border: 0 }}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    title="Google Calendar Oficial"
                    className="rounded-xl border border-[#e9e9e8] dark:border-[#2f2f2f] w-full h-full"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Provas Acadêmicas & Prazos */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#202020] rounded-xl border border-[#e9e9e8] dark:border-[#2f2f2f] p-4 space-y-3 shadow-sm">
            <h3 className="font-semibold text-xs text-[#787774] dark:text-[#9b9a97] uppercase tracking-wider flex items-center justify-between">
              <span>Provas Agendadas</span>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">
                {upcomingExams.length}
              </span>
            </h3>

            {upcomingExams.length > 0 ? (
              <div className="space-y-2.5">
                {upcomingExams.map(({ course, exam, date }) => (
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
                      <span className="text-[11px] font-medium text-stone-500">{formatDateBR(date)}</span>
                    </div>

                    <div className="font-medium text-xs text-[#37352f] dark:text-[#f3f3f2]">
                      {exam.name}
                    </div>

                    <button
                      onClick={() => handleAddExamToGoogle(course, exam)}
                      className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline pt-1 font-medium"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{token ? 'Adicionar à Agenda Google' : 'Conectar Google p/ Salvar'}</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-[#9b9a97]">
                Nenhuma prova agendada nas disciplinas.
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-[#202020] rounded-xl border border-[#e9e9e8] dark:border-[#2f2f2f] p-4 space-y-3 shadow-sm">
            <h3 className="font-semibold text-xs text-[#787774] dark:text-[#9b9a97] uppercase tracking-wider flex items-center justify-between">
              <span>Prazos de Tarefas</span>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                {upcomingTasks.length}
              </span>
            </h3>

            {upcomingTasks.length > 0 ? (
              <div className="space-y-2">
                {upcomingTasks.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    className="p-2.5 rounded-lg border border-[#f0f0ee] dark:border-[#2a2a2a] bg-[#faf9f6] dark:bg-[#252525] space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[10px] font-medium text-[#9b9a97]">
                        {courses.find((c) => c.id === t.courseId)?.code || 'Geral'}
                      </span>
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                        {formatDateBR(t.dueDate)}
                      </span>
                    </div>
                    <div className="font-medium text-xs text-[#37352f] dark:text-[#f3f3f2] truncate">
                      {t.name}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-[#9b9a97]">
                Nenhuma tarefa pendente com prazo.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Adicionar Evento na API do Google Calendar */}
      {isNewEventModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#202020] rounded-2xl border border-[#e9e9e8] dark:border-[#2f2f2f] w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base text-[#37352f] dark:text-[#f3f3f2]">
                Novo Evento no Google Calendar
              </h3>
              <button onClick={() => setIsNewEventModalOpen(false)} className="p-1 text-stone-400 hover:text-stone-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3 text-xs md:text-sm">
              <div>
                <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Título do Evento *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Aula de Revisão / Apresentação de TCC"
                  value={eventSummary}
                  onChange={(e) => setEventSummary(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Data</label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent"
                  />
                </div>
                <div>
                  <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Início</label>
                  <input
                    type="time"
                    value={eventStartTime}
                    onChange={(e) => setEventStartTime(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent"
                  />
                </div>
                <div>
                  <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Fim</label>
                  <input
                    type="time"
                    value={eventEndTime}
                    onChange={(e) => setEventEndTime(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Local ou Link</label>
                <input
                  type="text"
                  placeholder="Ex: Auditório ou link do Meet"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Descrição / Observações</label>
                <textarea
                  rows={2}
                  placeholder="Anotações para a agenda..."
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewEventModalOpen(false)}
                  className="px-3.5 py-2 border border-[#e9e9e8] dark:border-[#333] rounded-lg text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingEvent}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-sm transition-all disabled:opacity-50"
                >
                  {isCreatingEvent ? 'Gravando no Google...' : 'Gravar no Google Calendar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Conexão Permanente via iCal (Sem exigir login) */}
      {isPermanentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#202020] rounded-2xl border border-[#e9e9e8] dark:border-[#2f2f2f] w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-lg">
                  <Link2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-[#37352f] dark:text-[#f3f3f2]">
                    Conexão Permanente (Nunca Expira)
                  </h3>
                  <p className="text-xs text-[#787774] dark:text-[#9b9a97]">
                    Sincronize sua agenda 24/7 sem precisar fazer login ou autorizar pop-ups repetidamente.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPermanentModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200/60 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200 space-y-2">
              <div className="font-semibold flex items-center gap-1.5">
                <span>📍 Como obter o Endereço Secreto no Google Calendar:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-[#4b5563] dark:text-[#9ca3af]">
                <li>Abra o <b>Google Calendar</b> no navegador do computador.</li>
                <li>Na barra lateral esquerda, passe o mouse sobre sua agenda e clique nos <b>3 pontinhos (⋮)</b> &gt; <b>Configurações e compartilhamento</b>.</li>
                <li>Role a página até a seção <b>"Integrar agenda"</b>.</li>
                <li>Copie o link do campo <b>"Endereço secreto no formato iCal"</b> (termina com <code className="font-mono">.ics</code>).</li>
              </ol>
            </div>

            <form onSubmit={handleSavePermanentIcal} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">
                  Endereço secreto no formato iCal (.ics) do Google Calendar
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
                  value={icalInput}
                  onChange={(e) => setIcalInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                {savedIcal ? (
                  <button
                    type="button"
                    onClick={handleRemovePermanentIcal}
                    className="px-3 py-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg text-xs font-medium transition-all"
                  >
                    Desvincular Feed
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPermanentModalOpen(false)}
                    className="px-3.5 py-2 border border-[#e9e9e8] dark:border-[#333] rounded-lg text-xs font-medium hover:bg-stone-50 dark:hover:bg-stone-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-sm transition-all"
                  >
                    Salvar Conexão Permanente
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
