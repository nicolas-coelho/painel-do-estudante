import React, { useState, useMemo } from 'react';
import {
  PersonalBill,
  PersonalAppointment,
  BillCategory,
  AppointmentCategory,
} from '../types';
import { GoogleCalendarEvent } from '../googleCalendar';
import {
  DollarSign,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
  Plus,
  Filter,
  Trash2,
  Edit2,
  Check,
  RotateCcw,
  Sparkles,
  ExternalLink,
  MapPin,
  TrendingDown,
  CreditCard,
  Heart,
  Home as HomeIcon,
  Wifi,
  GraduationCap,
  ShoppingBag,
  Car,
  HelpCircle,
  Copy,
  ChevronDown,
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

const CATEGORY_CONFIG: Record<
  BillCategory,
  { label: string; icon: any; color: string; bg: string; darkBg: string }
> = {
  moradia: {
    label: 'Moradia / Utilidades',
    icon: HomeIcon,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    darkBg: 'dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
  },
  servicos: {
    label: 'Serviços & Internet',
    icon: Wifi,
    color: 'text-cyan-600 dark:text-cyan-400',
    bg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    darkBg: 'dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800/60',
  },
  educacao: {
    label: 'Educação / Cursos',
    icon: GraduationCap,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 text-blue-700 border-blue-200',
    darkBg: 'dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60',
  },
  saude: {
    label: 'Saúde & Cuidados',
    icon: Heart,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 text-rose-700 border-rose-200',
    darkBg: 'dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
  },
  alimentacao: {
    label: 'Alimentação / Mercado',
    icon: ShoppingBag,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    darkBg: 'dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
  },
  transporte: {
    label: 'Transporte / Veículo',
    icon: Car,
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 text-violet-700 border-violet-200',
    darkBg: 'dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800/60',
  },
  lazer: {
    label: 'Lazer & Assinaturas',
    icon: Sparkles,
    color: 'text-pink-600 dark:text-pink-400',
    bg: 'bg-pink-50 text-pink-700 border-pink-200',
    darkBg: 'dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800/60',
  },
  outros: {
    label: 'Outros',
    icon: HelpCircle,
    color: 'text-stone-600 dark:text-stone-400',
    bg: 'bg-stone-50 text-stone-700 border-stone-200',
    darkBg: 'dark:bg-stone-900/60 dark:text-stone-300 dark:border-stone-800',
  },
};

const APPOINTMENT_CATEGORY_CONFIG: Record<
  AppointmentCategory,
  { label: string; icon: any; color: string; badgeClass: string }
> = {
  saude: {
    label: 'Saúde & Médico',
    icon: Heart,
    color: 'text-rose-500',
    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
  },
  pessoal: {
    label: 'Pessoal / Rotina',
    icon: UserCheckIcon,
    color: 'text-blue-500',
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
  },
  financeiro: {
    label: 'Financeiro',
    icon: DollarSign,
    color: 'text-emerald-500',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
  },
  estudo: {
    label: 'Estudo Pessoal',
    icon: GraduationCap,
    color: 'text-purple-500',
    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800/60',
  },
  outro: {
    label: 'Outro',
    icon: HelpCircle,
    color: 'text-stone-500',
    badgeClass: 'bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-300 border-stone-200 dark:border-stone-700',
  },
};

function UserCheckIcon(props: any) {
  return <CheckCircle2 {...props} />;
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
  const [activeSubTab, setActiveSubTab] = useState<'bills' | 'appointments'>('bills');
  const [billFilter, setBillFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modais
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<PersonalBill | null>(null);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<PersonalAppointment | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Form states - Contas
  const [billTitle, setBillTitle] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billDueDate, setBillDueDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [billCategory, setBillCategory] = useState<BillCategory>('moradia');
  const [billRecurring, setBillRecurring] = useState<'none' | 'monthly' | 'yearly'>('monthly');
  const [billNotes, setBillNotes] = useState('');
  const [billBarcode, setBillBarcode] = useState('');

  // Form states - Compromissos
  const [appTitle, setAppTitle] = useState('');
  const [appDate, setAppDate] = useState(new Date().toISOString().split('T')[0]);
  const [appTime, setAppTime] = useState('14:00');
  const [appLocation, setAppLocation] = useState('');
  const [appCategory, setAppCategory] = useState<AppointmentCategory>('pessoal');
  const [appNotes, setAppNotes] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  // Helper para formatar moeda brasileira
  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Status de vencimento
  const getDueStatus = (dueDate: string, status: 'pending' | 'paid') => {
    if (status === 'paid') return { label: 'Pago', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60' };
    if (dueDate < todayStr) return { label: 'Atrasado', color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/60' };
    if (dueDate === todayStr) return { label: 'Vence hoje!', color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60' };
    return { label: `Vence ${dueDate.split('-').reverse().slice(0, 2).join('/')}`, color: 'text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700' };
  };

  // Cálculos de métricas
  const metrics = useMemo(() => {
    let pendingTotal = 0;
    let paidTotal = 0;
    let overdueCount = 0;
    let pendingCount = 0;

    bills.forEach((b) => {
      if (b.status === 'paid') {
        paidTotal += Number(b.amount) || 0;
      } else {
        pendingTotal += Number(b.amount) || 0;
        pendingCount++;
        if (b.dueDate < todayStr) overdueCount++;
      }
    });

    const pendingAppointments = appointments.filter((a) => !a.completed);

    return {
      pendingTotal,
      paidTotal,
      overdueCount,
      pendingCount,
      totalBills: bills.length,
      pendingAppointmentsCount: pendingAppointments.length,
    };
  }, [bills, appointments, todayStr]);

  // Contas filtradas
  const filteredBills = useMemo(() => {
    return bills
      .filter((b) => {
        if (billFilter === 'pending') return b.status === 'pending';
        if (billFilter === 'paid') return b.status === 'paid';
        if (billFilter === 'overdue') return b.status === 'pending' && b.dueDate < todayStr;
        return true;
      })
      .filter((b) => {
        if (categoryFilter === 'all') return true;
        return b.category === categoryFilter;
      })
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [bills, billFilter, categoryFilter, todayStr]);

  // Compromissos ordenados
  const upcomingAppointments = useMemo(() => {
    return appointments
      .filter((a) => !a.completed)
      .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
  }, [appointments]);

  const completedAppointments = useMemo(() => {
    return appointments
      .filter((a) => a.completed)
      .sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));
  }, [appointments]);

  // Detecção inteligente de eventos pessoais / contas no Google Calendar
  const detectedCalendarBills = useMemo(() => {
    const keywords = ['pagar', 'boleto', 'conta', 'fatura', 'aluguel', 'água', 'luz', 'internet', 'inglês', 'mensalidade'];
    const candidates: { summary: string; date: string; existing: boolean }[] = [];

    googleEvents.forEach((ev) => {
      const titleLower = (ev.summary || '').toLowerCase();
      const isBill = keywords.some((kw) => titleLower.includes(kw));
      if (isBill) {
        const rawDate = ev.start?.date || ev.start?.dateTime?.split('T')[0] || '';
        if (rawDate) {
          const alreadyExists = bills.some(
            (b) =>
              b.title.toLowerCase().includes(titleLower.trim()) ||
              titleLower.includes(b.title.toLowerCase().trim())
          );
          candidates.push({
            summary: ev.summary,
            date: rawDate,
            existing: alreadyExists,
          });
        }
      }
    });

    return candidates;
  }, [googleEvents, bills]);

  // Abrir modal de criação de conta
  const handleOpenAddBill = () => {
    setEditingBill(null);
    setBillTitle('');
    setBillAmount('');
    setBillDueDate(todayStr);
    setBillCategory('moradia');
    setBillRecurring('monthly');
    setBillNotes('');
    setBillBarcode('');
    setIsBillModalOpen(true);
  };

  // Abrir modal de edição de conta
  const handleOpenEditBill = (bill: PersonalBill) => {
    setEditingBill(bill);
    setBillTitle(bill.title);
    setBillAmount(String(bill.amount));
    setBillDueDate(bill.dueDate);
    setBillCategory(bill.category);
    setBillRecurring(bill.recurring || 'none');
    setBillNotes(bill.notes || '');
    setBillBarcode(bill.barcodeOrLink || '');
    setIsBillModalOpen(true);
  };

  // Salvar conta
  const handleSaveBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!billTitle.trim()) return;

    const parsedAmount = parseFloat(billAmount.replace(',', '.')) || 0;

    if (editingBill) {
      onUpdateBill({
        ...editingBill,
        title: billTitle.trim(),
        amount: parsedAmount,
        dueDate: billDueDate,
        category: billCategory,
        recurring: billRecurring,
        notes: billNotes.trim() || undefined,
        barcodeOrLink: billBarcode.trim() || undefined,
      });
    } else {
      const newBill: PersonalBill = {
        id: `bill-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: billTitle.trim(),
        amount: parsedAmount,
        dueDate: billDueDate,
        category: billCategory,
        status: 'pending',
        recurring: billRecurring,
        notes: billNotes.trim() || undefined,
        barcodeOrLink: billBarcode.trim() || undefined,
      };
      onAddBill(newBill);
    }
    setIsBillModalOpen(false);
  };

  // Alternar status pago/pendente
  const handleToggleBillStatus = (bill: PersonalBill) => {
    const isNowPaid = bill.status === 'pending';
    onUpdateBill({
      ...bill,
      status: isNowPaid ? 'paid' : 'pending',
      paidAt: isNowPaid ? todayStr : undefined,
    });
  };

  // Abrir modal de compromisso
  const handleOpenAddAppointment = () => {
    setEditingAppointment(null);
    setAppTitle('');
    setAppDate(todayStr);
    setAppTime('14:00');
    setAppLocation('');
    setAppCategory('pessoal');
    setAppNotes('');
    setIsAppointmentModalOpen(true);
  };

  const handleOpenEditAppointment = (app: PersonalAppointment) => {
    setEditingAppointment(app);
    setAppTitle(app.title);
    setAppDate(app.date);
    setAppTime(app.time || '14:00');
    setAppLocation(app.location || '');
    setAppCategory(app.category);
    setAppNotes(app.notes || '');
    setIsAppointmentModalOpen(true);
  };

  const handleSaveAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appTitle.trim()) return;

    if (editingAppointment) {
      onUpdateAppointment({
        ...editingAppointment,
        title: appTitle.trim(),
        date: appDate,
        time: appTime || undefined,
        location: appLocation.trim() || undefined,
        category: appCategory,
        notes: appNotes.trim() || undefined,
      });
    } else {
      const newApp: PersonalAppointment = {
        id: `app-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: appTitle.trim(),
        date: appDate,
        time: appTime || undefined,
        location: appLocation.trim() || undefined,
        category: appCategory,
        completed: false,
        notes: appNotes.trim() || undefined,
        source: 'manual',
      };
      onAddAppointment(newApp);
    }
    setIsAppointmentModalOpen(false);
  };

  const handleToggleAppointmentCompleted = (app: PersonalAppointment) => {
    onUpdateAppointment({
      ...app,
      completed: !app.completed,
    });
  };

  const handleCopyBarcode = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Importar evento do Google Calendar como Conta
  const handleImportCalendarEvent = (item: { summary: string; date: string }) => {
    const lower = item.summary.toLowerCase();
    let category: BillCategory = 'moradia';
    if (lower.includes('inglês') || lower.includes('faculdade') || lower.includes('curso')) category = 'educacao';
    else if (lower.includes('luz') || lower.includes('água') || lower.includes('aluguel') || lower.includes('condomínio')) category = 'moradia';
    else if (lower.includes('net') || lower.includes('internet') || lower.includes('desktop')) category = 'servicos';

    const newBill: PersonalBill = {
      id: `bill-imported-${Date.now()}`,
      title: item.summary,
      amount: 0,
      dueDate: item.date,
      category,
      status: 'pending',
      recurring: 'monthly',
      notes: 'Importado automaticamente da sua agenda do Google',
    };
    onAddBill(newBill);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#202020] border border-[#e9e9e8] dark:border-[#2d2d2d] rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-2xl">🌱</span>
            <h1 className="text-xl md:text-2xl font-bold text-[#37352f] dark:text-white">
              Vida Pessoal & Finanças
            </h1>
          </div>
          <p className="text-sm text-[#787774] dark:text-[#9b9a97]">
            Controle de contas a pagar, vencimentos, finanças do mês e compromissos da sua rotina pessoal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {detectedCalendarBills.filter((c) => !c.existing).length > 0 && (
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs md:text-sm font-medium rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 transition-colors shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Sincronizar Contas da Agenda ({detectedCalendarBills.filter((c) => !c.existing).length})</span>
            </button>
          )}

          <button
            onClick={handleOpenAddAppointment}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs md:text-sm font-medium rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-[#37352f] dark:text-stone-200 transition-colors"
          >
            <CalendarIcon className="w-4 h-4" />
            <span>+ Novo Compromisso</span>
          </button>

          <button
            onClick={handleOpenAddBill}
            className="flex items-center gap-1.5 px-4 py-2 text-xs md:text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nova Conta a Pagar</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 md:gap-4">
        {/* Total a Pagar Pendente */}
        <div className="bg-white dark:bg-[#202020] border border-[#e9e9e8] dark:border-[#2d2d2d] rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#787774] dark:text-[#9b9a97] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">A Pagar (Pendente)</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl md:text-2xl font-bold text-[#37352f] dark:text-white">
              {formatBRL(metrics.pendingTotal)}
            </div>
            <div className="text-xs text-[#787774] dark:text-[#9b9a97] mt-1">
              {metrics.pendingCount} {metrics.pendingCount === 1 ? 'conta restante' : 'contas restantes'}
            </div>
          </div>
        </div>

        {/* Total Pago no Mês */}
        <div className="bg-white dark:bg-[#202020] border border-[#e9e9e8] dark:border-[#2d2d2d] rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#787774] dark:text-[#9b9a97] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Já Pago</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl md:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatBRL(metrics.paidTotal)}
            </div>
            <div className="text-xs text-[#787774] dark:text-[#9b9a97] mt-1">
              Contas quitadas com sucesso
            </div>
          </div>
        </div>

        {/* Contas Atrasadas / Alerta */}
        <div className={`border rounded-xl p-4 shadow-sm flex flex-col justify-between ${
          metrics.overdueCount > 0
            ? 'bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-900/60'
            : 'bg-white dark:bg-[#202020] border-[#e9e9e8] dark:border-[#2d2d2d]'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold uppercase tracking-wider ${
              metrics.overdueCount > 0 ? 'text-red-700 dark:text-red-400' : 'text-[#787774] dark:text-[#9b9a97]'
            }`}>
              Contas Vencidas
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              metrics.overdueCount > 0
                ? 'bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-400'
                : 'bg-stone-100 dark:bg-stone-800 text-[#787774]'
            }`}>
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className={`text-xl md:text-2xl font-bold ${
              metrics.overdueCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-[#37352f] dark:text-white'
            }`}>
              {metrics.overdueCount}
            </div>
            <div className="text-xs text-[#787774] dark:text-[#9b9a97] mt-1">
              {metrics.overdueCount === 0 ? 'Nenhuma conta atrasada 🎉' : 'Requer atenção imediata'}
            </div>
          </div>
        </div>

        {/* Compromissos Pessoais */}
        <div className="bg-white dark:bg-[#202020] border border-[#e9e9e8] dark:border-[#2d2d2d] rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#787774] dark:text-[#9b9a97] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Compromissos</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <CalendarIcon className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl md:text-2xl font-bold text-[#37352f] dark:text-white">
              {metrics.pendingAppointmentsCount}
            </div>
            <div className="text-xs text-[#787774] dark:text-[#9b9a97] mt-1">
              Médicos, rotina & recados agendados
            </div>
          </div>
        </div>
      </div>

      {/* Navegação entre Contas e Compromissos */}
      <div className="flex items-center justify-between border-b border-[#e9e9e8] dark:border-[#2d2d2d] pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('bills')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeSubTab === 'bills'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-[#787774] dark:text-[#9b9a97] hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Contas a Pagar ({bills.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('appointments')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeSubTab === 'appointments'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-[#787774] dark:text-[#9b9a97] hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>Compromissos & Rotina ({appointments.length})</span>
          </button>
        </div>
      </div>

      {/* ======================= ABA DE CONTAS A PAGAR ======================= */}
      {activeSubTab === 'bills' && (
        <div className="space-y-4">
          {/* Barra de Filtros */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#202020] border border-[#e9e9e8] dark:border-[#2d2d2d] rounded-xl p-3 shadow-sm">
            {/* Filtro por Status */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setBillFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  billFilter === 'all'
                    ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900'
                    : 'bg-stone-100 dark:bg-stone-800 text-[#787774] dark:text-[#9b9a97] hover:bg-stone-200'
                }`}
              >
                Todas ({bills.length})
              </button>
              <button
                onClick={() => setBillFilter('pending')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  billFilter === 'pending'
                    ? 'bg-amber-600 text-white'
                    : 'bg-stone-100 dark:bg-stone-800 text-[#787774] dark:text-[#9b9a97] hover:bg-stone-200'
                }`}
              >
                Pendentes ({metrics.pendingCount})
              </button>
              <button
                onClick={() => setBillFilter('overdue')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  billFilter === 'overdue'
                    ? 'bg-red-600 text-white'
                    : 'bg-stone-100 dark:bg-stone-800 text-[#787774] dark:text-[#9b9a97] hover:bg-stone-200'
                }`}
              >
                Atrasadas ({metrics.overdueCount})
              </button>
              <button
                onClick={() => setBillFilter('paid')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  billFilter === 'paid'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-100 dark:bg-stone-800 text-[#787774] dark:text-[#9b9a97] hover:bg-stone-200'
                }`}
              >
                Pagas ({bills.length - metrics.pendingCount})
              </button>
            </div>

            {/* Filtro por Categoria */}
            <div className="flex items-center gap-2 text-xs">
              <Filter className="w-3.5 h-3.5 text-[#787774]" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-stone-50 dark:bg-[#191919] border border-[#e9e9e8] dark:border-[#333] rounded-lg px-2.5 py-1.5 text-xs text-[#37352f] dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">Todas as Categorias</option>
                {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Lista de Contas */}
          {filteredBills.length === 0 ? (
            <div className="bg-white dark:bg-[#202020] border border-[#e9e9e8] dark:border-[#2d2d2d] rounded-2xl p-12 text-center shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center mx-auto mb-3 text-2xl">
                💳
              </div>
              <h3 className="text-base font-bold text-[#37352f] dark:text-white mb-1">
                Nenhuma conta encontrada
              </h3>
              <p className="text-sm text-[#787774] dark:text-[#9b9a97] max-w-sm mx-auto mb-4">
                Não há contas com os filtros selecionados. Clique no botão abaixo para adicionar sua primeira conta!
              </p>
              <button
                onClick={handleOpenAddBill}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Nova Conta</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredBills.map((bill) => {
                const cat = CATEGORY_CONFIG[bill.category] || CATEGORY_CONFIG.outros;
                const CatIcon = cat.icon;
                const dueStatus = getDueStatus(bill.dueDate, bill.status);
                const isPaid = bill.status === 'paid';

                return (
                  <div
                    key={bill.id}
                    className={`group relative bg-white dark:bg-[#202020] border rounded-2xl p-4 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between ${
                      isPaid
                        ? 'border-[#e9e9e8] dark:border-[#2d2d2d] opacity-75'
                        : bill.dueDate < todayStr
                        ? 'border-red-300 dark:border-red-800/80 bg-red-50/20'
                        : 'border-[#e9e9e8] dark:border-[#2d2d2d]'
                    }`}
                  >
                    <div>
                      {/* Topo do Card: Categoria & Status */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${cat.bg} ${cat.darkBg}`}
                        >
                          <CatIcon className="w-3 h-3" />
                          <span>{cat.label}</span>
                        </span>

                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${dueStatus.color}`}
                        >
                          <Clock className="w-2.5 h-2.5" />
                          <span>{dueStatus.label}</span>
                        </span>
                      </div>

                      {/* Título e Valor */}
                      <div className="mb-2">
                        <h4
                          className={`font-semibold text-base mb-1 ${
                            isPaid
                              ? 'line-through text-[#787774] dark:text-[#9b9a97]'
                              : 'text-[#37352f] dark:text-white'
                          }`}
                        >
                          {bill.title}
                        </h4>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xs text-[#787774] dark:text-[#9b9a97]">Valor:</span>
                          <span
                            className={`text-lg font-bold ${
                              isPaid
                                ? 'text-stone-500'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {formatBRL(bill.amount)}
                          </span>
                        </div>
                      </div>

                      {/* Observações / Notas */}
                      {bill.notes && (
                        <p className="text-xs text-[#787774] dark:text-[#9b9a97] bg-stone-50 dark:bg-stone-800/60 p-2 rounded-lg mb-2">
                          {bill.notes}
                        </p>
                      )}

                      {/* Código de Barras / PIX */}
                      {bill.barcodeOrLink && (
                        <div className="flex items-center justify-between gap-1 bg-stone-100 dark:bg-stone-800/80 px-2.5 py-1.5 rounded-lg text-xs font-mono text-[#787774] dark:text-stone-300 mb-2">
                          <span className="truncate max-w-[200px]">{bill.barcodeOrLink}</span>
                          <button
                            onClick={() => handleCopyBarcode(bill.id, bill.barcodeOrLink!)}
                            title="Copiar Código"
                            className="p-1 hover:text-emerald-600 text-stone-500 shrink-0"
                          >
                            {copiedId === bill.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Rodapé: Ações e Botão Pago */}
                    <div className="pt-3 border-t border-[#f0efec] dark:border-[#2d2d2d] flex items-center justify-between gap-2 mt-2">
                      <button
                        onClick={() => handleToggleBillStatus(bill)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          isPaid
                            ? 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                        }`}
                      >
                        {isPaid ? (
                          <>
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Desmarcar Pago</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Marcar como Pago</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditBill(bill)}
                          title="Editar Conta"
                          className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Excluir conta "${bill.title}"?`)) {
                              onDeleteBill(bill.id);
                            }
                          }}
                          title="Excluir Conta"
                          className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================= ABA DE COMPROMISSOS & ROTINA ======================= */}
      {activeSubTab === 'appointments' && (
        <div className="space-y-6">
          {/* Seção Próximos Compromissos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#37352f] dark:text-white flex items-center gap-2">
                <span>🗓️</span> Próximos Compromissos & Saúde ({upcomingAppointments.length})
              </h3>
              <button
                onClick={handleOpenAddAppointment}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                + Adicionar Compromisso
              </button>
            </div>

            {upcomingAppointments.length === 0 ? (
              <div className="bg-white dark:bg-[#202020] border border-[#e9e9e8] dark:border-[#2d2d2d] rounded-xl p-8 text-center text-sm text-[#787774] dark:text-[#9b9a97]">
                Nenhum compromisso agendado para os próximos dias.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {upcomingAppointments.map((app) => {
                  const cat = APPOINTMENT_CATEGORY_CONFIG[app.category] || APPOINTMENT_CATEGORY_CONFIG.outro;
                  const isToday = app.date === todayStr;

                  return (
                    <div
                      key={app.id}
                      className={`bg-white dark:bg-[#202020] border rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex items-start justify-between gap-3 ${
                        isToday
                          ? 'border-blue-400 dark:border-blue-700 bg-blue-50/20'
                          : 'border-[#e9e9e8] dark:border-[#2d2d2d]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handleToggleAppointmentCompleted(app)}
                          className="mt-0.5 w-5 h-5 rounded-md border-2 border-stone-300 dark:border-stone-600 hover:border-emerald-500 flex items-center justify-center transition-colors shrink-0"
                        >
                          {app.completed && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                        </button>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm text-[#37352f] dark:text-white">
                              {app.title}
                            </h4>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cat.badgeClass}`}
                            >
                              {cat.label}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-[#787774] dark:text-[#9b9a97]">
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3" />
                              <span>{app.date.split('-').reverse().join('/')}</span>
                            </span>
                            {app.time && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{app.time}</span>
                              </span>
                            )}
                            {app.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                <span>{app.location}</span>
                              </span>
                            )}
                          </div>

                          {app.notes && (
                            <p className="text-xs text-[#787774] dark:text-[#9b9a97] pt-1">
                              {app.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenEditAppointment(app)}
                          className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteAppointment(app.id)}
                          className="p-1 text-stone-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Seção Concluídos */}
          {completedAppointments.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-[#e9e9e8] dark:border-[#2d2d2d]">
              <h3 className="text-xs font-bold text-[#787774] dark:text-[#9b9a97] uppercase tracking-wider">
                Compromissos Concluídos ({completedAppointments.length})
              </h3>
              <div className="space-y-2">
                {completedAppointments.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-stone-50 dark:bg-[#1c1c1c] text-xs text-[#787774] dark:text-[#9b9a97] opacity-75"
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleAppointmentCompleted(app)}
                        className="w-4 h-4 rounded bg-emerald-600 text-white flex items-center justify-center"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <span className="line-through font-medium text-[#37352f] dark:text-stone-300">
                        {app.title}
                      </span>
                      <span>— {app.date.split('-').reverse().join('/')}</span>
                    </div>
                    <button
                      onClick={() => onDeleteAppointment(app.id)}
                      className="text-stone-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================= MODAL NOVA/EDITAR CONTA ======================= */}
      {isBillModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#202020] border border-[#e9e9e8] dark:border-[#333] rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#f0efec] dark:border-[#2d2d2d]">
              <h3 className="text-lg font-bold text-[#37352f] dark:text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <span>{editingBill ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}</span>
              </h3>
              <button
                onClick={() => setIsBillModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveBill} className="space-y-4 text-xs md:text-sm">
              <div>
                <label className="block text-xs font-semibold text-[#787774] dark:text-[#9b9a97] mb-1">
                  Nome da Conta / Despesa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pagar a Luz (Enel), Pagar Água, Pagar o Inglês"
                  value={billTitle}
                  onChange={(e) => setBillTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#e9e9e8] dark:border-[#333] bg-stone-50 dark:bg-[#191919] text-[#37352f] dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#787774] dark:text-[#9b9a97] mb-1">
                    Valor (R$) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 164,20"
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#e9e9e8] dark:border-[#333] bg-stone-50 dark:bg-[#191919] text-[#37352f] dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#787774] dark:text-[#9b9a97] mb-1">
                    Data de Vencimento *
                  </label>
                  <input
                    type="date"
                    required
                    value={billDueDate}
                    onChange={(e) => setBillDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#e9e9e8] dark:border-[#333] bg-stone-50 dark:bg-[#191919] text-[#37352f] dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#787774] dark:text-[#9b9a97] mb-1">
                    Categoria
                  </label>
                  <select
                    value={billCategory}
                    onChange={(e) => setBillCategory(e.target.value as BillCategory)}
                    className="w-full px-3 py-2 rounded-xl border border-[#e9e9e8] dark:border-[#333] bg-stone-50 dark:bg-[#191919] text-[#37352f] dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {Object.entries(CATEGORY_CONFIG).map(([k, c]) => (
                      <option key={k} value={k}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#787774] dark:text-[#9b9a97] mb-1">
                    Recorrência
                  </label>
                  <select
                    value={billRecurring}
                    onChange={(e) => setBillRecurring(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-[#e9e9e8] dark:border-[#333] bg-stone-50 dark:bg-[#191919] text-[#37352f] dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="monthly">Mensal (todo mês)</option>
                    <option value="none">Única (avulsa)</option>
                    <option value="yearly">Anual</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#787774] dark:text-[#9b9a97] mb-1">
                  Chave PIX ou Código de Barras (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Cole aqui a linha digitável ou chave PIX para copiar rápido"
                  value={billBarcode}
                  onChange={(e) => setBillBarcode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#e9e9e8] dark:border-[#333] bg-stone-50 dark:bg-[#191919] text-[#37352f] dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#787774] dark:text-[#9b9a97] mb-1">
                  Observações / Lembretes
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Pagar antes das 16h para compensar no mesmo dia."
                  value={billNotes}
                  onChange={(e) => setBillNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#e9e9e8] dark:border-[#333] bg-stone-50 dark:bg-[#191919] text-[#37352f] dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#f0efec] dark:border-[#2d2d2d]">
                <button
                  type="button"
                  onClick={() => setIsBillModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors shadow-sm"
                >
                  {editingBill ? 'Salvar Alterações' : 'Adicionar Conta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================= MODAL NOVO/EDITAR COMPROMISSO ======================= */}
      {isAppointmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#202020] border border-[#e9e9e8] dark:border-[#333] rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#f0efec] dark:border-[#2d2d2d]">
              <h3 className="text-lg font-bold text-[#37352f] dark:text-white flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
                <span>{editingAppointment ? 'Editar Compromisso' : 'Novo Compromisso Pessoal'}</span>
              </h3>
              <button
                onClick={() => setIsAppointmentModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveAppointment} className="space-y-4 text-xs md:text-sm">
              <div>
                <label className="block text-xs font-semibold text-[#787774] dark:text-[#9b9a97] mb-1">
                  Título do Compromisso *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Marcar dentista, Consulta médica, Mercado do mês"
                  value={appTitle}
                  onChange={(e) => setAppTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#e9e9e8] dark:border-[#333] bg-stone-50 dark:bg-[#191919] text-[#37352f] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#787774] dark:text-[#9b9a97] mb-1">
                    Data *
                  </label>
                  <input
                    type="date"
                    required
                    value={appDate}
                    onChange={(e) => setAppDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#e9e9e8] dark:border-[#333] bg-stone-50 dark:bg-[#191919] text-[#37352f] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#787774] dark:text-[#9b9a97] mb-1">
                    Horário
                  </label>
                  <input
                    type="time"
                    value={appTime}
                    onChange={(e) => setAppTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#e9e9e8] dark:border-[#333] bg-stone-50 dark:bg-[#191919] text-[#37352f] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#787774] dark:text-[#9b9a97] mb-1">
                    Categoria
                  </label>
                  <select
                    value={appCategory}
                    onChange={(e) => setAppCategory(e.target.value as AppointmentCategory)}
                    className="w-full px-3 py-2 rounded-xl border border-[#e9e9e8] dark:border-[#333] bg-stone-50 dark:bg-[#191919] text-[#37352f] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(APPOINTMENT_CATEGORY_CONFIG).map(([k, c]) => (
                      <option key={k} value={k}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#787774] dark:text-[#9b9a97] mb-1">
                    Localização (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Consultório Dr. Marcelo"
                    value={appLocation}
                    onChange={(e) => setAppLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#e9e9e8] dark:border-[#333] bg-stone-50 dark:bg-[#191919] text-[#37352f] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#787774] dark:text-[#9b9a97] mb-1">
                  Observações
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Levar carteirinha do convênio e exames anteriores."
                  value={appNotes}
                  onChange={(e) => setAppNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#e9e9e8] dark:border-[#333] bg-stone-50 dark:bg-[#191919] text-[#37352f] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#f0efec] dark:border-[#2d2d2d]">
                <button
                  type="button"
                  onClick={() => setIsAppointmentModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors shadow-sm"
                >
                  {editingAppointment ? 'Salvar Alterações' : 'Adicionar Compromisso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================= MODAL IMPORTAR DA AGENDA ======================= */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#202020] border border-[#e9e9e8] dark:border-[#333] rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#f0efec] dark:border-[#2d2d2d]">
              <h3 className="text-base font-bold text-[#37352f] dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <span>Contas Detectadas na sua Agenda do Google</span>
              </h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-[#787774] dark:text-[#9b9a97]">
              Encontramos os seguintes lembretes financeiros na sua agenda. Clique em "Adicionar" para cadastrá-los na sua lista de Contas a Pagar:
            </p>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {detectedCalendarBills.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-[#e9e9e8] dark:border-[#333] text-xs"
                >
                  <div>
                    <h5 className="font-semibold text-[#37352f] dark:text-white">
                      {item.summary}
                    </h5>
                    <span className="text-[11px] text-[#787774] dark:text-[#9b9a97]">
                      Vencimento: {item.date.split('-').reverse().join('/')}
                    </span>
                  </div>

                  {item.existing ? (
                    <span className="px-2 py-1 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                      Já adicionado ✓
                    </span>
                  ) : (
                    <button
                      onClick={() => handleImportCalendarEvent(item)}
                      className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors"
                    >
                      Adicionar
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-[#f0efec] dark:border-[#2d2d2d]">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-stone-900 text-white dark:bg-white dark:text-stone-900 text-xs font-semibold"
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
