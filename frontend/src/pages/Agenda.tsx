import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Video,
  Trash2,
  Pencil,
  ExternalLink,
  RefreshCw,
  Sparkles,
  X,
  CalendarCheck,
  Flag,
  List as ListIcon,
  LayoutGrid,
  CheckCircle2,
} from 'lucide-react';
import api from '../api';
import { getBrazilianHolidays, type Holiday } from '../utils/holidays';
import { Toast, type ToastType } from '../components/Toast';

export interface CalendarEvent {
  id: string;
  user_id?: number;
  title: string;
  description?: string;
  start_time: string; // ISO string
  end_time: string;   // ISO string
  all_day: boolean;
  category: 'lesson' | 'private' | 'meeting' | 'exam' | 'reminder' | 'google' | 'other';
  color: string;
  location_or_link?: string;
  class_id?: number;
  class_name?: string;
  google_event_id?: string;
  source: 'local' | 'google' | 'class_session' | 'holiday';
}

interface ClassOption {
  id: number;
  name: string;
  schedule?: string;
}

const CATEGORY_MAP: Record<string, { label: string; color: string; bg: string; text: string }> = {
  lesson: { label: 'Turma', color: '#10b981', bg: 'bg-emerald-500/15 border-emerald-500/30', text: 'event-ink-emerald' },
  private: { label: 'Particular', color: '#8b5cf6', bg: 'bg-purple-500/15 border-purple-500/30', text: 'event-ink-purple' },
  meeting: { label: 'Reunião', color: '#f59e0b', bg: 'bg-amber-500/15 border-amber-500/30', text: 'event-ink-amber' },
  exam: { label: 'Prova', color: '#ef4444', bg: 'bg-rose-500/15 border-rose-500/30', text: 'event-ink-rose' },
  reminder: { label: 'Lembrete', color: '#06b6d4', bg: 'bg-cyan-500/15 border-cyan-500/30', text: 'event-ink-cyan' },
  google: { label: 'Google', color: '#3b82f6', bg: 'bg-blue-500/15 border-blue-500/30', text: 'event-ink-blue' },
  other: { label: 'Outro', color: '#64748b', bg: 'bg-slate-500/15 border-slate-500/30', text: 'event-ink-slate' },
};

export const Agenda = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [googleConnected, setGoogleConnected] = useState<boolean>(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const requestId = useRef(0);
  const requestController = useRef<AbortController | null>(null);

  // Modais e seleções
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ date: string; events: (CalendarEvent | { isHoliday: true; holiday: Holiday })[] } | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndTime, setFormEndTime] = useState('10:00');
  const [formAllDay, setFormAllDay] = useState(false);
  const [formCategory, setFormCategory] = useState<string>('lesson');
  const [formClassId, setFormClassId] = useState<string>('');
  const [formLocation, setFormLocation] = useState('');
  const [formSyncGoogle, setFormSyncGoogle] = useState(false);
  const [formGenerateMeet, setFormGenerateMeet] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Feriados do ano corrente
  const holidays = useMemo(() => getBrazilianHolidays(currentYear), [currentYear]);
  const holidaysMap = useMemo(() => {
    const map = new Map<string, Holiday>();
    holidays.forEach(h => map.set(h.date, h));
    return map;
  }, [holidays]);

  // Turmas só mudam quando o professor sai desta página para editá-las.
  useEffect(() => {
    let active = true;
    api.get('/classes/')
      .then(res => { if (active) setClasses(res.data || []); })
      .catch(err => console.error('Erro ao carregar turmas:', err));
    return () => { active = false; };
  }, []);

  // Mostrar os eventos locais assim que chegarem; Google completa a grade depois.
  const loadCalendarData = useCallback(async () => {
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    const thisRequest = ++requestId.current;
    setIsLoading(true);
    const startOfMonth = new Date(currentYear, currentMonth - 1, 1).toISOString();
    const endOfMonth = new Date(currentYear, currentMonth + 2, 0).toISOString();
    const params = { start_date: startOfMonth, end_date: endOfMonth };

    const googleEventsPromise = (async (): Promise<CalendarEvent[]> => {
      try {
        const statusRes = await api.get('/calendar/status', { signal: controller.signal });
        if (thisRequest !== requestId.current) return [];
        setGoogleConnected(statusRes.data.connected);
        setGoogleEmail(statusRes.data.email || null);
        if (!statusRes.data.connected) return [];
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error('Erro ao verificar conexão Google:', err);
          if (thisRequest === requestId.current) {
            setGoogleConnected(false);
            setGoogleEmail(null);
          }
        }
        return [];
      }
      try {
        const res = await api.get('/calendar/events', { params: { ...params, google_only: true }, signal: controller.signal });
        return res.data || [];
      } catch (err) {
        if (!controller.signal.aborted) console.error('Erro ao carregar eventos do Google:', err);
        return [];
      }
    })();

    let localEvents: CalendarEvent[] = [];
    try {
      const eventsRes = await api.get('/calendar/events', { params: { ...params, include_google: false }, signal: controller.signal });
      localEvents = eventsRes.data || [];
      if (thisRequest === requestId.current) setEvents(localEvents);
    } catch (err) {
      if (!controller.signal.aborted) {
        console.error('Erro ao carregar eventos:', err);
        if (thisRequest === requestId.current) setEvents([]);
      }
    } finally {
      if (thisRequest === requestId.current) setIsLoading(false);
    }

    const googleEvents = await googleEventsPromise;
    if (thisRequest !== requestId.current) return;
    if (googleEvents.length) {
      setEvents([...localEvents, ...googleEvents].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()));
    }
    setIsSyncing(false);
  }, [currentYear, currentMonth]);

  useEffect(() => {
    loadCalendarData();
    return () => {
      requestId.current += 1;
      requestController.current?.abort();
    };
  }, [loadCalendarData]);

  // Navegação
  const handlePrev = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNext = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Abrir modal para novo evento
  const handleOpenNewEventModal = (dateStr?: string) => {
    setEditingEvent(null);
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    setFormTitle('');
    setFormDescription('');
    setFormDate(targetDate);
    setFormStartTime('09:00');
    setFormEndTime('10:00');
    setFormAllDay(false);
    setFormCategory('lesson');
    setFormClassId('');
    setFormLocation('');
    setFormSyncGoogle(googleConnected);
    setFormGenerateMeet(false);
    setIsEventModalOpen(true);
  };

  // Abrir modal para editar evento
  const handleEditEvent = (ev: CalendarEvent) => {
    if (ev.source === 'class_session') {
      setToast({ message: 'Aulas de turmas são gerenciadas na página da Turma.', type: 'warning' });
      return;
    }
    setEditingEvent(ev);
    const st = new Date(ev.start_time);
    const et = new Date(ev.end_time);
    
    const dStr = st.toISOString().split('T')[0];
    const sTime = `${String(st.getHours()).padStart(2, '0')}:${String(st.getMinutes()).padStart(2, '0')}`;
    const eTime = `${String(et.getHours()).padStart(2, '0')}:${String(et.getMinutes()).padStart(2, '0')}`;

    setFormTitle(ev.title);
    setFormDescription(ev.description || '');
    setFormDate(dStr);
    setFormStartTime(sTime);
    setFormEndTime(eTime);
    setFormAllDay(ev.all_day);
    setFormCategory(ev.category || 'lesson');
    setFormClassId(ev.class_id ? String(ev.class_id) : '');
    setFormLocation(ev.location_or_link || '');
    setFormSyncGoogle(Boolean(ev.google_event_id));
    setFormGenerateMeet(false);
    setIsEventModalOpen(true);
  };

  // Salvar evento (Criar / Editar)
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDate) return;

    setIsSaving(true);
    try {
      const startDateTime = formAllDay 
        ? `${formDate}T00:00:00` 
        : `${formDate}T${formStartTime}:00`;
      const endDateTime = formAllDay 
        ? `${formDate}T23:59:59` 
        : `${formDate}T${formEndTime}:00`;

      const payload = {
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        start_time: startDateTime,
        end_time: endDateTime,
        all_day: formAllDay,
        category: formCategory,
        color: CATEGORY_MAP[formCategory]?.color || '#6366f1',
        location_or_link: formLocation.trim() || null,
        class_id: formClassId ? parseInt(formClassId, 10) : null,
        sync_google: formSyncGoogle,
        generate_meet_link: formGenerateMeet,
      };

      if (editingEvent) {
        await api.put(`/calendar/events/${editingEvent.id}`, payload);
        setToast({ message: 'Evento atualizado com sucesso!', type: 'success' });
      } else {
        await api.post('/calendar/events', payload);
        setToast({ message: 'Evento criado com sucesso!', type: 'success' });
      }

      setIsEventModalOpen(false);
      setSelectedDayEvents(null);
      await loadCalendarData();
    } catch (err: any) {
      console.error('Erro ao salvar evento:', err);
      setToast({ message: err.response?.data?.detail || 'Erro ao salvar evento.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // Excluir evento
  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm('Tem certeza que deseja remover este compromisso?')) return;
    try {
      await api.delete(`/calendar/events/${eventId}`);
      setToast({ message: 'Evento excluído com sucesso.', type: 'success' });
      setSelectedDayEvents(null);
      await loadCalendarData();
    } catch (err: any) {
      setToast({ message: err.response?.data?.detail || 'Erro ao excluir evento.', type: 'error' });
    }
  };

  // Ouvir mensagem do popup de autenticação Google
  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        setToast({ message: 'Conta Google conectada com sucesso! Sincronizando agenda...', type: 'success' });
        loadCalendarData();
      } else if (event.data?.type === 'GOOGLE_AUTH_ERROR') {
        setToast({ message: 'Falha ao autenticar com o Google.', type: 'error' });
      }
    };
    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, [loadCalendarData]);

  // Conectar com Google
  const handleConnectGoogle = () => {
    const rawApiUrl = import.meta.env.VITE_API_URL || '/api';
    const apiUrl = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;
    const token = localStorage.getItem('token') || '';
    const width = 500;
    const height = 650;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      `${apiUrl}/auth/google?token=${encodeURIComponent(token)}&state=agenda`,
      'google_auth_popup',
      `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
    );

    // Se popup for bloqueado pelo navegador, redireciona diretamente
    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      window.location.href = `${apiUrl}/auth/google?token=${encodeURIComponent(token)}&state=agenda`;
    }
  };

  // Dias do mês na visualização mensal
  const monthDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Domingo
    const lastDate = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevMonthLastDate = new Date(currentYear, currentMonth, 0).getDate();

    const days: {
      date: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      holiday?: Holiday;
      events: CalendarEvent[];
    }[] = [];

    const todayStr = new Date().toISOString().split('T')[0];

    // Dias do mês anterior para preencher a primeira semana
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dNum = prevMonthLastDate - i;
      const prevDateObj = new Date(currentYear, currentMonth - 1, dNum);
      const dStr = prevDateObj.toISOString().split('T')[0];
      const hol = holidaysMap.get(dStr);
      const dayEvs = events.filter(e => e.start_time.startsWith(dStr));
      days.push({
        date: dStr,
        dayNumber: dNum,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        holiday: hol,
        events: dayEvs,
      });
    }

    // Dias do mês atual
    for (let dNum = 1; dNum <= lastDate; dNum++) {
      const currDateObj = new Date(currentYear, currentMonth, dNum);
      const yearStr = currDateObj.getFullYear();
      const monthStr = String(currDateObj.getMonth() + 1).padStart(2, '0');
      const dayStr = String(dNum).padStart(2, '0');
      const dStr = `${yearStr}-${monthStr}-${dayStr}`;

      const hol = holidaysMap.get(dStr);
      const dayEvs = events.filter(e => e.start_time.startsWith(dStr));
      days.push({
        date: dStr,
        dayNumber: dNum,
        isCurrentMonth: true,
        isToday: dStr === todayStr,
        holiday: hol,
        events: dayEvs,
      });
    }

    // Dias do próximo mês para completar grade
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDateObj = new Date(currentYear, currentMonth + 1, i);
      const dStr = nextDateObj.toISOString().split('T')[0];
      const hol = holidaysMap.get(dStr);
      const dayEvs = events.filter(e => e.start_time.startsWith(dStr));
      days.push({
        date: dStr,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        holiday: hol,
        events: dayEvs,
      });
    }

    return days;
  }, [currentYear, currentMonth, events, holidaysMap]);

  // Filtragem de eventos para lista
  const filteredEvents = useMemo(() => {
    if (filterCategory === 'all') return events;
    if (filterCategory === 'holiday') return [];
    return events.filter(e => {
      if (filterCategory === 'lesson') return e.category === 'lesson' || e.source === 'class_session';
      if (filterCategory === 'google') return e.source === 'google' || Boolean(e.google_event_id);
      return e.category === filterCategory;
    });
  }, [events, filterCategory]);

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const weekDayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="space-y-4 w-full min-w-0 pb-4">
      {/* Toast Notification */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Top Header & Compact Controls Bar */}
      <div className="bg-bg-card px-3 py-3 sm:px-5 rounded-[2px] border border-rule shadow-sm flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Month Nav & Date */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center border border-border rounded-[2px] bg-bg-dark overflow-hidden shrink-0">
            <button
              onClick={handlePrev}
              className="p-2 hover:bg-[var(--wash-2)] text-text-muted hover:text-text-main transition-colors"
              title="Mês Anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-2 text-xs font-semibold text-text-main hover:bg-[var(--wash-2)] border-x border-border transition-colors"
            >
              Hoje
            </button>
            <button
              onClick={handleNext}
              className="p-2 hover:bg-[var(--wash-2)] text-text-muted hover:text-text-main transition-colors"
              title="Próximo Mês"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <span className="text-base sm:text-lg font-bold text-text-main capitalize ml-1 truncate min-w-0">
            {monthNames[currentMonth]} <span className="text-primary">{currentYear}</span>
          </span>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-bg-dark border border-border rounded-[2px] p-0.5 ml-auto lg:ml-2 shrink-0">
            <button
              onClick={() => setViewMode('month')}
              className={`flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-[2px] transition-all ${
                viewMode === 'month' ? 'bg-bg-card text-primary shadow-sm' : 'text-text-muted hover:text-text-main'
              }`}
            >
              <LayoutGrid size={12} /> Mês
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-[2px] transition-all ${
                viewMode === 'list' ? 'bg-bg-card text-primary shadow-sm' : 'text-text-muted hover:text-text-main'
              }`}
            >
              <ListIcon size={12} /> Lista
            </button>
          </div>
        </div>

        {/* Center/Right: Category Filters & Actions */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between lg:justify-end min-w-0">
          {/* Categorias: scroll horizontal no celular, quebra de linha do sm pra cima */}
          <div className="flex items-center gap-1 text-xs overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap [&>button]:shrink-0 [&>button]:whitespace-nowrap">
            {[
              { id: 'all', label: 'Tudo' },
              { id: 'lesson', label: 'Turmas' },
              { id: 'private', label: 'Particulares' },
              { id: 'meeting', label: 'Reuniões' },
              { id: 'holiday', label: '🇧🇷 Feriados' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterCategory(tab.id)}
                className={`h-8 px-2.5 rounded-[2px] font-medium transition-all ${
                  filterCategory === tab.id
                    ? 'bg-primary text-white'
                    : 'bg-bg-dark text-text-muted hover:text-text-main hover:bg-[var(--wash-2)] border border-border'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2 sm:justify-end">
          {/* Google Status Badge */}
          {googleConnected ? (
            <div
              className="h-8 flex items-center gap-1.5 px-2 rounded-[2px] bg-emerald-500/10 border border-emerald-500/20 event-ink-emerald text-[10px] font-medium"
              title={googleEmail ? `Conectado como ${googleEmail}` : 'Google Agenda conectado'}
            >
              <CheckCircle2 size={12} />
              <span className="hidden sm:inline">{googleEmail ? (googleEmail.length > 20 ? `${googleEmail.slice(0, 18)}...` : googleEmail) : 'Google Conectado'}</span>
              <button
                onClick={() => {
                  setIsSyncing(true);
                  loadCalendarData();
                }}
                disabled={isSyncing}
                title="Sincronizar com Google Agenda"
                className="event-ink-emerald hover:opacity-75 transition-opacity p-0.5"
              >
                <RefreshCw size={11} className={isSyncing ? 'animate-spin' : ''} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnectGoogle}
              className="h-8 px-2 rounded-[2px] bg-bg-dark border border-border text-text-muted hover:text-text-main text-[10px] flex items-center gap-1 font-medium transition-colors"
              title="Vincular com Google Agenda"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>Conectar Google</span>
              <ExternalLink size={10} />
            </button>
          )}

          {/* Botão Novo Evento */}
          <button
            onClick={() => handleOpenNewEventModal()}
            className="btn btn-primary h-8 flex items-center gap-1 py-0 px-3 text-xs font-semibold"
          >
            <Plus size={14} /> Novo Evento
          </button>
          </div>
        </div>
      </div>

      {/* Visualização Principal */}
      {isLoading ? (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-2 bg-bg-card rounded-[2px] border border-rule">
          <RefreshCw size={22} className="animate-spin text-primary" />
          <p className="text-xs text-text-muted font-medium">Carregando agenda...</p>
        </div>
      ) : viewMode === 'month' ? (
        /* Grade mensal que ocupa o espaço disponível. */
        <div className="bg-bg-card border border-rule rounded-[2px] overflow-hidden shadow-sm">
          {/* Cabeçalho dos dias da semana */}
          <div className="grid grid-cols-7 border-b border-border bg-bg-dark/80 text-center py-2 sm:py-3">
            {weekDayNames.map((day, idx) => (
              <span
                key={day}
                className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${
                  idx === 0 || idx === 6 ? 'text-text-muted/60' : 'text-text-muted'
                }`}
              >
                {day}
              </span>
            ))}
          </div>

          {/* Células crescem com a altura da tela, mantendo toque confortável no celular. */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-border">
            {monthDays.map(day => {
              const hasHoliday = Boolean(day.holiday);
              const dayHolidays = day.holiday ? [day.holiday] : [];
              const dayEvents = filterCategory === 'holiday' 
                ? [] 
                : day.events.filter(e => filterCategory === 'all' || e.category === filterCategory || (filterCategory === 'lesson' && e.source === 'class_session'));

              return (
                <div
                  key={day.date}
                  onClick={() => {
                    setSelectedDayEvents({
                      date: day.date,
                      events: [
                        ...dayHolidays.map(h => ({ isHoliday: true as const, holiday: h })),
                        ...day.events,
                      ],
                    });
                  }}
                  className={`min-w-0 min-h-[88px] sm:min-h-[clamp(110px,16vh,170px)] p-1.5 sm:p-3 flex flex-col transition-colors relative cursor-pointer group ${
                    day.isCurrentMonth
                      ? 'bg-bg-card hover:bg-[var(--wash-1)]'
                      : 'bg-bg-dark/30 text-text-muted/40 hover:bg-[var(--wash-1)]'
                  } ${day.isToday ? 'ring-1 ring-inset ring-primary/60 bg-primary/5' : ''}`}
                >
                  {/* Topo da célula: Número do dia + botão rápido */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs sm:text-sm font-bold w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full ${
                        day.isToday
                          ? 'bg-primary text-white shadow-sm'
                          : day.isCurrentMonth
                          ? 'text-text-main'
                          : 'text-text-muted/40'
                      }`}
                    >
                      {day.dayNumber}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenNewEventModal(day.date);
                      }}
                      title="Adicionar evento"
                      className="hidden sm:inline-flex opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 p-1 text-text-muted hover:text-primary hover:bg-bg-dark rounded transition-all"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  {/* Conteúdo do dia: Feriados + Eventos */}
                  <div className="space-y-1 mt-1.5 min-w-0 overflow-hidden">
                    {/* Feriado Brasileiro */}
                    {hasHoliday && (
                      <div
                        className={`text-[10px] sm:text-xs font-semibold px-1.5 py-1 rounded-[2px] truncate flex items-center gap-1 ${
                          day.holiday?.type === 'national_holiday'
                            ? 'bg-rose-500/15 border border-rose-500/30 event-ink-rose'
                            : day.holiday?.type === 'educational'
                            ? 'bg-amber-500/15 border border-amber-500/30 event-ink-amber'
                            : 'bg-purple-500/15 border border-purple-500/30 event-ink-purple'
                        }`}
                        title={`${day.holiday?.name} (${day.holiday?.type === 'national_holiday' ? 'Feriado Nacional' : 'Ponto Facultativo'})`}
                      >
                        <Flag size={8} className="shrink-0" />
                        <span className="truncate">{day.holiday?.name}</span>
                      </div>
                    )}

                    {/* Lista de eventos */}
                    {dayEvents.slice(0, 4).map((ev, index) => {
                      const timeStr = ev.all_day 
                        ? 'Todo dia' 
                        : new Date(ev.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                      const catStyle = CATEGORY_MAP[ev.category] || CATEGORY_MAP.other;

                      return (
                        <div
                          key={ev.id}
                          className={`${index > 1 ? 'hidden lg:flex' : 'flex'} text-[10px] sm:text-xs font-medium px-1.5 py-1 rounded-[2px] border truncate items-center gap-1 ${catStyle.bg} ${catStyle.text}`}
                          title={`${timeStr} - ${ev.title}`}
                        >
                          <span className="hidden md:inline text-[10px] opacity-75 shrink-0">{timeStr}</span>
                          <span className="truncate">{ev.title}</span>
                        </div>
                      );
                    })}

                    {dayEvents.length > 2 && (
                      <p className="lg:hidden text-[10px] sm:text-xs text-text-muted font-bold pl-0.5">
                        +{dayEvents.length - 2} mais
                      </p>
                    )}
                    {dayEvents.length > 4 && <p className="hidden lg:block text-xs text-text-muted font-bold pl-0.5">+{dayEvents.length - 4} mais</p>}
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* VISUALIZAÇÃO EM LISTA / PRÓXIMOS EVENTOS */
        <div className="space-y-2">
          {filteredEvents.length === 0 ? (
            <div className="p-8 text-center bg-bg-card rounded-[2px] border border-rule space-y-2">
              <CalendarCheck size={32} className="mx-auto text-text-muted/50" />
              <h3 className="text-sm font-bold text-text-main">Nenhum compromisso encontrado</h3>
              <p className="text-xs text-text-muted max-w-md mx-auto">
                Não há eventos agendados para este período com os filtros atuais.
              </p>
              <button
                onClick={() => handleOpenNewEventModal()}
                className="btn btn-primary text-xs font-semibold mt-1"
              >
                <Plus size={12} /> Cadastrar Evento
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {filteredEvents.map(ev => {
                const startDate = new Date(ev.start_time);
                const endDate = new Date(ev.end_time);
                const dateFormatted = startDate.toLocaleDateString('pt-BR', {
                  weekday: 'short',
                  day: '2-digit',
                  month: 'short',
                });
                const timeFormatted = ev.all_day
                  ? 'Dia inteiro'
                  : `${startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
                const catStyle = CATEGORY_MAP[ev.category] || CATEGORY_MAP.other;

                return (
                  <div
                    key={ev.id}
                    className="p-3 bg-bg-card rounded-[2px] border border-rule hover:border-border transition-all flex flex-col justify-between gap-2 shadow-sm"
                  >
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.2 rounded-[2px] border mb-1 ${catStyle.bg} ${catStyle.text}`}>
                            {catStyle.label}
                          </span>
                          <h3 className="text-xs font-bold text-text-main leading-tight">
                            {ev.title}
                          </h3>
                        </div>

                        {ev.source === 'local' && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEditEvent(ev)}
                              className="p-1 text-text-muted hover:text-text-main hover:bg-[var(--wash-2)] rounded transition-colors"
                              title="Editar"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteEvent(ev.id)}
                              className="p-1 text-text-muted hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                              title="Excluir"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>

                      {ev.description && (
                        <p className="text-[11px] text-text-muted line-clamp-1">
                          {ev.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-border flex flex-wrap items-center justify-between gap-1 text-[11px] text-text-muted">
                      <div className="flex items-center gap-2.5">
                        <span className="flex items-center gap-1 font-medium text-text-main">
                          <CalendarIcon size={11} className="text-primary" /> {dateFormatted}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={11} /> {timeFormatted}
                        </span>
                      </div>

                      {ev.location_or_link && (
                        <a
                          href={ev.location_or_link.startsWith('http') ? ev.location_or_link : `https://${ev.location_or_link}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline font-semibold"
                        >
                          <Video size={11} /> Reunião
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE EVENTO */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-bg-card border border-rule-strong w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-[2px] p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <h2 className="text-sm font-bold text-text-main flex items-center gap-1.5">
                {editingEvent ? <Pencil size={16} className="text-primary" /> : <Plus size={16} className="text-primary" />}
                {editingEvent ? 'Editar Compromisso' : 'Novo Compromisso / Aula'}
              </h2>
              <button
                onClick={() => setIsEventModalOpen(false)}
                className="text-text-muted hover:text-text-main p-1"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-3">
              {/* Título */}
              <div>
                <label className="block text-[11px] font-semibold text-text-muted uppercase mb-1">
                  Título do Evento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Aula de Redação - Turma ITA"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-bg-dark border border-border rounded-[2px] text-text-main text-xs focus:border-primary focus:outline-none"
                />
              </div>

              {/* Categoria & Turma */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-text-muted uppercase mb-1">
                    Categoria
                  </label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-bg-dark border border-border rounded-[2px] text-text-main text-xs focus:border-primary focus:outline-none"
                  >
                    <option value="lesson">Aula de Turma</option>
                    <option value="private">Aula Particular</option>
                    <option value="meeting">Reunião / Atendimento</option>
                    <option value="exam">Prova / Simulado</option>
                    <option value="reminder">Lembrete</option>
                    <option value="other">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-text-muted uppercase mb-1">
                    Vincular Turma
                  </label>
                  <select
                    value={formClassId}
                    onChange={e => setFormClassId(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-bg-dark border border-border rounded-[2px] text-text-main text-xs focus:border-primary focus:outline-none"
                  >
                    <option value="">Nenhuma turma</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Data e Horários */}
              <div className="space-y-2 p-2.5 bg-bg-dark/50 border border-border rounded-[2px]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-text-main">Data e Horários</span>
                  <label className="flex items-center gap-1.5 text-[11px] text-text-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formAllDay}
                      onChange={e => setFormAllDay(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    Dia inteiro
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-text-muted uppercase mb-0.5">Data</label>
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={e => setFormDate(e.target.value)}
                      className="w-full px-2 py-1 bg-bg-card border border-border rounded-[2px] text-text-main text-xs focus:border-primary focus:outline-none"
                    />
                  </div>

                  {!formAllDay && (
                    <>
                      <div>
                        <label className="block text-[10px] text-text-muted uppercase mb-0.5">Início</label>
                        <input
                          type="time"
                          required
                          value={formStartTime}
                          onChange={e => setFormStartTime(e.target.value)}
                          className="w-full px-2 py-1 bg-bg-card border border-border rounded-[2px] text-text-main text-xs focus:border-primary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-text-muted uppercase mb-0.5">Término</label>
                        <input
                          type="time"
                          required
                          value={formEndTime}
                          onChange={e => setFormEndTime(e.target.value)}
                          className="w-full px-2 py-1 bg-bg-card border border-border rounded-[2px] text-text-main text-xs focus:border-primary focus:outline-none"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Local / Link da Videochamada */}
              <div>
                <label className="block text-[11px] font-semibold text-text-muted uppercase mb-1">
                  Link de Videochamada ou Local
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="https://meet.google.com/... ou Sala 2"
                    value={formLocation}
                    onChange={e => setFormLocation(e.target.value)}
                    className="w-full pl-7 pr-2.5 py-1.5 bg-bg-dark border border-border rounded-[2px] text-text-main text-xs focus:border-primary focus:outline-none"
                  />
                  <Video size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted" />
                </div>
              </div>

              {/* Integração com Google Agenda se conectado */}
              {googleConnected && (
                <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-[2px] space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold event-ink-blue">
                    <Sparkles size={12} /> Opções do Google Agenda
                  </div>
                  <div className="flex flex-col gap-1 text-[11px] text-text-muted">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formSyncGoogle}
                        onChange={e => setFormSyncGoogle(e.target.checked)}
                        className="rounded text-primary focus:ring-primary"
                      />
                      <span>Sincronizar no Google Calendar</span>
                    </label>
                    {formSyncGoogle && (
                      <label className="flex items-center gap-1.5 cursor-pointer ml-4">
                        <input
                          type="checkbox"
                          checked={formGenerateMeet}
                          onChange={e => setFormGenerateMeet(e.target.checked)}
                          className="rounded text-primary focus:ring-primary"
                        />
                        <span>Gerar link do Google Meet</span>
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* Descrição / Observações */}
              <div>
                <label className="block text-[11px] font-semibold text-text-muted uppercase mb-1">
                  Observações
                </label>
                <textarea
                  rows={2}
                  placeholder="Anotações da aula, material necessário, etc."
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-bg-dark border border-border rounded-[2px] text-text-main text-xs focus:border-primary focus:outline-none"
                />
              </div>

              {/* Ações */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="btn btn-ghost text-xs font-semibold py-1 px-3"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn btn-primary text-xs font-semibold py-1 px-3 flex items-center gap-1.5"
                >
                  {isSaving ? <RefreshCw size={12} className="animate-spin" /> : null}
                  {editingEvent ? 'Salvar' : 'Criar Evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAWER / MODAL DE DETALHES DO DIA SELECIONADO */}
      {selectedDayEvents && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-bg-card border border-rule-strong w-full max-w-sm rounded-[2px] p-4 shadow-2xl space-y-3 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div>
                <h3 className="text-sm font-bold text-text-main">
                  {new Date(`${selectedDayEvents.date}T12:00:00`).toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                  })}
                </h3>
                <p className="text-[10px] text-text-muted">Compromissos e feriados</p>
              </div>
              <button
                onClick={() => setSelectedDayEvents(null)}
                className="text-text-muted hover:text-text-main p-1"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {selectedDayEvents.events.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-4">
                  Nenhum compromisso agendado para este dia.
                </p>
              ) : (
                selectedDayEvents.events.map((item, idx) => {
                  if ('isHoliday' in item) {
                    return (
                      <div
                        key={`hol_${idx}`}
                        className={`p-2 rounded-[2px] border text-xs font-medium space-y-0.5 ${
                          item.holiday.type === 'national_holiday'
                            ? 'bg-rose-500/15 border-rose-500/30 event-ink-rose'
                            : item.holiday.type === 'educational'
                            ? 'bg-amber-500/15 border-amber-500/30 event-ink-amber'
                            : 'bg-purple-500/15 border-purple-500/30 event-ink-purple'
                        }`}
                      >
                        <div className="flex items-center gap-1 font-bold text-[11px]">
                          <Flag size={12} />
                          <span>{item.holiday.name}</span>
                        </div>
                        <p className="text-[10px] opacity-80">
                          {item.holiday.type === 'national_holiday'
                            ? 'Feriado Nacional Brasileiro'
                            : item.holiday.description || 'Ponto Facultativo'}
                        </p>
                      </div>
                    );
                  }

                  const ev = item as CalendarEvent;
                  const catStyle = CATEGORY_MAP[ev.category] || CATEGORY_MAP.other;
                  const timeFormatted = ev.all_day
                    ? 'Dia inteiro'
                    : `${new Date(ev.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - ${new Date(ev.end_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

                  return (
                    <div
                      key={ev.id}
                      className="p-2.5 bg-bg-dark border border-border rounded-[2px] space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div>
                          <span className={`inline-block text-[9px] font-semibold px-1 py-0.2 rounded-[2px] border mb-0.5 ${catStyle.bg} ${catStyle.text}`}>
                            {catStyle.label}
                          </span>
                          <h4 className="text-xs font-bold text-text-main">{ev.title}</h4>
                        </div>

                        {ev.source === 'local' && (
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => {
                                setSelectedDayEvents(null);
                                handleEditEvent(ev);
                              }}
                              className="p-1 text-text-muted hover:text-text-main"
                              title="Editar"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteEvent(ev.id)}
                              className="p-1 text-text-muted hover:text-rose-400"
                              title="Excluir"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                        <Clock size={11} /> {timeFormatted}
                      </div>

                      {ev.location_or_link && (
                        <a
                          href={ev.location_or_link.startsWith('http') ? ev.location_or_link : `https://${ev.location_or_link}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-semibold"
                        >
                          <Video size={11} /> Link da Reunião
                        </a>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 border-t border-border flex items-center justify-between">
              <button
                onClick={() => handleOpenNewEventModal(selectedDayEvents.date)}
                className="btn btn-primary text-xs font-semibold flex items-center gap-1 w-full justify-center py-1.5"
              >
                <Plus size={13} /> Adicionar Evento Neste Dia
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Agenda;
