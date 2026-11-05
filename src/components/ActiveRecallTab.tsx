import React, { useState } from 'react';
import { StudyTopic, Course } from '../types';
import { Plus, Brain, CheckCircle2, RotateCcw, Eye, EyeOff, Calendar, Trash2, X } from 'lucide-react';

interface ActiveRecallTabProps {
  topics: StudyTopic[];
  courses: Course[];
  onAddTopic: (t: StudyTopic) => void;
  onUpdateTopic: (t: StudyTopic) => void;
  onDeleteTopic: (id: string) => void;
}

const INTERVALS = [1, 3, 7, 14, 30]; // Dias de repetição espaçada

export const ActiveRecallTab: React.FC<ActiveRecallTabProps> = ({
  topics,
  courses,
  onAddTopic,
  onUpdateTopic,
  onDeleteTopic,
}) => {
  const [filter, setFilter] = useState<'due' | 'all'>('due');
  const [activeTopic, setActiveTopic] = useState<StudyTopic | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New topic state
  const [name, setName] = useState('');
  const [courseId, setCourseId] = useState(courses[0]?.id || '');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [adaptive, setAdaptive] = useState(true);

  const todayStr = new Date().toISOString().split('T')[0];

  const dueTopics = topics.filter((t) => t.nextReviewDate <= todayStr);
  const displayedTopics = filter === 'due' ? dueTopics : topics;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !question.trim()) return;

    const newTopic: StudyTopic = {
      id: `topic-${Date.now()}`,
      name: name.trim(),
      courseId: courseId || courses[0]?.id || '',
      question: question.trim(),
      answer: answer.trim(),
      stage: 0,
      adaptive,
      nextReviewDate: todayStr,
    };

    onAddTopic(newTopic);
    setIsModalOpen(false);
    setName('');
    setQuestion('');
    setAnswer('');
  };

  const handleReview = (topic: StudyTopic, success: boolean) => {
    const today = new Date();
    let newStage = topic.stage;
    let daysToAdd = 1;

    if (success) {
      // Avança etapa
      newStage = Math.min(topic.stage + 1, INTERVALS.length - 1);
      daysToAdd = INTERVALS[newStage] || 30;
    } else {
      // Erro: reinicia para 1 dia se for adaptativo
      newStage = topic.adaptive ? 0 : Math.max(0, topic.stage - 1);
      daysToAdd = 1;
    }

    const nextDate = new Date(today.getTime() + daysToAdd * 86400000);
    const nextDateStr = nextDate.toISOString().split('T')[0];

    const updated: StudyTopic = {
      ...topic,
      stage: newStage,
      lastReviewDate: todayStr,
      nextReviewDate: nextDateStr,
    };

    onUpdateTopic(updated);
    setActiveTopic(null);
    setShowAnswer(false);
  };

  return (
    <div className="space-y-6">
      {/* Description header according to the Notion original instructions */}
      <div className="p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 rounded-xl flex items-start gap-3">
        <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
        <div className="text-xs text-[#37352f] dark:text-[#d4d4d4] space-y-1">
          <p className="font-semibold text-purple-900 dark:text-purple-300">
            Como funciona a Recuperação Ativa & Repetição Espaçada:
          </p>
          <p className="text-[#787774] dark:text-[#9b9a97]">
            Ao revisar, tente responder a pergunta mentalmente antes de consultar a resposta. Os intervalos aumentam
            progressivamente (<strong>1, 3, 7, 14 e 30 dias</strong>). No modo Adaptativo, se você errar, o intervalo
            retorna para 1 dia para fixar o conteúdo na memória de longo prazo.
          </p>
        </div>
      </div>

      {/* Interactive Review Modal / Flashcard Mode */}
      {activeTopic && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#202020] rounded-2xl border border-[#e9e9e8] dark:border-[#2f2f2f] w-full max-w-lg shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-[#e9e9e8] dark:border-[#2f2f2f] pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 rounded-md">
                  <Brain className="w-4 h-4" />
                </span>
                <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                  Sessão de Revisão Ativa
                </span>
              </div>
              <button
                onClick={() => {
                  setActiveTopic(null);
                  setShowAnswer(false);
                }}
                className="p-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Flashcard Box */}
            <div className="space-y-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#787774] dark:text-[#9b9a97]">
                  Pergunta:
                </span>
                <div className="text-base font-medium mt-1 p-4 bg-[#fcfbf9] dark:bg-[#262626] rounded-xl border border-[#e9e9e8] dark:border-[#333]">
                  {activeTopic.question}
                </div>
              </div>

              {showAnswer ? (
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Resposta:
                  </span>
                  <div className="text-sm mt-1 p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-900/40 text-[#37352f] dark:text-[#f3f3f2]">
                    {activeTopic.answer || 'Nenhuma resposta cadastrada.'}
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAnswer(true)}
                  className="w-full py-3 bg-[#f7f6f3] dark:bg-[#282828] hover:bg-purple-50 dark:hover:bg-purple-950/30 text-purple-600 dark:text-purple-400 font-medium text-xs rounded-xl border border-dashed border-purple-300 dark:border-purple-800 flex items-center justify-center gap-2 transition-all"
                >
                  <Eye className="w-4 h-4" />
                  <span>Revelar Resposta</span>
                </button>
              )}
            </div>

            {/* Evaluation Buttons */}
            {showAnswer && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => handleReview(activeTopic, false)}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-200 rounded-xl text-xs font-semibold transition-all border border-rose-200 dark:border-rose-900/40"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Errei (Reiniciar: +1 dia)</span>
                </button>
                <button
                  onClick={() => handleReview(activeTopic, true)}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Acertei (Avançar etapa)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-[#efeeea] dark:bg-[#2a2a2a] p-1 rounded-lg">
          <button
            onClick={() => setFilter('due')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              filter === 'due'
                ? 'bg-white dark:bg-[#1f1f1f] text-purple-600 dark:text-purple-400 shadow-sm font-semibold'
                : 'text-[#787774] dark:text-[#9b9a97] hover:text-[#37352f]'
            }`}
          >
            Vencidas & Hoje ({dueTopics.length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              filter === 'all'
                ? 'bg-white dark:bg-[#1f1f1f] text-[#37352f] dark:text-white shadow-sm font-semibold'
                : 'text-[#787774] dark:text-[#9b9a97] hover:text-[#37352f]'
            }`}
          >
            Todos os Tópicos ({topics.length})
          </button>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Tópico de Revisão</span>
        </button>
      </div>

      {/* Topics List Table */}
      <div className="bg-white dark:bg-[#202020] rounded-xl border border-[#e9e9e8] dark:border-[#2f2f2f] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f7f6f3] dark:bg-[#262626] border-b border-[#e9e9e8] dark:border-[#2f2f2f] text-[#787774] dark:text-[#9b9a97] uppercase font-bold text-[10px]">
              <tr>
                <th className="px-4 py-3">Tópico / Pergunta</th>
                <th className="px-4 py-3">Matéria</th>
                <th className="px-4 py-3">Etapa Atual</th>
                <th className="px-4 py-3">Próxima Revisão</th>
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e9e9e8] dark:divide-[#2f2f2f]">
              {displayedTopics.map((topic) => {
                const course = courses.find((c) => c.id === topic.courseId);
                const isDue = topic.nextReviewDate <= todayStr;

                return (
                  <tr key={topic.id} className="hover:bg-[#fcfbf9] dark:hover:bg-[#252525] transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-[#37352f] dark:text-[#f3f3f2]">{topic.name}</div>
                      <div className="text-[11px] text-[#787774] dark:text-[#9b9a97] mt-0.5 line-clamp-1">
                        {topic.question}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
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
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-semibold text-[10px]">
                        Etapa {topic.stage + 1} ({INTERVALS[topic.stage] || 30}d)
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 font-medium ${
                          isDue ? 'text-purple-600 dark:text-purple-400 font-bold' : 'text-[#787774] dark:text-[#9b9a97]'
                        }`}
                      >
                        <Calendar className="w-3 h-3" />
                        {topic.nextReviewDate}
                        {isDue && ' (Hoje)'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setActiveTopic(topic);
                            setShowAnswer(false);
                          }}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-[11px] font-medium shadow-sm transition-all"
                        >
                          Revisar Agora
                        </button>
                        <button
                          onClick={() => onDeleteTopic(topic.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {displayedTopics.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#787774] dark:text-[#9b9a97]">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-60" />
                    <p className="text-sm">Nenhum tópico pendente de revisão no momento!</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add Study Topic */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#202020] rounded-xl border border-[#e9e9e8] dark:border-[#2f2f2f] w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Novo Tópico para Revisão</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs md:text-sm">
              <div>
                <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Nome do Tópico *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Polimorfismo e Classes Abstratas"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Disciplina</label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-purple-500"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id} className="dark:bg-[#202020]">
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Pergunta (Active Recall) *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Ex: Qual a diferença entre classe abstrata e interface?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Resposta (Oculta durante o teste)</label>
                <textarea
                  rows={3}
                  placeholder="Escreva a resposta correta para conferir durante a revisão..."
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="adaptive"
                  checked={adaptive}
                  onChange={(e) => setAdaptive(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded"
                />
                <label htmlFor="adaptive" className="text-xs text-[#787774] dark:text-[#9b9a97]">
                  Modo adaptativo (reinicia em 1 dia caso erre a resposta)
                </label>
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
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium shadow"
                >
                  Salvar Tópico
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
