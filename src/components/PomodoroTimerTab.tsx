import React, { useState, useEffect } from 'react';
import { StudySession, Course, ReviewResult } from '../types';
import { Play, Pause, RotateCcw, Clock, CheckCircle, Plus, Calendar, Trash2 } from 'lucide-react';

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
  const [mode, setMode] = useState<'pomodoro' | 'short_break' | 'long_break'>('pomodoro');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);

  // Session recording state
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || '');
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionResult, setSessionResult] = useState<ReviewResult>('Estudo');

  // Change duration on mode switch
  useEffect(() => {
    setIsRunning(false);
    if (mode === 'pomodoro') setTimeLeft(25 * 60);
    else if (mode === 'short_break') setTimeLeft(5 * 60);
    else if (mode === 'long_break') setTimeLeft(15 * 60);
  }, [mode]);

  // Timer interval
  useEffect(() => {
    let timer: any = null;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      // Automatically register 25 min if it was a pomodoro
      if (mode === 'pomodoro') {
        const newSession: StudySession = {
          id: `session-${Date.now()}`,
          title: sessionTitle.trim() || 'Sessão de Foco Pomodoro',
          courseId: selectedCourseId || courses[0]?.id || '',
          date: new Date().toISOString().split('T')[0],
          durationMinutes: 25,
          completed: true,
          notes: sessionNotes.trim() || 'Sessão de 25 minutos concluída com sucesso.',
          result: sessionResult,
        };
        onAddSession(newSession);
        alert('🎉 Parabéns! Ciclo Pomodoro concluído e registrado no seu histórico!');
      }
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft, mode]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleManualAddSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionTitle.trim()) return;

    const newSession: StudySession = {
      id: `session-${Date.now()}`,
      title: sessionTitle.trim(),
      courseId: selectedCourseId || courses[0]?.id || '',
      date: new Date().toISOString().split('T')[0],
      durationMinutes: 30,
      completed: true,
      notes: sessionNotes.trim(),
      result: sessionResult,
    };

    onAddSession(newSession);
    setSessionTitle('');
    setSessionNotes('');
  };

  const totalMinutes = sessions.reduce((acc, curr) => acc + curr.durationMinutes, 0);

  return (
    <div className="space-y-8">
      {/* Timer Section */}
      <div className="bg-white dark:bg-[#202020] rounded-2xl border border-[#e9e9e8] dark:border-[#2f2f2f] p-6 md:p-8 max-w-xl mx-auto shadow-sm text-center space-y-6">
        {/* Mode Selector */}
        <div className="inline-flex items-center gap-1 bg-[#efeeea] dark:bg-[#2a2a2a] p-1.5 rounded-xl">
          <button
            onClick={() => setMode('pomodoro')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === 'pomodoro'
                ? 'bg-white dark:bg-[#1f1f1f] text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-[#787774] dark:text-[#9b9a97]'
            }`}
          >
            Foco (25m)
          </button>
          <button
            onClick={() => setMode('short_break')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === 'short_break'
                ? 'bg-white dark:bg-[#1f1f1f] text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-[#787774] dark:text-[#9b9a97]'
            }`}
          >
            Pausa Curta (5m)
          </button>
          <button
            onClick={() => setMode('long_break')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === 'long_break'
                ? 'bg-white dark:bg-[#1f1f1f] text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-[#787774] dark:text-[#9b9a97]'
            }`}
          >
            Pausa Longa (15m)
          </button>
        </div>

        {/* Big Countdown Display */}
        <div className="font-mono text-6xl md:text-7xl font-bold tracking-tight text-[#37352f] dark:text-[#f3f3f2]">
          {formatTime(timeLeft)}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md transition-all ${
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
                <Play className="w-4 h-4" />
                <span>Iniciar Foco</span>
              </>
            )}
          </button>
          <button
            onClick={() => {
              setIsRunning(false);
              setTimeLeft(mode === 'pomodoro' ? 25 * 60 : mode === 'short_break' ? 5 * 60 : 15 * 60);
            }}
            className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-[#787774] dark:text-[#9b9a97] transition-all"
            title="Reiniciar timer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Session Details for the Timer */}
        <div className="pt-4 border-t border-[#e9e9e8] dark:border-[#2f2f2f] text-left space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Vincular Disciplina:</label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent text-xs"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id} className="dark:bg-[#202020]">
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Tópico de Estudo:</label>
              <input
                type="text"
                placeholder="Ex: Exercícios capítulo 3"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* History and Manual Logging Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-base">Histórico de Sessões de Estudo</h3>
            <p className="text-xs text-[#787774] dark:text-[#9b9a97]">
              Total acumulado: <strong>{totalMinutes} minutos</strong> ({Math.round((totalMinutes / 60) * 10) / 10}h)
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#202020] rounded-xl border border-[#e9e9e8] dark:border-[#2f2f2f] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f7f6f3] dark:bg-[#262626] border-b border-[#e9e9e8] dark:border-[#2f2f2f] text-[#787774] dark:text-[#9b9a97] uppercase font-bold text-[10px]">
                <tr>
                  <th className="px-4 py-3">Tópico / Sessão</th>
                  <th className="px-4 py-3">Disciplina</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Duração</th>
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
                        <div className="font-medium text-[#37352f] dark:text-[#f3f3f2]">{sess.title}</div>
                        {sess.notes && (
                          <div className="text-[11px] text-[#787774] dark:text-[#9b9a97]">{sess.notes}</div>
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
                        {sess.date}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium">
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
                          onClick={() => onDeleteSession(sess.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded"
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
                    <td colSpan={6} className="py-10 text-center text-[#787774] dark:text-[#9b9a97]">
                      Nenhuma sessão registrada ainda. Comece um Pomodoro acima!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
