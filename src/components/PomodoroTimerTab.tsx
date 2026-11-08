import React, { useState, useEffect, useRef } from 'react';
import { StudySession, Course, ReviewResult } from '../types';
import { useNotification } from '../context/NotificationContext';
import {
  Play,
  Pause,
  RotateCcw,
  Clock,
  CheckCircle,
  Plus,
  Calendar,
  Trash2,
  Settings2,
  Sparkles,
  ArrowRight,
  Coffee,
  Brain,
  Check,
} from 'lucide-react';

interface PomodoroTimerTabProps {
  sessions: StudySession[];
  courses: Course[];
  onAddSession: (s: StudySession) => void;
  onDeleteSession: (id: string) => void;
}

export const PomodoroTimerTab: React.FC<PomodoroTimerTabProps> = ({
  sessions,
  courses,
  onAddSession,
  onDeleteSession,
}) => {
  const { showToast, showConfirm } = useNotification();

  // Configurações de duração personalizáveis (com persistência no localStorage)
  const [focusMinutes, setFocusMinutes] = useState<number>(() => {
    const saved = localStorage.getItem('pomodoro_focus_mins');
    return saved ? parseInt(saved, 10) : 25;
  });

  const [shortBreakMinutes, setShortBreakMinutes] = useState<number>(() => {
    const saved = localStorage.getItem('pomodoro_short_break_mins');
    return saved ? parseInt(saved, 10) : 5;
  });

  const [longBreakMinutes, setLongBreakMinutes] = useState<number>(() => {
    const saved = localStorage.getItem('pomodoro_long_break_mins');
    return saved ? parseInt(saved, 10) : 15;
  });

  // Modal para ajuste de minutos
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Modo ativo do timer
  const [mode, setMode] = useState<'pomodoro' | 'short_break' | 'long_break'>('pomodoro');
  const [timeLeft, setTimeLeft] = useState(focusMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);

  // Registro de horários exatos de início e término
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Detalhes da sessão
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || '');
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionResult, setSessionResult] = useState<ReviewResult>('Estudo');

  // Modal para adicionar sessão manual
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualCourseId, setManualCourseId] = useState(courses[0]?.id || '');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualStartTime, setManualStartTime] = useState('14:00');
  const [manualEndTime, setManualEndTime] = useState('14:45');
  const [manualDuration, setManualDuration] = useState('45');
  const [manualNotes, setManualNotes] = useState('');
  const [manualResult, setManualResult] = useState<ReviewResult>('Estudo');

  // Atualiza duração quando o modo ou os minutos configurados mudam
  useEffect(() => {
    if (!isRunning) {
      if (mode === 'pomodoro') setTimeLeft(focusMinutes * 60);
      else if (mode === 'short_break') setTimeLeft(shortBreakMinutes * 60);
      else if (mode === 'long_break') setTimeLeft(longBreakMinutes * 60);
    }
  }, [mode, focusMinutes, shortBreakMinutes, longBreakMinutes]);

  // Salva preferências no localStorage
  const handleSaveSettings = (f: number, sb: number, lb: number) => {
    const validF = Math.max(1, Math.min(180, f));
    const validSb = Math.max(1, Math.min(60, sb));
    const validLb = Math.max(1, Math.min(90, lb));

    setFocusMinutes(validF);
    setShortBreakMinutes(validSb);
    setLongBreakMinutes(validLb);

    localStorage.setItem('pomodoro_focus_mins', String(validF));
    localStorage.setItem('pomodoro_short_break_mins', String(validSb));
    localStorage.setItem('pomodoro_long_break_mins', String(validLb));

    if (!isRunning) {
      if (mode === 'pomodoro') setTimeLeft(validF * 60);
      else if (mode === 'short_break') setTimeLeft(validSb * 60);
      else if (mode === 'long_break') setTimeLeft(validLb * 60);
    }

    setIsSettingsOpen(false);
    showToast('success', 'Preferências Salvas', `Foco: ${validF}m | Pausa: ${validSb}m | Pausa Longa: ${validLb}m`);
  };

  // Timer interval e contagem de tempo decorrido
  useEffect(() => {
    let timer: any = null;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      handleFinishSession();
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft]);

  // Iniciar / Pausar
  const handleTogglePlay = () => {
    if (!isRunning) {
      // Se está iniciando pela primeira vez nesta sessão, grava a hora de início
      if (!startTime) {
        setStartTime(new Date());
      }
      setIsRunning(true);
    } else {
      setIsRunning(false);
    }
  };

  // Resetar timer
  const handleReset = () => {
    setIsRunning(false);
    setStartTime(null);
    setElapsedSeconds(0);
    if (mode === 'pomodoro') setTimeLeft(focusMinutes * 60);
    else if (mode === 'short_break') setTimeLeft(shortBreakMinutes * 60);
    else if (mode === 'long_break') setTimeLeft(longBreakMinutes * 60);
  };

  // Formata hora no estilo HH:mm
  const formatHourMinute = (date: Date) => {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  // Finalizar e salvar sessão no histórico
  const handleFinishSession = () => {
    const now = new Date();
    const start = startTime || new Date(now.getTime() - elapsedSeconds * 1000);

    const startStr = formatHourMinute(start);
    const endStr = formatHourMinute(now);

    // Duração real trabalhada em minutos
    const actualMinutes = Math.max(1, Math.round(elapsedSeconds / 60)) || focusMinutes;

    if (mode === 'pomodoro') {
      const course = courses.find((c) => c.id === selectedCourseId);
      const newSession: StudySession = {
        id: `session-${Date.now()}`,
        title: sessionTitle.trim() || `Sessão de Foco ${course ? `(${course.code})` : ''}`,
        courseId: selectedCourseId || courses[0]?.id || '',
        date: now.toISOString().split('T')[0],
        startTime: startStr,
        endTime: endStr,
        durationMinutes: actualMinutes,
        completed: true,
        notes: sessionNotes.trim() || `Sessão de foco iniciada às ${startStr} e finalizada às ${endStr}.`,
        result: sessionResult,
      };

      onAddSession(newSession);
      showToast(
        'success',
        '🎉 Ciclo de Foco Concluído!',
        `Registrado: ${actualMinutes} min trabalhados (${startStr} → ${endStr}).`
      );
    } else {
      showToast('info', 'Pausa Finalizada', 'Hora de retomar o foco e arrasar nos estudos!');
    }

    handleReset();
  };

  // Formata MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Estimativa de horário de término
  const getExpectedEndTimeStr = () => {
    const now = new Date();
    const end = new Date(now.getTime() + timeLeft * 1000);
    return formatHourMinute(end);
  };

  // Salvar sessão manual
  const handleSaveManualSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) return;

    const parsedDuration = parseInt(manualDuration, 10) || 30;

    const newSession: StudySession = {
      id: `session-${Date.now()}`,
      title: manualTitle.trim(),
      courseId: manualCourseId || courses[0]?.id || '',
      date: manualDate,
      startTime: manualStartTime || undefined,
      endTime: manualEndTime || undefined,
      durationMinutes: parsedDuration,
      completed: true,
      notes: manualNotes.trim(),
      result: manualResult,
    };

    onAddSession(newSession);
    setIsManualModalOpen(false);
    setManualTitle('');
    setManualNotes('');
    showToast('success', 'Sessão Registrada', `${newSession.title} adicionada ao histórico.`);
  };

  // Confirmar exclusão de sessão
  const handleDeleteSessionPrompt = (sess: StudySession) => {
    showConfirm({
      title: 'Excluir Sessão de Estudo',
      message: `Tem certeza que deseja remover a sessão "${sess.title}" (${sess.durationMinutes} min)?`,
      confirmText: 'Excluir',
      danger: true,
      onConfirm: () => {
        onDeleteSession(sess.id);
        showToast('info', 'Sessão Excluída', 'Registro removido do seu histórico.');
      },
    });
  };

  const totalMinutes = sessions.reduce((acc, curr) => acc + (Number(curr.durationMinutes) || 0), 0);

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      {/* ======================================================== */}
      {/* TIMER CARD PRINCIPAL                                     */}
      {/* ======================================================== */}
      <div className="bg-white dark:bg-[#202020] rounded-2xl border border-[#e9e9e8] dark:border-[#2f2f2f] p-6 md:p-8 shadow-sm text-center space-y-6 relative">
        {/* Botão de Configurações no canto superior */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="absolute top-4 right-4 p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          title="Personalizar minutos de foco e descanso"
        >
          <Settings2 className="w-5 h-5" />
        </button>

        {/* Seleção de Modos */}
        <div className="inline-flex items-center gap-1.5 bg-[#efeeea] dark:bg-[#2a2a2a] p-1.5 rounded-2xl flex-wrap justify-center">
          <button
            onClick={() => {
              const doSwitch = () => {
                setMode('pomodoro');
                setIsRunning(false);
                setStartTime(null);
                setElapsedSeconds(0);
                setTimeLeft(focusMinutes * 60);
              };
              if (isRunning) {
                showConfirm({
                  title: 'Interromper Foco',
                  message: 'Deseja interromper a sessão de foco atual para mudar de modo?',
                  confirmText: 'Interromper',
                  danger: true,
                  onConfirm: doSwitch,
                });
              } else {
                doSwitch();
              }
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              mode === 'pomodoro'
                ? 'bg-white dark:bg-[#1f1f1f] text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-[#787774] dark:text-[#9b9a97] hover:text-[#37352f]'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Foco ({focusMinutes}m)</span>
          </button>

          <button
            onClick={() => {
              const doSwitch = () => {
                setMode('short_break');
                setIsRunning(false);
                setStartTime(null);
                setElapsedSeconds(0);
                setTimeLeft(shortBreakMinutes * 60);
              };
              if (isRunning) {
                showConfirm({
                  title: 'Mudar de Modo',
                  message: 'Deseja interromper a sessão atual para mudar para Pausa Curta?',
                  confirmText: 'Mudar',
                  danger: true,
                  onConfirm: doSwitch,
                });
              } else {
                doSwitch();
              }
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              mode === 'short_break'
                ? 'bg-white dark:bg-[#1f1f1f] text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-[#787774] dark:text-[#9b9a97] hover:text-[#37352f]'
            }`}
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>Pausa Curta ({shortBreakMinutes}m)</span>
          </button>

          <button
            onClick={() => {
              const doSwitch = () => {
                setMode('long_break');
                setIsRunning(false);
                setStartTime(null);
                setElapsedSeconds(0);
                setTimeLeft(longBreakMinutes * 60);
              };
              if (isRunning) {
                showConfirm({
                  title: 'Mudar de Modo',
                  message: 'Deseja interromper a sessão atual para mudar para Pausa Longa?',
                  confirmText: 'Mudar',
                  danger: true,
                  onConfirm: doSwitch,
                });
              } else {
                doSwitch();
              }
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              mode === 'long_break'
                ? 'bg-white dark:bg-[#1f1f1f] text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-[#787774] dark:text-[#9b9a97] hover:text-[#37352f]'
            }`}
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>Pausa Longa ({longBreakMinutes}m)</span>
          </button>
        </div>

        {/* Display do Relógio Countdown */}
        <div className="py-2">
          <div className="font-mono text-7xl md:text-8xl font-bold tracking-tight text-[#37352f] dark:text-[#f3f3f2] select-none">
            {formatTime(timeLeft)}
          </div>

          {/* Painel de Horário de Início e Término em Tempo Real */}
          {startTime ? (
            <div className="inline-flex items-center gap-4 mt-4 px-4 py-2 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-[#e9e9e8] dark:border-[#333] text-xs">
              <div className="flex items-center gap-1.5 text-stone-600 dark:text-stone-300">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span>Iniciado às: <b>{formatHourMinute(startTime)}</b></span>
              </div>
              <span className="text-stone-300 dark:text-stone-600">|</span>
              <div className="flex items-center gap-1.5 text-stone-600 dark:text-stone-300">
                <ArrowRight className="w-3.5 h-3.5 text-emerald-500" />
                <span>Término previsto: <b>{getExpectedEndTimeStr()}</b></span>
              </div>
              <span className="text-stone-300 dark:text-stone-600">|</span>
              <div className="text-stone-500">
                Decorrido: <b>{Math.floor(elapsedSeconds / 60)}m {elapsedSeconds % 60}s</b>
              </div>
            </div>
          ) : (
            <div className="text-xs text-[#787774] dark:text-[#9b9a97] mt-3">
              Clique em Iniciar para começar e registrar a hora de início automaticamente.
            </div>
          )}
        </div>

        {/* Botões de Controle */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={handleTogglePlay}
            className={`flex items-center gap-2 px-8 py-3 rounded-2xl text-sm font-semibold text-white shadow-md transition-all active:scale-95 ${
              isRunning ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4" />
                <span>Pausar</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>{startTime ? 'Continuar Foco' : 'Iniciar Foco'}</span>
              </>
            )}
          </button>

          {/* Botão de Concluir Agora (caso o estudante queira salvar antes dos minutos acabarem) */}
          {startTime && elapsedSeconds >= 30 && (
            <button
              onClick={handleFinishSession}
              className="flex items-center gap-1.5 px-4 py-3 rounded-2xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
              title="Finalizar agora e registrar tempo trabalhado até o momento"
            >
              <Check className="w-4 h-4" />
              <span>Concluir & Salvar</span>
            </button>
          )}

          <button
            onClick={handleReset}
            className="p-3 rounded-2xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-[#787774] dark:text-[#9b9a97] transition-all"
            title="Reiniciar timer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Seleção Rápida de Atividade Vinculada */}
        <div className="pt-5 border-t border-[#e9e9e8] dark:border-[#2f2f2f] text-left space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">
                Vincular à Disciplina:
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#e9e9e8] dark:border-[#333] bg-stone-50 dark:bg-[#1a1a1a] text-[#37352f] dark:text-white text-xs focus:ring-1 focus:ring-emerald-500"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">
                Assunto ou Atividade de Foco:
              </label>
              <input
                type="text"
                placeholder="Ex: Resolução de Lista 2, Leitura cap. 4"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#e9e9e8] dark:border-[#333] bg-stone-50 dark:bg-[#1a1a1a] text-[#37352f] dark:text-white text-xs focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* HISTÓRICO DE SESSÕES (COM HORA DE INÍCIO E TÉRMINO)      */}
      {/* ======================================================== */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-base md:text-lg text-[#37352f] dark:text-[#f3f3f2]">
              Histórico de Sessões de Estudo & Foco
            </h3>
            <p className="text-xs text-[#787774] dark:text-[#9b9a97] mt-0.5">
              Tempo total acumulado: <strong className="text-emerald-600 dark:text-emerald-400">{totalMinutes} minutos</strong> ({Math.round((totalMinutes / 60) * 10) / 10}h de dedicação)
            </p>
          </div>

          <button
            onClick={() => setIsManualModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-xs font-semibold text-[#37352f] dark:text-stone-200 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Estudo Manual</span>
          </button>
        </div>

        {/* Tabela com Colunas de Horário (Início → Término) */}
        <div className="bg-white dark:bg-[#202020] rounded-2xl border border-[#e9e9e8] dark:border-[#2f2f2f] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f7f6f3] dark:bg-[#262626] border-b border-[#e9e9e8] dark:border-[#2f2f2f] text-[#787774] dark:text-[#9b9a97] uppercase font-bold text-[10px]">
                <tr>
                  <th className="px-4 py-3">Atividade / Tópico</th>
                  <th className="px-4 py-3">Disciplina</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Horário (Início → Fim)</th>
                  <th className="px-4 py-3">Tempo Total</th>
                  <th className="px-4 py-3">Resultado</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e9e9e8] dark:divide-[#2f2f2f]">
                {sessions.map((sess) => {
                  const course = courses.find((c) => c.id === sess.courseId);

                  return (
                    <tr key={sess.id} className="hover:bg-[#fcfbf9] dark:hover:bg-[#252525] transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#37352f] dark:text-[#f3f3f2]">{sess.title}</div>
                        {sess.notes && (
                          <div className="text-[11px] text-[#787774] dark:text-[#9b9a97] mt-0.5 line-clamp-1">{sess.notes}</div>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {course ? (
                          <span
                            className="font-mono text-[10px] font-bold px-2 py-0.5 rounded"
                            style={{ backgroundColor: `${course.color}18`, color: course.color }}
                          >
                            {course.code}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-[#787774] dark:text-[#9b9a97]">
                        {sess.date.split('-').reverse().join('/')}
                      </td>

                      {/* Horário de Início e Término */}
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px]">
                        {sess.startTime && sess.endTime ? (
                          <span className="flex items-center gap-1 text-stone-700 dark:text-stone-300">
                            <span>{sess.startTime}</span>
                            <span className="text-stone-400">→</span>
                            <span>{sess.endTime}</span>
                          </span>
                        ) : sess.startTime ? (
                          <span>Início: {sess.startTime}</span>
                        ) : (
                          <span className="text-stone-400">-</span>
                        )}
                      </td>

                      {/* Tempo Total Trabalhado */}
                      <td className="px-4 py-3 whitespace-nowrap font-bold text-emerald-600 dark:text-emerald-400">
                        {sess.durationMinutes} min
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            sess.result === 'Acerto'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : sess.result === 'Erro'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                          }`}
                        >
                          {sess.result}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleDeleteSessionPrompt(sess)}
                          className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                          title="Excluir sessão"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {sessions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#787774] dark:text-[#9b9a97]">
                      Nenhuma sessão registrada ainda. Inicie seu primeiro Pomodoro acima!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL CONFIGURAÇÃO DOS MINUTOS DE FOCO E DESCANSO        */}
      {/* ======================================================== */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#202020] border border-[#e9e9e8] dark:border-[#333] rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-[#f0efec] dark:border-[#2d2d2d]">
              <h3 className="text-base font-bold text-[#37352f] dark:text-white flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-emerald-600" />
                <span>Personalizar Minutos do Timer</span>
              </h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-stone-400 hover:text-stone-700 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Presets Rápidos */}
              <div>
                <label className="block text-stone-500 font-semibold mb-2">Modelos Rápidos:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleSaveSettings(25, 5, 15)}
                    className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-emerald-500 text-center transition-all"
                  >
                    <b className="block text-sm">25m / 5m</b>
                    <span className="text-[10px] text-stone-400">Clássico</span>
                  </button>
                  <button
                    onClick={() => handleSaveSettings(50, 10, 20)}
                    className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-emerald-500 text-center transition-all"
                  >
                    <b className="block text-sm">50m / 10m</b>
                    <span className="text-[10px] text-stone-400">Deep Work</span>
                  </button>
                  <button
                    onClick={() => handleSaveSettings(45, 15, 30)}
                    className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-emerald-500 text-center transition-all"
                  >
                    <b className="block text-sm">45m / 15m</b>
                    <span className="text-[10px] text-stone-400">Faculdade</span>
                  </button>
                </div>
              </div>

              {/* Ajuste Fino Customizado */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block font-semibold text-[#37352f] dark:text-stone-200 mb-1">
                    Tempo de Foco (minutos):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={180}
                      value={focusMinutes}
                      onChange={(e) => setFocusMinutes(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-3 py-2 rounded-xl border border-[#e9e9e8] dark:border-[#333] bg-stone-50 dark:bg-[#191919] text-base font-bold text-center"
                    />
                    <span className="text-stone-400">min</span>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#37352f] dark:text-stone-200 mb-1">
                    Pausa Curta (minutos):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={shortBreakMinutes}
                      onChange={(e) => setShortBreakMinutes(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-3 py-2 rounded-xl border border-[#e9e9e8] dark:border-[#333] bg-stone-50 dark:bg-[#191919] text-base font-bold text-center"
                    />
                    <span className="text-stone-400">min</span>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#37352f] dark:text-stone-200 mb-1">
                    Pausa Longa (minutos):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={longBreakMinutes}
                      onChange={(e) => setLongBreakMinutes(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-3 py-2 rounded-xl border border-[#e9e9e8] dark:border-[#333] bg-stone-50 dark:bg-[#191919] text-base font-bold text-center"
                    />
                    <span className="text-stone-400">min</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#f0efec] dark:border-[#2d2d2d]">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleSaveSettings(focusMinutes, shortBreakMinutes, longBreakMinutes)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
              >
                Salvar Configuração
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL REGISTRO MANUAL DE SESSÃO                           */}
      {/* ======================================================== */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#202020] border border-[#e9e9e8] dark:border-[#333] rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-[#f0efec] dark:border-[#2d2d2d]">
              <h3 className="text-base font-bold text-[#37352f] dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Registrar Sessão de Estudo</span>
              </h3>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveManualSession} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#787774] dark:text-[#9b9a97] mb-1">
                  O que você estudou? *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Resolução da P1 de Cálculo"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#e9e9e8] dark:border-[#333] bg-stone-50 dark:bg-[#191919] text-[#37352f] dark:text-white focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#787774] dark:text-[#9b9a97] mb-1">
                    Disciplina:
                  </label>
                  <select
                    value={manualCourseId}
                    onChange={(e) => setManualCourseId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#e9e9e8] dark:border-[#333] bg-stone-50 dark:bg-[#191919] text-[#37352f] dark:text-white focus:ring-1 focus:ring-blue-500"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#787774] dark:text-[#9b9a97] mb-1">
                    Data:
                  </label>
                  <input
                    type="date"
                    required
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#e9e9e8] dark:border-[#333] bg-stone-50 dark:bg-[#191919] text-[#37352f] dark:text-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-[#787774] dark:text-[#9b9a97] mb-1">
                    Hora Início:
                  </label>
                  <input
                    type="time"
                    value={manualStartTime}
                    onChange={(e) => setManualStartTime(e.target.value)}
                    className="w-full px-2 py-2 rounded-xl border border-[#e9e9e8] dark:border-[#333] bg-stone-50 dark:bg-[#191919] text-center"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#787774] dark:text-[#9b9a97] mb-1">
                    Hora Fim:
                  </label>
                  <input
                    type="time"
                    value={manualEndTime}
                    onChange={(e) => setManualEndTime(e.target.value)}
                    className="w-full px-2 py-2 rounded-xl border border-[#e9e9e8] dark:border-[#333] bg-stone-50 dark:bg-[#191919] text-center"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#787774] dark:text-[#9b9a97] mb-1">
                    Duração:
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      value={manualDuration}
                      onChange={(e) => setManualDuration(e.target.value)}
                      className="w-full px-2 py-2 rounded-xl border border-[#e9e9e8] dark:border-[#333] bg-stone-50 dark:bg-[#191919] text-center"
                    />
                    <span className="text-[10px] text-stone-400">min</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#787774] dark:text-[#9b9a97] mb-1">
                  Anotações da sessão:
                </label>
                <textarea
                  rows={2}
                  placeholder="Conceitos revisados, dúvidas que surgiram..."
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#e9e9e8] dark:border-[#333] bg-stone-50 dark:bg-[#191919] text-[#37352f] dark:text-white focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f0efec] dark:border-[#2d2d2d]">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
                >
                  Salvar Sessão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
