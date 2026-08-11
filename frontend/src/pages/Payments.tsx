import { useEffect, useState } from 'react';
import api from '../api';
import { DollarSign, Search, ArrowUp, ArrowDown } from 'lucide-react';
import { formatCurrency, parseCurrency } from '../utils/masks';
import { Loading } from '../components/Loading';
import { Toast } from '../components/Toast';

interface Student {
    id: number;
    name: string;
    parent_name?: string;
    parent_phone?: string;
    school_year?: string;
    class_type?: string;
}

interface Payment {
    id: number;
    student_id: number;
    month: number;
    year: number;
    status: string; // 'PENDING', 'PAID', 'LATE'
    amount: number;
}

interface PaymentInput {
    student_id: number;
    status: string;
    amount: number;
    id?: number;
    paid_at?: string | null;
}

export const Payments = () => {


    const [students, setStudents] = useState<Student[]>([]);
    const [stats, setStats] = useState({ total_students: 0, paid_count: 0, pending_count: 0, total_received: 0 });
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(true);

    // Search and Pagination
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [limit] = useState(10);
    const [totalStudents, setTotalStudents] = useState(0);

    // Filter & Sort
    const [sortDesc, setSortDesc] = useState(false);
    const [filterStatus, setFilterStatus] = useState<'all' | 'PAID' | 'PENDING'>('all');

    // Local State for Batch Edits
    const [localPayments, setLocalPayments] = useState<Record<number, PaymentInput>>({});
    const [saving, setSaving] = useState(false);

    // Notification
    const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

    // Reset page when search changes
    useEffect(() => {
        setPage(0);
    }, [search, filterStatus, sortDesc]);

    // Immediate fetch for filters/sort/pagination/date
    useEffect(() => {
        fetchData();
    }, [selectedMonth, selectedYear, page, filterStatus, sortDesc]);

    // Debounced fetch for search only
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            // Avoid running on mount if possible, but simplest is to let it run (redundant call on mount is acceptable vs complexity)
            // Or simple check: if search is empty on mount? checking render count?
            // To prevent double-mount call, we is usually fine.
            if (search !== '') fetchData();
            // If search IS empty, the other effect handles the "initial load" (since sortDesc etc are set)
            // But wait, if I refresh page, search is empty. The other effect runs.
            // This search effect runs too?
            // If I add `if (search !== '')` it won't run on clear search? That's bad.
            // Let's just run it. The user has explicitly complained about slowness/lack of loading on SORT.
            // Prioritizing that interaction.
            fetchData();
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [search]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const skip = page * limit;

            // 1. Fetch paginated students for the table (with Name Sort & Payment Filter)
            let studentsUrl = `/students/?skip=${skip}&limit=${limit}&search=${search}&sort_by=name&sort_desc=${sortDesc}`;

            if (filterStatus !== 'all') {
                studentsUrl += `&payment_status=${filterStatus}&payment_month=${selectedMonth}&payment_year=${selectedYear}`;
            }

            const studentsRes = await api.get(studentsUrl);

            // 2. Fetch Stats from optimized endpoint
            const statsRes = await api.get(`/payments/stats?month=${selectedMonth}&year=${selectedYear}`);

            // 3. Fetch Payments ONLY for the current page students to populate the inputs
            // We can optimize this by only fetching payments for student_ids in studentsRes
            // But currently the API supports filter by student_id (single) or list? No, crud supports single.
            // Alternatively, fetch payments for the month (limit 100 is likely enough if page size is small)
            // But if we have 100 students per page?
            // Safer: Fetch payments for the month, but maybe we can limit it?
            // Let's stick to fetching payments for the month but we don't need ALL of them if we are paginating
            // However, our get_payments implementation doesn't support list of IDs.
            // So we fetch all payments for the month but with a reasonable limit if we want, or just fetch all (which is what we wanted to avoid).
            // BUT wait, getting ALL payments (just the payment records) is much lighter than getting ALL students.
            // Payment record: id, student_id, month, year, status, amount. Tiny.
            // Student record: name, parent, phone, etc.
            // Let's keep fetching filtered payments for the month.
            // Better yet: Since we display 10 students, we can just look up their payments.

            // To be safe and fast, let's fetch payments for the month.
            // If the user has 1000 students, fetching 1000 payment records is okay (maybe 100KB).
            // Fetching 1000 students was the heavy part.

            const paymentsRes = await api.get(`/payments/?year=${selectedYear}&month=${selectedMonth}&limit=2000`);

            setStudents(studentsRes.data.items);
            setTotalStudents(studentsRes.data.total);
            setStats(statsRes.data);

            // Initialize Local State for current page students
            const initialPayments: Record<number, PaymentInput> = {};
            studentsRes.data.items.forEach((s: Student) => {
                const existing = paymentsRes.data.find((p: Payment) => p.student_id === s.id);
                initialPayments[s.id] = existing ? {
                    ...existing,
                    amount: existing.amount || 0
                } : {
                    student_id: s.id,
                    status: 'PENDING',
                    amount: 0
                };
            });
            setLocalPayments(initialPayments);

        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const updateLocalPayment = (studentId: number, field: keyof PaymentInput, value: any) => {
        setLocalPayments(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], [field]: value }
        }));
    };

    const handleSavePayments = async () => {
        setSaving(true);
        try {
            const updates = Object.values(localPayments);
            await Promise.all(updates.map(async (p) => {
                // Only save if it's one of the currently visible students to avoid accidental overwrites?
                // Actually we only populate localPayments with current page.

                const payload = {
                    student_id: p.student_id,
                    month: selectedMonth,
                    year: selectedYear,
                    status: p.status,
                    amount: Number(p.amount),
                    paid_at: p.status === 'PAID' ? new Date().toISOString().split('T')[0] : null
                };

                if (p.id) {
                    await api.put(`/payments/${p.id}`, payload);
                } else {
                    await api.post('/payments/', payload);
                }
            }));

            showToast('Pagamentos salvos com sucesso!', 'success');
            fetchData();
        } catch (e) {
            console.error(e);
            showToast('Erro ao salvar pagamentos', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Stats are now direct from backend
    const { total_students: totalStudentsCount, paid_count: actualPaidCount, pending_count: pendingCount, total_received: totalReceived } = stats;




    const showToast = (msg: string, type: 'success' | 'error') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Note: To restore accurate stats, we might need a separate call.
    // For now, let's assume visual correctness of the list is priority.

    const handleExportReport = async () => {
        try {
            const res = await api.post(`/payments/report/docx?month=${selectedMonth}&year=${selectedYear}`, {}, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Financeiro_${selectedMonth}_${selectedYear}.docx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (e) {
            showToast('Erro ao gerar relatório', 'error');
        }
    };

    return (
        <div className="animate-fade-in relative">
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-5 gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-text-main">Financeiro</h1>
                    <p className="text-text-muted mt-1.5 text-sm">
                        Mensalidades de {new Date(0, selectedMonth - 1).toLocaleString('pt-BR', { month: 'long' })} de {selectedYear}.
                    </p>
                </div>

                <div className="flex flex-wrap items-end gap-2">
                    <label className="flex flex-col gap-1">
                        <span className="label-print">Situação</span>
                        <select
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value as 'all' | 'PAID' | 'PENDING')}
                            className="input py-1.5 text-sm"
                        >
                            <option value="all">Todas</option>
                            <option value="PAID">Pagas</option>
                            <option value="PENDING">Pendentes</option>
                        </select>
                    </label>

                    <label className="flex flex-col gap-1">
                        <span className="label-print">Mês</span>
                        <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="input py-1.5 text-sm">
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('pt-BR', { month: 'long' })}</option>
                            ))}
                        </select>
                    </label>

                    <label className="flex flex-col gap-1">
                        <span className="label-print">Ano</span>
                        <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="input py-1.5 text-sm">
                            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </label>

                    <button onClick={handleExportReport} className="btn btn-outline" title="Exportar relatório do mês">
                        <DollarSign size={15} />
                        <span className="hidden sm:inline">Exportar</span>
                    </button>
                </div>
            </div>

            {/* O quadro do mês: números do registro divididos por fios. */}
            <div className="sheet overflow-hidden mb-5">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-px" style={{ background: 'var(--rule)' }}>
                    <div className="px-4 py-3.5" style={{ background: 'var(--sheet)' }}>
                        <p className="label-print">Alunos no mês</p>
                        <p className="mt-1.5 text-2xl font-bold text-text-main tabular">{totalStudentsCount}</p>
                    </div>
                    <div className="px-4 py-3.5" style={{ background: 'var(--sheet)' }}>
                        <p className="label-print">Quitadas</p>
                        <p className="mt-1.5 text-2xl font-bold tabular" style={{ color: 'var(--color-success)' }}>{actualPaidCount}</p>
                    </div>
                    <div className="px-4 py-3.5" style={{ background: 'var(--sheet)' }}>
                        <p className="label-print">A receber</p>
                        <p className="mt-1.5 text-2xl font-bold tabular" style={{ color: pendingCount > 0 ? 'var(--ochre)' : 'var(--ink-muted)' }}>
                            {pendingCount}
                        </p>
                    </div>
                    <div className="px-4 py-3.5" style={{ background: 'var(--sheet)' }}>
                        <p className="label-print">Total recebido</p>
                        <p className="mt-1.5 text-2xl font-bold text-text-main tabular">{formatCurrency(totalReceived)}</p>
                    </div>
                </div>
            </div>

            {/* Busca */}
            <div className="relative mb-5">
                <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" aria-hidden="true" />
                <input
                    type="search"
                    placeholder="Buscar aluno pelo nome"
                    aria-label="Buscar aluno pelo nome"
                    className="input pl-10"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3 mb-4">
                {(loading || saving) && (
                    <div className="flex items-center justify-center py-12">
                        <Loading text={saving ? "Salvando..." : "Carregando..."} />
                    </div>
                )}
                {!loading && !saving && students.map(student => {
                    const payment = localPayments[student.id] || { status: 'PENDING', amount: 0, student_id: student.id };
                    const isPaid = payment.status === 'PAID';
                    return (
                        <div key={student.id} className="sheet sheet-p">
                            <div className="flex items-center justify-between mb-3">
                                <div className="min-w-0">
                                    <p className="font-semibold text-text-main text-sm truncate">{student.name}</p>
                                    <p className="text-xs text-text-muted">{student.parent_name || 'Sem responsável'}</p>
                                </div>
                                <select
                                    aria-label={`Situação da mensalidade de ${student.name}`}
                                    className={`stamp cursor-pointer ${isPaid ? 'stamp-paid' : 'stamp-pending'}`}
                                    value={payment.status}
                                    onChange={e => updateLocalPayment(student.id, 'status', e.target.value)}
                                >
                                    <option value="PENDING">Pendente</option>
                                    <option value="PAID">Pago</option>
                                </select>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-xs text-text-muted truncate">{student.school_year || ''} {student.class_type ? `• ${student.class_type}` : ''}</span>
                                <input
                                    type="text"
                                    aria-label={`Valor da mensalidade de ${student.name}`}
                                    className="w-28 bg-transparent border-b border-rule-strong outline-none py-1 text-sm text-right focus:border-primary text-text-main tabular font-medium"
                                    value={formatCurrency(payment.amount)}
                                    onChange={e => updateLocalPayment(student.id, 'amount', parseCurrency(e.target.value))}
                                    placeholder="R$ 0"
                                />
                            </div>
                        </div>
                    );
                })}
                {students.length === 0 && !loading && (
                    <div className="sheet sheet-p text-center">
                        <p className="text-text-main font-semibold">Nenhum aluno encontrado</p>
                        <p className="text-text-muted text-sm mt-1.5">
                            {search ? 'Tente outro nome ou limpe a busca.' : 'Cadastre alunos para lançar as mensalidades do mês.'}
                        </p>
                    </div>
                )}
            </div>

            {/* Mobile Save + Pagination */}
            <div className="md:hidden space-y-3 mb-4">
                <button onClick={handleSavePayments} disabled={saving} className="btn btn-primary w-full py-3 justify-center">
                    {saving ? 'Salvando...' : <><DollarSign size={16} /> Salvar alterações</>}
                </button>
                <div className="flex justify-between items-center sheet p-2.5">
                    <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="btn btn-outline text-xs">Anterior</button>
                    <span className="text-text-muted text-xs tabular">Pág. {page + 1} de {Math.max(1, Math.ceil(totalStudents / limit))}</span>
                    <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * limit >= totalStudents} className="btn btn-outline text-xs">Próxima</button>
                </div>
            </div>

            <div className="hidden md:flex sheet overflow-hidden relative h-[500px] flex-col">
                {(loading || saving) && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--sheet) 78%, transparent)' }}>
                        <Loading text={saving ? 'Salvando alterações...' : 'Carregando financeiro...'} />
                    </div>
                )}
                <div className="px-4 py-3 rule-b flex items-center justify-between shrink-0" style={{ background: 'var(--desk)' }}>
                    <h2 className="label-print">
                        Folha de {new Date(0, selectedMonth - 1).toLocaleString('pt-BR', { month: 'long' })} de {selectedYear}
                    </h2>
                    <button onClick={handleSavePayments} disabled={saving} className="btn btn-primary">
                        {saving ? 'Salvando...' : <><DollarSign size={15} /> Salvar alterações</>}
                    </button>
                </div>
                <div className="overflow-x-auto flex-1 overflow-y-auto">
                    <table style={{ minWidth: '900px' }}>
                        <thead className="sticky top-0 z-10">
                            <tr>
                                <th>
                                    <button
                                        onClick={() => setSortDesc(!sortDesc)}
                                        className="flex items-center gap-1 bg-transparent border-none p-0 cursor-pointer uppercase tracking-[0.07em] text-[0.6875rem] font-semibold text-text-muted hover:text-text-main transition-colors"
                                    >
                                        Aluno
                                        {sortDesc ? <ArrowDown size={13} className="text-primary" /> : <ArrowUp size={13} className="text-primary" />}
                                    </button>
                                </th>
                                <th className="whitespace-nowrap min-w-[150px]">Responsável</th>
                                <th className="whitespace-nowrap min-w-[110px]">Ano</th>
                                <th className="whitespace-nowrap min-w-[110px]">Tipo</th>
                                <th className="w-[150px]">Situação</th>
                                <th className="w-[140px] text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map(student => {
                                const payment = localPayments[student.id] || { status: 'PENDING', amount: 0, student_id: student.id };
                                const isPaid = payment.status === 'PAID';
                                return (
                                    <tr key={student.id}>
                                        <td className="font-medium text-sm">{student.name}</td>
                                        <td className="text-sm text-text-muted whitespace-nowrap">{student.parent_name || '—'}</td>
                                        <td className="text-sm text-text-muted whitespace-nowrap">{student.school_year || '—'}</td>
                                        <td className="text-sm text-text-muted whitespace-nowrap">{student.class_type || '—'}</td>
                                        <td>
                                            <select
                                                aria-label={`Situação da mensalidade de ${student.name}`}
                                                className={`stamp cursor-pointer ${isPaid ? 'stamp-paid' : 'stamp-pending'}`}
                                                value={payment.status}
                                                onChange={e => updateLocalPayment(student.id, 'status', e.target.value)}
                                            >
                                                <option value="PENDING">Pendente</option>
                                                <option value="PAID">Pago</option>
                                            </select>
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                aria-label={`Valor da mensalidade de ${student.name}`}
                                                className="w-full bg-transparent border-b border-rule-strong outline-none py-1 text-sm text-right focus:border-primary text-text-main tabular font-medium"
                                                value={formatCurrency(payment.amount)}
                                                onChange={e => updateLocalPayment(student.id, 'amount', parseCurrency(e.target.value))}
                                                placeholder="R$ 0"
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                            {students.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={6} className="py-10 text-center">
                                        <p className="text-text-main font-semibold">Nenhum aluno encontrado</p>
                                        <p className="text-text-muted text-sm mt-1.5">
                                            {search ? 'Tente outro nome ou limpe a busca.' : 'Cadastre alunos para lançar as mensalidades do mês.'}
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex justify-between items-center px-4 py-3 rule-t mt-auto shrink-0" style={{ background: 'var(--desk)' }}>
                    <button
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="px-4 py-2 btn btn-outline disabled:opacity-50 disabled:cursor-not-allowed rounded-[2px] text-sm"
                    >
                        Anterior
                    </button>
                    <span className="text-text-muted text-sm">
                        Página {page + 1} de {Math.max(1, Math.ceil(totalStudents / limit))}
                    </span>
                    <button
                        onClick={() => setPage(p => p + 1)}
                        disabled={(page + 1) * limit >= totalStudents}
                        className="px-4 py-2 btn btn-outline disabled:opacity-50 disabled:cursor-not-allowed rounded-[2px] text-sm"
                    >
                        Próxima
                    </button>
                </div>
            </div>
        </div>
    );
};
