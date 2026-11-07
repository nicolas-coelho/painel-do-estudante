import React, { useState, useMemo } from 'react';
import {
  PersonalBill,
  PersonalAppointment,
  BillCategory,
  AppointmentCategory,
} from '../types';
import { GoogleCalendarEvent } from '../googleCalendar';
import {
  Cloud,
  ChevronRight,
  ChevronDown,
  Calendar as CalendarIcon,
  Check,
  Plus,
  Trash2,
  Edit2,
  DollarSign,
  Sparkles,
  Heart,
  Clock,
  ArrowRight,
  X,
  CreditCard,
  Copy,
  ExternalLink,
  MapPin,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Filter,
} from 'lucide-react';

interface PersonalLifeTabProps {
  bills: PersonalBill[];
  appointments: PersonalAppointment[];
  googleEvents?: GoogleCalendarEvent[];
  darkMode?: boolean;
  onAddBill: (bill: PersonalBill) => void;
  onUpdateBill: (bill: PersonalBill) => void;
  onDeleteBill: (id: string) => void;
  onAddAppointment: (appointment: PersonalAppointment) => void;
  onUpdateAppointment: (appointment: PersonalAppointment) => void;
  onDeleteAppointment: (id: string) => void;
}

export const PersonalLifeTab: React.FC<PersonalLifeTabProps> = ({
  bills,
  appointments,
  googleEvents = [],
  darkMode = false,
  onAddBill,
  onUpdateBill,
  onDeleteBill,
  onAddAppointment,
  onUpdateAppointment,
  onDeleteAppointment,
}) => {
  // Toggle "How to get started"
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Left column active view
  const [leftView, setLeftView] = useState<'daily' | 'bills' | 'appointments' | 'all'>('daily');

  // Right column 1 (Task/Today) active tab
  const [rightTaskView, setRightTaskView] = useState<'today' | 'pending'>('today');

  // Right column 2 (Monthly Task & Goals) active tab
  const [monthlyView, setMonthlyView] = useState<'monthly' | 'all'>('monthly');

  // Quick inputs
  const [quickInputLeft, setQuickInputLeft] = useState('');
  const [quickTypeLeft, setQuickTypeLeft] = useState<'bill' | 'appointment'>('bill');
  const [quickInputRight, setQuickInputRight] = useState('');

  // Modais
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<PersonalBill | null>(null);
  const [isAppModalOpen, setIsAppModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<PersonalAppointment | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Form states - Conta
  const [billTitle, setBillTitle] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billDueDate, setBillDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [billCategory, setBillCategory] = useState<BillCategory>('moradia');
  const [billNotes, setBillNotes] = useState('');
  const [billBarcode, setBillBarcode] = useState('');

  // Form states - Compromisso
  const [appTitle, setAppTitle] = useState('');
  const [appDate, setAppDate] = useState(new Date().toISOString().split('T')[0]);
  const [appTime, setAppTime] = useState('14:00');
  const [appLocation, setAppLocation] = useState('');
  const [appCategory, setAppCategory] = useState<AppointmentCategory>('pessoal');
  const [appNotes, setAppNotes] = useState('');

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // KPIs
  const { pendingTotal, paidTotal, pendingCount, overdueCount } = useMemo(() => {
    let pendingTotal = 0;
    let paidTotal = 0;
    let pendingCount = 0;
    let overdueCount = 0;

    bills.forEach((b) => {
      if (b.status === 'paid') {
        paidTotal += Number(b.amount) || 0;
      } else {
        pendingTotal += Number(b.amount) || 0;
        pendingCount++;
        if (b.dueDate < todayStr) overdueCount++;
      }
    });

    return { pendingTotal, paidTotal, pendingCount, overdueCount };
  }, [bills, todayStr]);

  // Itens unificados para o Daily Log agrupados por data
  const groupedDailyLog = useMemo(() => {
    const entries: {
      id: string;
      title: string;
      date: string;
      type: 'bill' | 'appointment';
      completed: boolean;
      time?: string;
      amount?: number;
      category?: string;
      raw: PersonalBill | PersonalAppointment;
    }[] = [];

    bills.forEach((b) => {
      entries.push({
        id: b.id,
        title: b.title,
        date: b.dueDate,
        type: 'bill',
        completed: b.status === 'paid',
        amount: b.amount,
        category: b.category,
        raw: b,
      });
    });

    appointments.forEach((a) => {
      entries.push({
        id: a.id,
        title: a.title,
        date: a.date,
        type: 'appointment',
        completed: a.completed,
        time: a.time,
        category: a.category,
        raw: a,
      });
    });

    let filtered = entries;
    if (leftView === 'bills') filtered = entries.filter((e) => e.type === 'bill');
    if (leftView === 'appointments') filtered = entries.filter((e) => e.type === 'appointment');

    filtered.sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));

    const groups: Record<string, typeof entries> = {};
    filtered.forEach((item) => {
      if (!groups[item.date]) groups[item.date] = [];
      groups[item.date].push(item);
    });

    return groups;
  }, [bills, appointments, leftView]);

  // Formata cabeçalho de data no estilo do print: "03.09 . S"
  const formatDateHeader = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];

    const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    const dayNames = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']; // Dom, Seg, Ter, Qua, Qui, Sex, Sáb
    const dayLetter = dayNames[d.getDay()] || '';

    return `${month}.${day} . ${dayLetter}`;
  };

  // Itens de hoje para o card direito "Task - Today"
  const todayTasks = useMemo(() => {
    const list: {
      id: string;
      title: string;
      completed: boolean;
      type: 'bill' | 'appointment';
      amount?: number;
      time?: string;
      raw: PersonalBill | PersonalAppointment;
    }[] = [];

    bills.forEach((b) => {
      if (rightTaskView === 'today' && b.dueDate === todayStr) {
        list.push({
          id: b.id,
          title: b.title,
          completed: b.status === 'paid',
          type: 'bill',
          amount: b.amount,
          raw: b,
        });
      } else if (rightTaskView === 'pending' && b.status === 'pending') {
        list.push({
          id: b.id,
          title: b.title,
          completed: false,
          type: 'bill',
          amount: b.amount,
          raw: b,
        });
      }
    });

    appointments.forEach((a) => {
      if (rightTaskView === 'today' && a.date === todayStr) {
        list.push({
          id: a.id,
          title: a.title,
          completed: a.completed,
          type: 'appointment',
          time: a.time,
          raw: a,
        });
      } else if (rightTaskView === 'pending' && !a.completed) {
        list.push({
          id: a.id,
          title: a.title,
          completed: false,
          type: 'appointment',
          time: a.time,
          raw: a,
        });
      }
    });

    return list;
  }, [bills, appointments, rightTaskView, todayStr]);

  // Contas do Google Calendar detectadas
  const detectedCalendarBills = useMemo(() => {
    const keywords = ['pagar', 'boleto', 'conta', 'fatura', 'aluguel', 'água', 'luz', 'internet', 'inglês'];
    const candidates: { summary: string; date: string; existing: boolean }[] = [];

    googleEvents.forEach((ev) => {
      const titleLower = (ev.summary || '').toLowerCase();
      if (keywords.some((kw) => titleLower.includes(kw))) {
        const rawDate = ev.start?.date || ev.start?.dateTime?.split('T')[0] || '';
        if (rawDate) {
          const alreadyExists = bills.some(
            (b) =>
              b.title.toLowerCase().includes(titleLower.trim()) ||
              titleLower.includes(b.title.toLowerCase().trim())
          );
          candidates.push({ summary: ev.summary, date: rawDate, existing: alreadyExists });
        }
      }
    });
    return candidates;
  }, [googleEvents, bills]);

  const handleToggleEntry = (item: { type: 'bill' | 'appointment'; raw: any }) => {
    if (item.type === 'bill') {
      const b = item.raw as PersonalBill;
      const isNowPaid = b.status === 'pending';
      onUpdateBill({
        ...b,
        status: isNowPaid ? 'paid' : 'pending',
        paidAt: isNowPaid ? todayStr : undefined,
      });
    } else {
      const a = item.raw as PersonalAppointment;
      onUpdateAppointment({
        ...a,
        completed: !a.completed,
      });
    }
  };

  const handleDeleteEntry = (item: { type: 'bill' | 'appointment'; id: string }) => {
    if (item.type === 'bill') onDeleteBill(item.id);
    else onDeleteAppointment(item.id);
  };

  const handleQuickAddLeft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInputLeft.trim()) return;

    if (quickTypeLeft === 'bill') {
      const newBill: PersonalBill = {
        id: `bill-${Date.now()}`,
        title: quickInputLeft.trim(),
        amount: 0,
        dueDate: todayStr,
        category: 'outros',
        status: 'pending',
      };
      onAddBill(newBill);
    } else {
      const newApp: PersonalAppointment = {
        id: `app-${Date.now()}`,
        title: quickInputLeft.trim(),
        date: todayStr,
        category: 'pessoal',
        completed: false,
      };
      onAddAppointment(newApp);
    }
    setQuickInputLeft('');
  };

  const handleQuickAddRight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInputRight.trim()) return;
    const newApp: PersonalAppointment = {
      id: `app-quick-${Date.now()}`,
      title: quickInputRight.trim(),
      date: todayStr,
      category: 'pessoal',
      completed: false,
    };
    onAddAppointment(newApp);
    setQuickInputRight('');
  };

  const handleOpenAddBill = () => {
    setEditingBill(null);
    setBillTitle('');
    setBillAmount('');
    setBillDueDate(todayStr);
    setBillCategory('moradia');
    setBillNotes('');
    setBillBarcode('');
    setIsBillModalOpen(true);
  };

  const handleOpenEditBill = (b: PersonalBill) => {
    setEditingBill(b);
    setBillTitle(b.title);
    setBillAmount(String(b.amount));
    setBillDueDate(b.dueDate);
    setBillCategory(b.category);
    setBillNotes(b.notes || '');
    setBillBarcode(b.barcodeOrLink || '');
    setIsBillModalOpen(true);
  };

  const handleSaveBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!billTitle.trim()) return;
    const amt = parseFloat(billAmount.replace(',', '.')) || 0;

    if (editingBill) {
      onUpdateBill({
        ...editingBill,
        title: billTitle.trim(),
        amount: amt,
        dueDate: billDueDate,
        category: billCategory,
        notes: billNotes.trim() || undefined,
        barcodeOrLink: billBarcode.trim() || undefined,
      });
    } else {
      onAddBill({
        id: `bill-${Date.now()}`,
        title: billTitle.trim(),
        amount: amt,
        dueDate: billDueDate,
        category: billCategory,
        status: 'pending',
        notes: billNotes.trim() || undefined,
        barcodeOrLink: billBarcode.trim() || undefined,
      });
    }
    setIsBillModalOpen(false);
  };

  const handleOpenAddAppointment = () => {
    setEditingApp(null);
    setAppTitle('');
    setAppDate(todayStr);
    setAppTime('14:00');
    setAppLocation('');
    setAppCategory('pessoal');
    setAppNotes('');
    setIsAppModalOpen(true);
  };

  const handleOpenEditAppointment = (a: PersonalAppointment) => {
    setEditingApp(a);
    setAppTitle(a.title);
    setAppDate(a.date);
    setAppTime(a.time || '14:00');
    setAppLocation(a.location || '');
    setAppCategory(a.category);
    setAppNotes(a.notes || '');
    setIsAppModalOpen(true);
  };

  const handleSaveAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appTitle.trim()) return;

    if (editingApp) {
      onUpdateAppointment({
        ...editingApp,
        title: appTitle.trim(),
        date: appDate,
        time: appTime || undefined,
        location: appLocation.trim() || undefined,
        category: appCategory,
        notes: appNotes.trim() || undefined,
      });
    } else {
      onAddAppointment({
        id: `app-${Date.now()}`,
        title: appTitle.trim(),
        date: appDate,
        time: appTime || undefined,
        location: appLocation.trim() || undefined,
        category: appCategory,
        completed: false,
        notes: appNotes.trim() || undefined,
      });
    }
    setIsAppModalOpen(false);
  };

  const handleCopyBarcode = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12 animate-fadeIn">
      {/* ======================================================== */}
      {/* NOTION COVER BANNER (ESTILO COZY DESK / BULLET JOURNAL)  */}
      {/* ======================================================== */}
      <div className="relative w-full rounded-2xl overflow-hidden border border-[#e9e9e8] dark:border-[#2f2f2f] bg-white dark:bg-[#202020] shadow-xs">
        {/* Imagem de Capa do Notion */}
        <div className="h-44 md:h-52 w-full relative overflow-hidden bg-stone-800">
          <img
            src="https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1600&q=80"
            alt="Bullet Journal Cover"
            className="w-full h-full object-cover object-center filter brightness-90 contrast-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />

          {/* Botão de Sync Rápido no topo da imagem */}
          {detectedCalendarBills.filter((c) => !c.existing).length > 0 && (
            <div className="absolute top-4 right-4">
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur text-xs font-medium border border-white/20 transition-all shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                <span>{detectedCalendarBills.filter((c) => !c.existing).length} contas na agenda</span>
              </button>
            </div>
          )}
        </div>

        {/* Ícone de Nuvem / Cloud Badge (sobrepondo a borda como no Notion) */}
        <div className="px-6 md:px-8 pb-5 pt-0 relative">
          <div className="-mt-7 mb-3 inline-block">
            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-[#202020] border-2 border-white dark:border-[#202020] shadow-md flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Cloud className="w-8 h-8 fill-blue-500/20" />
            </div>
          </div>

          {/* Título Principal */}
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-[#ecebe8] dark:border-[#2f2f2f] pb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#37352f] dark:text-[#f3f3f2] tracking-tight">
                Bullet Journal (Vida Pessoal & Finanças)
              </h1>
              <p className="text-xs md:text-sm text-[#787774] dark:text-[#9b9a97] mt-0.5">
                Controle diário de rotina, contas a pagar, compromissos e metas no estilo minimalista.
              </p>
            </div>

            {/* Ações rápidas de criação */}
            <div className="flex items-center gap-2 pt-2 sm:pt-0">
              <button
                onClick={handleOpenAddAppointment}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-xs font-semibold text-[#37352f] dark:text-stone-200 transition-colors"
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>+ Compromisso</span>
              </button>
              <button
                onClick={handleOpenAddBill}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white transition-colors shadow-xs"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>+ Conta a Pagar</span>
              </button>
            </div>
          </div>

          {/* Toggle Notion: ▶ How to get started */}
          <div className="pt-3">
            <button
              onClick={() => setIsGuideOpen(!isGuideOpen)}
              className="flex items-center gap-1.5 text-xs text-[#787774] dark:text-[#9b9a97] hover:text-[#37352f] dark:hover:text-white transition-colors select-none font-medium"
            >
              <span className="text-[10px] transform transition-transform duration-150">
                {isGuideOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </span>
              <span>Legenda do Bullet Journal & Dicas de Uso</span>
            </button>

            {isGuideOpen && (
              <div className="mt-2.5 p-3.5 rounded-xl bg-stone-50 dark:bg-[#1a1a1a] border border-[#e9e9e8] dark:border-[#2f2f2f] text-xs text-[#5a5855] dark:text-[#a8a7a4] space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-white dark:bg-stone-800 border">□</span>
                    <span>Tarefa pessoal</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-white dark:bg-stone-800 border">💳</span>
                    <span>Conta a Pagar</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-white dark:bg-stone-800 border">○</span>
                    <span>Compromisso / Médico</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-white dark:bg-stone-800 border">✓</span>
                    <span>Concluído / Pago</span>
                  </div>
                </div>
                <p className="text-[11px] text-[#787774] dark:text-[#9b9a97]">
                  💡 Clique nos botões de símbolo no topo da coluna para filtrar ou registrar rapidamente novos itens. Suas alterações sincronizam automaticamente com a nuvem e com seu Google Calendar.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* LAYOUT 2 COLUNAS (EXATAMENTE COMO NO MODELO DO PRINT)    */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ====================================================== */}
        {/* COLUNA ESQUERDA: BULLET JOURNAL (DAILY LOG) (7 COLS)   */}
        {/* ====================================================== */}
        <div className="lg:col-span-7 bg-white dark:bg-[#202020] border border-[#e9e9e8] dark:border-[#2d2d2d] rounded-2xl p-5 shadow-xs space-y-4">
          {/* Card Header com Ícone de Nuvem */}
          <div className="flex items-center gap-2 text-xs font-semibold text-[#787774] dark:text-[#9b9a97]">
            <Cloud className="w-4 h-4 text-stone-400" />
            <span className="tracking-wide">Bullet Journal</span>
          </div>

          {/* Barra de 6 Símbolos / Atalhos (igual ao print) */}
          <div className="grid grid-cols-6 gap-2">
            <button
              onClick={() => {
                setQuickTypeLeft('appointment');
                setLeftView('all');
              }}
              title="Tarefa Pessoal (□)"
              className="py-2.5 rounded-xl border border-[#ecebe8] dark:border-[#2f2f2f] hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 font-mono text-sm flex items-center justify-center transition-colors"
            >
              □
            </button>
            <button
              onClick={() => {
                setQuickTypeLeft('appointment');
                setLeftView('appointments');
              }}
              title="Compromisso / Evento (○)"
              className="py-2.5 rounded-xl border border-[#ecebe8] dark:border-[#2f2f2f] hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 font-mono text-sm flex items-center justify-center transition-colors"
            >
              ○
            </button>
            <button
              onClick={() => setLeftView('all')}
              title="Nota / Anotação (—)"
              className="py-2.5 rounded-xl border border-[#ecebe8] dark:border-[#2f2f2f] hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 font-mono text-sm flex items-center justify-center transition-colors"
            >
              —
            </button>
            <button
              onClick={handleOpenAddBill}
              title="Nova Conta a Pagar (+)"
              className="py-2.5 rounded-xl border border-[#ecebe8] dark:border-[#2f2f2f] hover:bg-stone-50 dark:hover:bg-stone-800 text-emerald-600 dark:text-emerald-400 font-mono text-sm font-bold flex items-center justify-center transition-colors"
            >
              +
            </button>
            <button
              onClick={() => setLeftView('bills')}
              title="Contas a Pagar (*)"
              className="py-2.5 rounded-xl border border-[#ecebe8] dark:border-[#2f2f2f] hover:bg-stone-50 dark:hover:bg-stone-800 text-amber-600 dark:text-amber-400 font-mono text-sm flex items-center justify-center transition-colors"
            >
              *
            </button>
            <button
              onClick={() => setIsImportModalOpen(true)}
              title="Sincronizar Google Calendar (△)"
              className="py-2.5 rounded-xl border border-[#ecebe8] dark:border-[#2f2f2f] hover:bg-stone-50 dark:hover:bg-stone-800 text-purple-600 dark:text-purple-400 font-mono text-sm flex items-center justify-center transition-colors"
            >
              △
            </button>
          </div>

          {/* Sub-Abas: 📅 Daily Log | 📅 Monthly Log | 📅 Future Log */}
          <div className="flex items-center gap-1 border-b border-[#ecebe8] dark:border-[#2f2f2f] pb-2 text-xs overflow-x-auto">
            <button
              onClick={() => setLeftView('daily')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
                leftView === 'daily'
                  ? 'border-b-2 border-stone-900 dark:border-white text-[#37352f] dark:text-white font-semibold'
                  : 'text-[#787774] dark:text-[#9b9a97] hover:text-[#37352f]'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Daily Log</span>
            </button>

            <button
              onClick={() => setLeftView('bills')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
                leftView === 'bills'
                  ? 'border-b-2 border-emerald-600 text-emerald-600 dark:text-emerald-400 font-semibold'
                  : 'text-[#787774] dark:text-[#9b9a97] hover:text-[#37352f]'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Contas a Pagar ({bills.length})</span>
            </button>

            <button
              onClick={() => setLeftView('appointments')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
                leftView === 'appointments'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                  : 'text-[#787774] dark:text-[#9b9a97] hover:text-[#37352f]'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Compromissos ({appointments.length})</span>
            </button>

            <button
              onClick={() => setLeftView('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
                leftView === 'all'
                  ? 'border-b-2 border-purple-600 text-purple-600 dark:text-purple-400 font-semibold'
                  : 'text-[#787774] dark:text-[#9b9a97] hover:text-[#37352f]'
              }`}
            >
              <span>Ver Todos</span>
            </button>
          </div>

          {/* Timeline agrupada por data (estilo Notion do print) */}
          <div className="space-y-4 pt-1">
            {Object.keys(groupedDailyLog).length === 0 ? (
              <div className="py-10 text-center text-xs text-[#787774] dark:text-[#9b9a97]">
                Nenhum registro para visualização no momento.
              </div>
            ) : (
              Object.entries(groupedDailyLog).map(([dateKey, items]) => {
                const isToday = dateKey === todayStr;

                return (
                  <div key={dateKey} className="space-y-2">
                    {/* Header da Data: ▼ 03.09 . S  1 */}
                    <div className="flex items-center justify-between text-xs font-mono font-semibold text-[#787774] dark:text-[#9b9a97] select-none pt-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px]">▼</span>
                        <span className={isToday ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}>
                          {formatDateHeader(dateKey)}
                        </span>
                        {isToday && (
                          <span className="text-[10px] font-sans px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-normal">
                            hoje
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-stone-400">{items.length}</span>
                    </div>

                    {/* Linhas de Itens dessa Data */}
                    <div className="space-y-1.5 pl-3 border-l-2 border-[#ecebe8] dark:border-[#2f2f2f]">
                      {items.map((item) => {
                        const isBill = item.type === 'bill';
                        const isDone = item.completed;

                        return (
                          <div
                            key={item.id}
                            className={`group flex items-center justify-between gap-2 p-2 rounded-xl text-xs hover:bg-stone-50 dark:hover:bg-[#252525] transition-colors ${
                              isDone ? 'opacity-60' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              {/* Símbolo / Ícone */}
                              <span className="text-stone-500 font-mono shrink-0">
                                {isBill ? '💳' : '○'}
                              </span>

                              {/* Título */}
                              <span
                                className={`truncate font-medium ${
                                  isDone
                                    ? 'line-through text-[#787774] dark:text-[#9b9a97]'
                                    : 'text-[#37352f] dark:text-[#ececed]'
                                }`}
                              >
                                {item.title}
                              </span>

                              {/* Valor ou Hora */}
                              {isBill && typeof item.amount === 'number' && item.amount > 0 && (
                                <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                                  {formatBRL(item.amount)}
                                </span>
                              )}

                              {item.time && (
                                <span className="shrink-0 text-[10px] text-stone-400 font-mono">
                                  {item.time}
                                </span>
                              )}
                            </div>

                            {/* Checkbox estilo Notion na direita */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handleToggleEntry(item)}
                                title={isDone ? 'Reabrir' : 'Concluir'}
                                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                  isDone
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : 'border-stone-300 dark:border-stone-600 hover:border-blue-500'
                                }`}
                              >
                                {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                              </button>

                              <button
                                onClick={() => {
                                  if (isBill) handleOpenEditBill(item.raw as PersonalBill);
                                  else handleOpenEditAppointment(item.raw as PersonalAppointment);
                                }}
                                title="Editar"
                                className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-opacity"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>

                              <button
                                onClick={() => handleDeleteEntry(item)}
                                title="Excluir"
                                className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-red-600 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick inline entry no rodapé do Bullet Journal */}
          <form
            onSubmit={handleQuickAddLeft}
            className="pt-3 border-t border-[#ecebe8] dark:border-[#2f2f2f] flex items-center gap-2"
          >
            <select
              value={quickTypeLeft}
              onChange={(e) => setQuickTypeLeft(e.target.value as any)}
              className="text-xs bg-stone-100 dark:bg-stone-800 text-[#787774] dark:text-stone-300 rounded-lg px-2 py-1.5 border-0 focus:ring-1 focus:ring-stone-400"
            >
              <option value="bill">💳 Conta</option>
              <option value="appointment">○ Compromisso</option>
            </select>
            <input
              type="text"
              placeholder="+ Novo registro no diário pessoal..."
              value={quickInputLeft}
              onChange={(e) => setQuickInputLeft(e.target.value)}
              className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-[#ecebe8] dark:border-[#2f2f2f] bg-stone-50 dark:bg-[#1a1a1a] text-[#37352f] dark:text-white focus:outline-none focus:ring-1 focus:ring-stone-400"
            />
          </form>
        </div>

        {/* ====================================================== */}
        {/* COLUNA DIREITA: TASK & MONTHLY GOALS (5 COLS)          */}
        {/* ====================================================== */}
        <div className="lg:col-span-5 space-y-5">
          {/* CARD 1: Task (Today) (igual ao print) */}
          <div className="bg-white dark:bg-[#202020] border border-[#e9e9e8] dark:border-[#2d2d2d] rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#787774] dark:text-[#9b9a97]">
              <Cloud className="w-4 h-4 text-stone-400" />
              <span className="tracking-wide">Task</span>
            </div>

            {/* Tab: ⊞ Today | ⚠️ Pendentes */}
            <div className="flex items-center gap-2 border-b border-[#ecebe8] dark:border-[#2f2f2f] pb-2 text-xs">
              <button
                onClick={() => setRightTaskView('today')}
                className={`flex items-center gap-1.5 font-medium transition-colors ${
                  rightTaskView === 'today'
                    ? 'text-stone-900 dark:text-white font-semibold'
                    : 'text-[#787774] dark:text-[#9b9a97]'
                }`}
              >
                <span>⊞ Today</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-800">
                  {todayTasks.length}
                </span>
              </button>

              <button
                onClick={() => setRightTaskView('pending')}
                className={`flex items-center gap-1.5 font-medium transition-colors ${
                  rightTaskView === 'pending'
                    ? 'text-stone-900 dark:text-white font-semibold'
                    : 'text-[#787774] dark:text-[#9b9a97]'
                }`}
              >
                <span>Todas Pendentes</span>
              </button>
            </div>

            {/* Cabeçalho de Colunas: ✓ Aa Name | → | ✕ */}
            <div className="flex items-center justify-between text-[11px] font-mono text-[#9b9a97] dark:text-[#787774] px-2">
              <span className="flex items-center gap-1">✓ Aa Name</span>
              <div className="flex items-center gap-3">
                <span>→</span>
                <span>✕</span>
              </div>
            </div>

            {/* Lista de Tarefas de Hoje */}
            <div className="space-y-1">
              {todayTasks.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#787774] dark:text-[#9b9a97]">
                  Tudo em dia para hoje! 🎉
                </div>
              ) : (
                todayTasks.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-2 rounded-xl text-xs hover:bg-stone-50 dark:hover:bg-[#252525] transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <button
                        onClick={() => handleToggleEntry(t as any)}
                        className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${
                          t.completed
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-stone-400 dark:border-stone-600'
                        }`}
                      >
                        {t.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </button>
                      <span
                        className={`truncate ${
                          t.completed
                            ? 'line-through text-[#787774] dark:text-[#9b9a97]'
                            : 'text-[#37352f] dark:text-white font-medium'
                        }`}
                      >
                        {t.type === 'bill' ? `* ${t.title}` : t.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {t.amount !== undefined && t.amount > 0 && (
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                          {formatBRL(t.amount)}
                        </span>
                      )}
                      <button
                        onClick={() => handleDeleteEntry(t as any)}
                        className="text-stone-400 hover:text-red-600 p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quick add de tarefa */}
            <form onSubmit={handleQuickAddRight} className="pt-2">
              <input
                type="text"
                placeholder="+ Adicionar tarefa de hoje..."
                value={quickInputRight}
                onChange={(e) => setQuickInputRight(e.target.value)}
                className="w-full text-xs px-3 py-1.5 rounded-lg border border-[#ecebe8] dark:border-[#2f2f2f] bg-stone-50 dark:bg-[#1a1a1a] text-[#37352f] dark:text-white focus:outline-none focus:ring-1 focus:ring-stone-400"
              />
            </form>
          </div>

          {/* CARD 2: Monthly Task & Goals / Finanças do Mês (igual ao print) */}
          <div className="bg-white dark:bg-[#202020] border border-[#e9e9e8] dark:border-[#2d2d2d] rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#787774] dark:text-[#9b9a97]">
              <Cloud className="w-4 h-4 text-stone-400" />
              <span className="tracking-wide">Monthly Task & Goals</span>
            </div>

            {/* Tabs: ⊞ Monthly | ⊞ All */}
            <div className="flex items-center gap-3 border-b border-[#ecebe8] dark:border-[#2f2f2f] pb-2 text-xs">
              <button
                onClick={() => setMonthlyView('monthly')}
                className={`font-medium transition-colors ${
                  monthlyView === 'monthly'
                    ? 'text-stone-900 dark:text-white font-semibold'
                    : 'text-[#787774] dark:text-[#9b9a97]'
                }`}
              >
                ⊞ Monthly
              </button>
              <button
                onClick={() => setMonthlyView('all')}
                className={`font-medium transition-colors ${
                  monthlyView === 'all'
                    ? 'text-stone-900 dark:text-white font-semibold'
                    : 'text-[#787774] dark:text-[#9b9a97]'
                }`}
              >
                ⊞ All
              </button>
            </div>

            {/* Grupo: ▼ Nov 2026  6 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono font-semibold text-[#787774] dark:text-[#9b9a97] pt-1 select-none">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px]">▼</span>
                  <span>Nov 2026</span>
                </div>
                <span className="text-[10px] text-stone-400">{bills.length}</span>
              </div>

              {/* Linhas de Contas do Mês com Checkboxes */}
              <div className="space-y-1.5">
                {bills.map((bill) => {
                  const isPaid = bill.status === 'paid';

                  return (
                    <div
                      key={bill.id}
                      className="group flex items-center justify-between p-2 rounded-xl text-xs hover:bg-stone-50 dark:hover:bg-[#252525] transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <button
                          onClick={() => {
                            const isNowPaid = bill.status === 'pending';
                            onUpdateBill({
                              ...bill,
                              status: isNowPaid ? 'paid' : 'pending',
                              paidAt: isNowPaid ? todayStr : undefined,
                            });
                          }}
                          className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${
                            isPaid
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-stone-400 dark:border-stone-600'
                          }`}
                        >
                          {isPaid && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </button>

                        <span
                          className={`truncate font-medium ${
                            isPaid
                              ? 'line-through text-[#787774] dark:text-[#9b9a97]'
                              : 'text-[#37352f] dark:text-white'
                          }`}
                        >
                          → {bill.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`font-mono text-[11px] font-semibold ${
                            isPaid
                              ? 'text-stone-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {formatBRL(bill.amount)}
                        </span>

                        {bill.barcodeOrLink && (
                          <button
                            onClick={() => handleCopyBarcode(bill.id, bill.barcodeOrLink!)}
                            title="Copiar Código de Barras / PIX"
                            className="p-1 text-stone-400 hover:text-emerald-600"
                          >
                            {copiedId === bill.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Resumo Financeiro no Rodapé do Card */}
              <div className="pt-3 border-t border-[#ecebe8] dark:border-[#2f2f2f] flex items-center justify-between text-xs">
                <div>
                  <span className="text-[#787774] dark:text-[#9b9a97] block text-[10px] uppercase font-semibold">
                    A Pagar Pendente:
                  </span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {formatBRL(pendingTotal)}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[#787774] dark:text-[#9b9a97] block text-[10px] uppercase font-semibold">
                    Total Já Pago:
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {formatBRL(paidTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======================= MODAL CONTA A PAGAR ======================= */}
      {isBillModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#202020] border border-[#e9e9e8] dark:border-[#333] rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#f0efec] dark:border-[#2d2d2d]">
              <h3 className="text-base font-bold text-[#37352f] dark:text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>{editingBill ? 'Editar Conta' : 'Nova Conta a Pagar'}</span>
              </h3>
              <button
                onClick={() => setIsBillModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveBill} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#787774] dark:text-[#9b9a97] mb-1">
                  Nome da Conta *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pagar a Luz, Pagar Água, Pagar o Inglês"
                  value={billTitle}
                  onChange={(e) => setBillTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#e9e9e8] dark:border-[#333] bg-stone-50 dark:bg-[#191919] text-[#37352f] dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#787774] dark:text-[#9b9a97] mb-1">
                    Valor (R$)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 164,20"
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#e9e9e8] dark:border-[#333] bg-stone-50 dark:bg-[#191919] text-[#37352f] dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#787774] dark:text-[#9b9a97] mb-1">
                    Vencimento *
                  </label>
                  <input
                    type="date"
                    required
                    value={billDueDate}
                    onChange={(e) => setBillDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#e9e9e8] dark:border-[#333] bg-stone-50 dark:bg-[#191919] text-[#37352f] dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#787774] dark:text-[#9b9a97] mb-1">
                  PIX ou Código de Barras (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Cole o código para copiar com 1 clique"
                  value={billBarcode}
                  onChange={(e) => setBillBarcode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#e9e9e8] dark:border-[#333] bg-stone-50 dark:bg-[#191919] text-[#37352f] dark:text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#787774] dark:text-[#9b9a97] mb-1">
                  Observações
                </label>
                <textarea
                  rows={2}
                  placeholder="Lembretes, detalhes de pagamento..."
                  value={billNotes}
                  onChange={(e) => setBillNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#e9e9e8] dark:border-[#333] bg-stone-50 dark:bg-[#191919] text-[#37352f] dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f0efec] dark:border-[#2d2d2d]">
                <button
                  type="button"
                  onClick={() => setIsBillModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                >
                  Salvar Conta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================= MODAL COMPROMISSO ======================= */}
      {isAppModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#202020] border border-[#e9e9e8] dark:border-[#333] rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#f0efec] dark:border-[#2d2d2d]">
              <h3 className="text-base font-bold text-[#37352f] dark:text-white flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-blue-600" />
                <span>{editingApp ? 'Editar Compromisso' : 'Novo Compromisso'}</span>
              </h3>
              <button
                onClick={() => setIsAppModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveAppointment} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#787774] dark:text-[#9b9a97] mb-1">
                  Título do Compromisso *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Marcar dentista, Consulta médica, Mercado"
                  value={appTitle}
                  onChange={(e) => setAppTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#e9e9e8] dark:border-[#333] bg-stone-50 dark:bg-[#191919] text-[#37352f] dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#787774] dark:text-[#9b9a97] mb-1">
                    Data *
                  </label>
                  <input
                    type="date"
                    required
                    value={appDate}
                    onChange={(e) => setAppDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#e9e9e8] dark:border-[#333] bg-stone-50 dark:bg-[#191919] text-[#37352f] dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#787774] dark:text-[#9b9a97] mb-1">
                    Horário
                  </label>
                  <input
                    type="time"
                    value={appTime}
                    onChange={(e) => setAppTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#e9e9e8] dark:border-[#333] bg-stone-50 dark:bg-[#191919] text-[#37352f] dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#787774] dark:text-[#9b9a97] mb-1">
                  Localização (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Consultório Dr. Marcelo"
                  value={appLocation}
                  onChange={(e) => setAppLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#e9e9e8] dark:border-[#333] bg-stone-50 dark:bg-[#191919] text-[#37352f] dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#787774] dark:text-[#9b9a97] mb-1">
                  Observações
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Levar exames anteriores..."
                  value={appNotes}
                  onChange={(e) => setAppNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#e9e9e8] dark:border-[#333] bg-stone-50 dark:bg-[#191919] text-[#37352f] dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f0efec] dark:border-[#2d2d2d]">
                <button
                  type="button"
                  onClick={() => setIsAppModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================= MODAL IMPORTAR DA AGENDA ======================= */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#202020] border border-[#e9e9e8] dark:border-[#333] rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#f0efec] dark:border-[#2d2d2d]">
              <h3 className="text-sm font-bold text-[#37352f] dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Contas Detectadas na sua Google Agenda</span>
              </h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-[#787774] dark:text-[#9b9a97]">
              Encontramos os seguintes lembretes financeiros na sua agenda:
            </p>

            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 text-xs">
              {detectedCalendarBills.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-[#e9e9e8] dark:border-[#333]"
                >
                  <div>
                    <h5 className="font-semibold text-[#37352f] dark:text-white">
                      {item.summary}
                    </h5>
                    <span className="text-[11px] text-[#787774] dark:text-[#9b9a97]">
                      {item.date.split('-').reverse().join('/')}
                    </span>
                  </div>

                  {item.existing ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                      Já adicionado ✓
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        const newBill: PersonalBill = {
                          id: `bill-imported-${Date.now()}`,
                          title: item.summary,
                          amount: 0,
                          dueDate: item.date,
                          category: 'moradia',
                          status: 'pending',
                          recurring: 'monthly',
                          notes: 'Importado da Google Agenda',
                        };
                        onAddBill(newBill);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs transition-colors"
                    >
                      Adicionar
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-[#f0efec] dark:border-[#2d2d2d]">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-stone-900 text-white dark:bg-white dark:text-stone-900 text-xs font-semibold"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
