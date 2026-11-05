import React, { useState } from 'react';
import { NotebookNote } from '../types';
import { Plus, Tag, Trash2, X, Search, FileText } from 'lucide-react';

interface NotebookTabProps {
  notes: NotebookNote[];
  onAddNote: (n: NotebookNote) => void;
  onDeleteNote: (id: string) => void;
}

export const NotebookTab: React.FC<NotebookTabProps> = ({
  notes,
  onAddNote,
  onDeleteNote,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [content, setContent] = useState('');

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const newNote: NotebookNote = {
      id: `note-${Date.now()}`,
      title: title.trim(),
      tags: tags.length > 0 ? tags : ['Geral'],
      createdAt: new Date().toISOString().split('T')[0],
      content: content.trim(),
    };

    onAddNote(newNote);
    setIsModalOpen(false);
    setTitle('');
    setTagsInput('');
    setContent('');
  };

  return (
    <div className="space-y-6">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#787774] dark:text-[#9b9a97] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por título, tag ou conteúdo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent text-xs focus:outline-none focus:border-blue-500"
          />
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Anotação</span>
        </button>
      </div>

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredNotes.map((note) => (
          <div
            key={note.id}
            className="group bg-white dark:bg-[#202020] rounded-xl border border-[#e9e9e8] dark:border-[#2f2f2f] hover:border-blue-400 dark:hover:border-blue-500/50 p-4 shadow-sm transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📝</span>
                  <h4 className="font-semibold text-sm text-[#37352f] dark:text-[#f3f3f2]">
                    {note.title}
                  </h4>
                </div>
                <button
                  onClick={() => onDeleteNote(note.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-all"
                  title="Excluir"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-xs text-[#787774] dark:text-[#9b9a97] whitespace-pre-line line-clamp-4 leading-relaxed font-sans">
                {note.content}
              </p>
            </div>

            <div className="pt-4 border-t border-[#f0f0ee] dark:border-[#2a2a2a] mt-3 flex items-center justify-between text-[11px]">
              <div className="flex flex-wrap gap-1">
                {note.tags.map((t, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-full bg-[#f2f1ee] dark:bg-[#2a2a2a] text-[#787774] dark:text-[#9b9a97] text-[10px]"
                  >
                    #{t}
                  </span>
                ))}
              </div>
              <span className="text-[#9b9a97] text-[10px]">{note.createdAt}</span>
            </div>
          </div>
        ))}

        {filteredNotes.length === 0 && (
          <div className="col-span-full py-12 text-center text-[#787774] dark:text-[#9b9a97]">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhuma nota encontrada.</p>
          </div>
        )}
      </div>

      {/* Modal Add Note */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#202020] rounded-xl border border-[#e9e9e8] dark:border-[#2f2f2f] w-full max-w-lg shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Nova Anotação de Estudo</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs md:text-sm">
              <div>
                <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Título *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Resumo de Álgebra Linear ou Links Úteis"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Tags (separadas por vírgula)</label>
                <input
                  type="text"
                  placeholder="Ex: Prova, Resumo, Algoritmos"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Conteúdo</label>
                <textarea
                  rows={6}
                  placeholder="Escreva suas anotações, fórmulas, dicas ou referências..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
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
                  Salvar Nota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
