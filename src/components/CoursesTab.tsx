import React, { useState } from 'react';
import { Course } from '../types';
import { Plus, BookOpen, User, Clock, MapPin, CheckCircle, X, Trash2 } from 'lucide-react';

interface CoursesTabProps {
  courses: Course[];
  onAddCourse: (c: Course) => void;
  onUpdateCourse: (c: Course) => void;
  onDeleteCourse: (id: string) => void;
}

export const CoursesTab: React.FC<CoursesTabProps> = ({
  courses,
  onAddCourse,
  onUpdateCourse,
  onDeleteCourse,
}) => {
  const [filter, setFilter] = useState<'all' | 'in_progress'>('in_progress');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Course Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [professor, setProfessor] = useState('');
  const [schedule, setSchedule] = useState('');
  const [roomOrLink, setRoomOrLink] = useState('');
  const [semester, setSemester] = useState('1º Semestre');
  const [year, setYear] = useState('2026');
  const [color, setColor] = useState('#3b82f6');

  const filteredCourses = courses.filter((c) => (filter === 'all' ? true : c.inProgress));

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newCourse: Course = {
      id: `course-${Date.now()}`,
      name: name.trim(),
      code: code.trim().toUpperCase() || 'DISC',
      professor: professor.trim(),
      schedule: schedule.trim(),
      roomOrLink: roomOrLink.trim(),
      semester,
      year,
      inProgress: true,
      color,
    };

    onAddCourse(newCourse);
    setIsModalOpen(false);
    // Reset
    setName('');
    setCode('');
    setProfessor('');
    setSchedule('');
    setRoomOrLink('');
  };

  return (
    <div className="space-y-6">
      {/* Tab controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-[#efeeea] dark:bg-[#2a2a2a] p-1 rounded-lg">
          <button
            onClick={() => setFilter('in_progress')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              filter === 'in_progress'
                ? 'bg-white dark:bg-[#1f1f1f] text-[#37352f] dark:text-white shadow-sm'
                : 'text-[#787774] dark:text-[#9b9a97] hover:text-[#37352f]'
            }`}
          >
            Disciplinas do Semestre ({courses.filter((c) => c.inProgress).length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              filter === 'all'
                ? 'bg-white dark:bg-[#1f1f1f] text-[#37352f] dark:text-white shadow-sm'
                : 'text-[#787774] dark:text-[#9b9a97] hover:text-[#37352f]'
            }`}
          >
            Todos os Cursos ({courses.length})
          </button>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Disciplina</span>
        </button>
      </div>

      {/* Courses Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCourses.map((c) => (
          <div
            key={c.id}
            className="group relative bg-white dark:bg-[#202020] rounded-xl border border-[#e9e9e8] dark:border-[#2f2f2f] hover:border-blue-400 dark:hover:border-blue-500/50 shadow-sm transition-all overflow-hidden flex flex-col justify-between"
          >
            {/* Top Color Accent */}
            <div className="h-2 w-full" style={{ backgroundColor: c.color }} />

            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span
                    className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase mb-1.5"
                    style={{ backgroundColor: `${c.color}20`, color: c.color }}
                  >
                    {c.code}
                  </span>
                  <h3 className="font-semibold text-sm md:text-base text-[#37352f] dark:text-[#f3f3f2] leading-snug">
                    {c.name}
                  </h3>
                </div>
                <button
                  onClick={() => onDeleteCourse(c.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-all"
                  title="Excluir disciplina"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1.5 text-xs text-[#787774] dark:text-[#9b9a97]">
                {c.professor && (
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{c.professor}</span>
                  </div>
                )}
                {c.schedule && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>{c.schedule}</span>
                  </div>
                )}
                {c.roomOrLink && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{c.roomOrLink}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="px-4 py-2.5 bg-[#fcfbf9] dark:bg-[#252525] border-t border-[#f0f0ee] dark:border-[#2a2a2a] flex items-center justify-between text-[11px]">
              <span className="text-[#9b9a97]">{c.semester} • {c.year}</span>
              <button
                onClick={() => onUpdateCourse({ ...c, inProgress: !c.inProgress })}
                className={`flex items-center gap-1 font-medium transition-colors ${
                  c.inProgress ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-400'
                }`}
              >
                <CheckCircle className="w-3 h-3" />
                {c.inProgress ? 'Em andamento' : 'Concluído'}
              </button>
            </div>
          </div>
        ))}

        {filteredCourses.length === 0 && (
          <div className="col-span-full py-12 text-center text-[#787774] dark:text-[#9b9a97]">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhuma disciplina encontrada neste filtro.</p>
          </div>
        )}
      </div>

      {/* Modal Add Course */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#202020] rounded-xl border border-[#e9e9e8] dark:border-[#2f2f2f] w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Adicionar Disciplina</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs md:text-sm">
              <div>
                <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Nome da Matéria *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Algoritmos e Estruturas de Dados"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Código</label>
                  <input
                    type="text"
                    placeholder="Ex: MC322"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Cor</label>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full h-9 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent cursor-pointer p-0.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Professor</label>
                <input
                  type="text"
                  placeholder="Ex: Prof. Fulano de Tal"
                  value={professor}
                  onChange={(e) => setProfessor(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Dias e Horários</label>
                <input
                  type="text"
                  placeholder="Ex: Ter / Qui 10:00 - 12:00"
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Sala ou Link</label>
                <input
                  type="text"
                  placeholder="Ex: Sala 204 ou Link do Meet"
                  value={roomOrLink}
                  onChange={(e) => setRoomOrLink(e.target.value)}
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
                  Salvar Disciplina
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
