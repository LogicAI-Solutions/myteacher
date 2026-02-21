import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { Plus, Save, Calendar, Users, X, FileText, Pencil, Trash2, AlertTriangle, Eye, Download, BookOpen, ClipboardList, History, ArrowLeft, DollarSign, GraduationCap } from 'lucide-react';
import { formatPhone, unmaskPhone, formatCurrency, parseCurrency } from '../utils/masks';
import { Loading } from '../components/Loading';
import { ManageStudentsModal } from '../components/ManageStudentsModal';

interface Student {
    id: number;
    name: string;
    phone?: string;
    parent_name?: string;
    parent_phone?: string;
    parent_email?: string;
    active?: boolean;
}

interface ClassModel {
    id: number;
    name: string;
    schedule: string;
}

interface AttendanceSession {
    id: number;
    date: string;
    description: string;
    lesson_number: number;
}

interface LogInput {
    student_id: number;
    status: string; // 'present', 'absent'
    essay_delivered: boolean;
    grade: number | '';
    observation: string;
}

interface AttendanceLog {
    id: number;
    student_id: number;
    status: string;
    essay_delivered: boolean;
    grade: number;
    observation: string;
    student?: { name: string };
}

interface SessionDetail extends AttendanceSession {
    logs: AttendanceLog[];
}

interface Payment {
    id: number;
    student_id: number;
    month: number;
    year: number;
    status: string; // 'PENDING', 'PAID', 'LATE'
    amount: number;
    paid_at?: string;
    student?: Student;
}

interface PaymentInput {
    student_id: number;
    status: string;
    amount: number;
    id?: number;
    paid_at?: string | null;
}

export const ClassDetails = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [classData, setClassData] = useState<ClassModel | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [sessions, setSessions] = useState<AttendanceSession[]>([]);

    const [activeTab, setActiveTab] = useState<'attendance' | 'students' | 'history' | 'payments'>('attendance');
    const [showEnrollModal, setShowEnrollModal] = useState(false);

    // Payments Local State
    const [localPayments, setLocalPayments] = useState<Record<number, PaymentInput>>({});
    const [savingPayments, setSavingPayments] = useState(false);

    // New Student Modal State
    const [showCreateStudentModal, setShowCreateStudentModal] = useState(false);
    const [newStudentData, setNewStudentData] = useState({ name: '', phone: '', parent_name: '', parent_phone: '', parent_email: '' });
    const [creatingStudent, setCreatingStudent] = useState(false);

    // Edit Student State
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [editStudentData, setEditStudentData] = useState({ name: '', phone: '', parent_name: '', parent_phone: '', parent_email: '' });

    // Delete Student State
    const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);

    // Payment State
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // History Details State
    const [viewingSession, setViewingSession] = useState<SessionDetail | null>(null);
    const [loadingSession, setLoadingSession] = useState(false);

    // Attendance Form State
    const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
    const [sessionDesc, setSessionDesc] = useState('');
    const [attendanceLogs, setAttendanceLogs] = useState<Record<number, LogInput>>({});

    // Notification State
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'warning' } | null>(null);
    const [saving, setSaving] = useState(false);

    const showNotification = (message: string, type: 'success' | 'error' | 'warning') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        fetchClassData();
        fetchStudents();
        fetchSessions();
    }, [id]);

    useEffect(() => {
        if (activeTab === 'payments') {
            fetchPayments();
        }
    }, [activeTab, selectedMonth, selectedYear]);

    useEffect(() => {
        const initialLogs: Record<number, LogInput> = {};
        students.forEach(s => {
            initialLogs[s.id] = {
                student_id: s.id,
                status: 'present',
                essay_delivered: false,
                grade: '',
                observation: ''
            };
        });
        setAttendanceLogs(prev => ({ ...initialLogs, ...prev }));
    }, [students]);
    useEffect(() => {
        const maxLesson = sessions.reduce((max, s) => Math.max(max, s.lesson_number || 0), 0);
        setSessionDesc(`Aula ${(maxLesson + 1).toString().padStart(2, '0')}`);
    }, [sessions]);

    const fetchClassData = async () => {
        try {
            const res = await api.get(`/classes/${id}`);
            setClassData(res.data);
        } catch (e: any) {
            console.error(e);
            if (e.response && e.response.status === 404) {
                navigate('/404', { replace: true });
            }
        }
    };

    const fetchStudents = async () => {
        try {
            const res = await api.get(`/classes/${id}/students`);
            setStudents(res.data);
        } catch (e) { console.error(e); }
    };

    const fetchSessions = async () => {
        try {
            const res = await api.get(`/classes/${id}/attendance`);
            setSessions(res.data);
        } catch (e) { console.error(e); }
    };

    const handleEnrollStudent = async (studentId: number) => {
        try {
            await api.post(`/classes/${id}/enroll/${studentId}`);
            fetchStudents();
            showNotification('Aluno matriculado!', 'success');
        } catch (e) { showNotification('Erro ao matricular', 'error'); }
    };

    const handleUnenrollStudent = async (studentId: number) => {
        requestConfirmation(
            'Remover Aluno da Turma?',
            <>Tem certeza que deseja remover este aluno da turma? O histórico de presença <strong>desta turma</strong> será mantido, mas ele não aparecerá mais na lista.</>,
            async () => {
                try {
                    await api.delete(`/classes/${id}/enroll/${studentId}`);
                    fetchStudents();
                    showNotification('Aluno removido da turma!', 'success');
                } catch (e) { showNotification('Erro ao remover aluno', 'error'); }
            },
            'warning'
        );
    };

    const fetchPayments = async () => {
        try {
            // Fetch for all students in this class.
            // Since API filters by student_id or all, we might need a loop or a better API endpoint.
            // Re-using GET /payments/ with year/month filter.
            // It returns ALL payments. We should filter by our students.
            const res = await api.get(`/payments/?year=${selectedYear}&month=${selectedMonth}`);
            // Filter payments for students in this class
            const classStudentIds = students.map(s => s.id);
            const classPayments = res.data.filter((p: Payment) => classStudentIds.includes(p.student_id));

            // Initialize Local State
            const initialPayments: Record<number, PaymentInput> = {};
            students.forEach(s => {
                const existing = classPayments.find((p: Payment) => p.student_id === s.id);
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
    };

    const updateLocalPayment = (studentId: number, field: keyof PaymentInput, value: any) => {
        setLocalPayments(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], [field]: value }
        }));
    };

    const handleSavePayments = async () => {
        setSavingPayments(true);
        try {
            const updates = Object.values(localPayments);
            // Process updates sequentially or parallel
            await Promise.all(updates.map(async (p) => {
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
                    // Only create if status is PAID or amount > 0 to avoid spamming empty pendings? 
                    // Verify if backend allows duplicate defaults. current implementation fetches by year/month.
                    // If we save 'PENDING' 0, it creates a record. It's fine.
                    // But to avoid creating 30 records for nothing, maybe check if changed?
                    // For simplicity and "Save" button expectation, we save valid inputs.
                    // Ideally we check if it differs from DB. But let's just Upsert logic.
                    // Our backend create_payment doesn't check existence! It might duplicate.
                    // We should check if p.id exists. If not, create.
                    // But if we have initial 'PENDING' from fetchPayments (which didn't find record), it has no ID.
                    await api.post('/payments/', payload);
                }
            }));

            showNotification('Pagamentos salvos com sucesso!', 'success');
            fetchPayments(); // Refresh to get IDs
        } catch (e) {
            console.error(e);
            showNotification('Erro ao salvar pagamentos', 'error');
        } finally {
            setSavingPayments(false);
        }
    };

    const loadAllStudents = async () => {
        try {
            const res = await api.get('/students/?limit=1000');
            setAllStudents(res.data.items);
            setShowEnrollModal(true);
        } catch (e) { console.error(e); }
    };

    const handleCreateStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStudentData.name.trim()) return;
        setCreatingStudent(true);

        try {
            const payload = {
                ...newStudentData,
                phone: unmaskPhone(newStudentData.phone),
                parent_phone: unmaskPhone(newStudentData.parent_phone)
            };
            const res = await api.post('/students/', payload);
            await handleEnrollStudent(res.data.id);
            setNewStudentData({ name: '', phone: '', parent_name: '', parent_phone: '', parent_email: '' });
            setShowCreateStudentModal(false);
        } catch (e) { alert('Erro ao criar aluno'); }
        finally { setCreatingStudent(false); }
    };

    const handleUpdateStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStudent || !editStudentData.name.trim()) return;
        try {
            const payload = {
                ...editStudentData,
                phone: unmaskPhone(editStudentData.phone),
                parent_phone: unmaskPhone(editStudentData.parent_phone)
            };
            await api.put(`/students/${editingStudent.id}`, payload);
            setEditingStudent(null);
            fetchStudents();
        } catch (e) { alert('Erro ao atualizar aluno'); }
    };

    const handleDeleteStudent = async () => {
        if (!deletingStudent) return;
        try {
            await api.delete(`/students/${deletingStudent.id}`);
            setDeletingStudent(null);
            fetchStudents();
        } catch (e) { alert('Erro ao excluir aluno'); }
    };

    const downloadFile = async (url: string, filename: string, method: 'GET' | 'POST' = 'GET', body: any = {}) => {
        try {
            const response = method === 'GET'
                ? await api.get(url, { responseType: 'blob' })
                : await api.post(url, body, { responseType: 'blob' });

            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            // Ensure filename ends with .docx
            const safeFilename = filename.endsWith('.docx') ? filename : `${filename}.docx`;
            link.download = safeFilename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error(error);
            showNotification("Erro ao baixar o relatório. Tente novamente.", 'error');
        }
    };

    const handleGenerateReport = (studentId: number) => {
        const student = students.find(s => s.id === studentId);
        const filename = student ? `Relatorio_${student.name.replace(/\s+/g, '_')}.docx` : 'relatorio.docx';
        // Student report is POST
        downloadFile(`/students/${studentId}/report/docx`, filename, 'POST', {});
    };

    const handleViewSession = async (sessionId: number) => {
        setLoadingSession(true);
        try {
            const res = await api.get(`/attendance-sessions/${sessionId}`);
            // We need to map student names manually if backend doesn't populate nested 'student' object
            // The schemas.AttendanceSession -> logs: List[AttendanceLog]
            // schemas.AttendanceLog includes student_id but maybe not student object unless configured.
            // Let's assume we match by ID from our `students` list if backend missing name.
            const sessionData = res.data;
            setViewingSession(sessionData);
        } catch (e) {
            console.error(e);
            showNotification("Erro ao carregar detalhes da aula.", 'error');
        } finally {
            setLoadingSession(false);
        }
    };

    const handleGenerateSessionReport = (sessionId: number) => {
        const session = sessions.find(s => s.id === sessionId);
        const dateStr = session ? session.date : 'aula';
        downloadFile(`/attendance-sessions/${sessionId}/report/docx`, `Aula_${dateStr}.docx`);
    };

    const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
    const [confirmation, setConfirmation] = useState<{
        isOpen: boolean;
        title: string;
        message: React.ReactNode;
        onConfirm: () => void;
        type?: 'danger' | 'warning' | 'info';
    } | null>(null);

    const requestConfirmation = (title: string, message: React.ReactNode, onConfirm: () => void, type: 'danger' | 'warning' | 'info' = 'danger') => {
        setConfirmation({ isOpen: true, title, message, onConfirm, type });
    };

    const handleDeleteSession = async (sessionId: number) => {
        try {
            await api.delete(`/classes/${id}/attendance/${sessionId}`);
            showNotification('Chamada excluída com sucesso!', 'success');
            setViewingSession(null);

            // If we deleted the session currently being edited, clear the form
            if (editingSessionId === sessionId) {
                setEditingSessionId(null);
                setSessionDesc('');
                // Reset to default empty logs
                const initialLogs: Record<number, LogInput> = {};
                students.forEach(s => {
                    initialLogs[s.id] = {
                        student_id: s.id,
                        status: 'present',
                        essay_delivered: false,
                        grade: '',
                        observation: ''
                    };
                });
                setAttendanceLogs(initialLogs);
            }

            fetchSessions();
        } catch (e) {
            console.error(e);
            showNotification('Erro ao excluir chamada', 'error');
        }
    };

    const handleEditSession = (session: SessionDetail) => {
        setSessionDesc(session.description);
        setSessionDate(session.date);
        setEditingSessionId(session.id);

        const newLogs: Record<number, LogInput> = {};
        // Initialize logs for all students first
        students.forEach(s => {
            newLogs[s.id] = {
                student_id: s.id,
                status: 'present',
                essay_delivered: false,
                grade: '',
                observation: ''
            };
        });

        // Overwrite with existing session logs
        session.logs.forEach(log => {
            newLogs[log.student_id] = {
                student_id: log.student_id,
                status: log.status,
                essay_delivered: log.essay_delivered,
                grade: log.grade === null ? '' : log.grade,
                observation: log.observation || ''
            };
        });

        setAttendanceLogs(newLogs);
        setViewingSession(null);
        setActiveTab('attendance');
    };

    const handleSaveAttendance = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        console.log("Saving attendance...");

        if (!sessionDesc) {
            showNotification('Por favor, descreva a aula (ex: Aula 10)', 'warning');
            return;
        }

        setSaving(true);

        let logsToProcess = Object.values(attendanceLogs).filter(l => students.find(s => s.id === l.student_id));

        // Se for nova chamada, não salvar presença para alunos inativos
        if (!editingSessionId) {
            logsToProcess = logsToProcess.filter(l => {
                const s = students.find(std => std.id === l.student_id);
                return s?.active !== false;
            });
        }

        const payload = {
            date: sessionDate,
            description: sessionDesc,
            logs: logsToProcess.map(l => {
                const gradeNum = l.grade === '' ? null : Number(l.grade);
                return {
                    ...l,
                    grade: isNaN(gradeNum as number) ? null : gradeNum
                };
            })
        };

        try {
            if (editingSessionId) {
                await api.put(`/classes/${id}/attendance/${editingSessionId}`, payload);
                showNotification('Chamada atualizada com sucesso!', 'success');
            } else {
                await api.post(`/classes/${id}/attendance`, payload);
                showNotification('Chamada salva com sucesso!', 'success');
            }

            setSessionDesc('');
            setEditingSessionId(null);

            const initialLogs: Record<number, LogInput> = {};
            students.forEach(s => {
                initialLogs[s.id] = {
                    student_id: s.id,
                    status: 'present',
                    essay_delivered: false,
                    grade: '',
                    observation: ''
                };
            });
            setAttendanceLogs(initialLogs);
            fetchSessions();
            setActiveTab('history');
        } catch (e: any) {
            console.error(e);
            console.log(e.response); // Debug
            const msg = e.response?.data?.detail || (e.response?.status === 500 && e.response?.data?.detail?.includes("Duplicate") ? "Já existe uma chamada para esta data." : 'Erro ao salvar chamada');
            showNotification(msg, 'error');
        } finally {
            setSaving(false);
        }
    };

    const updateLog = (studentId: number, field: keyof LogInput, value: any) => {
        setAttendanceLogs(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], [field]: value }
        }));
    };

    // Helper to get student name
    const getStudentName = (id: number) => {
        return students.find(s => s.id === id)?.name || "Aluno Removido";
    };

    if (!classData) return (
        <div className="h-screen flex items-center justify-center">
            <Loading text="Carregando dados da turma..." />
        </div>
    );

    const activeStudents = students.filter((s: Student) => s.active !== false);

    return (
        <div>
            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-4 right-4 z-[100] px-6 py-4 rounded-xl shadow-2xl backdrop-blur-md border animate-slide-in flex items-center gap-3 ${toast.type === 'success' ? 'bg-success/20 border-success/30 text-white' :
                    toast.type === 'error' ? 'bg-danger/20 border-danger/30 text-white' :
                        'bg-yellow-500/20 border-yellow-500/30 text-white'
                    }`}>
                    {toast.type === 'success' && <div className="p-1 bg-success rounded-full flex items-center justify-center"><Save size={14} /></div>}
                    {toast.type === 'error' && <div className="p-1 bg-danger rounded-full flex items-center justify-center"><AlertTriangle size={14} /></div>}
                    {toast.type === 'warning' && <div className="p-1 bg-yellow-500 rounded-full flex items-center justify-center"><AlertTriangle size={14} /></div>}
                    <div>
                        <h4 className="font-bold text-sm uppercase tracking-wide opacity-80">
                            {toast.type === 'success' ? 'Sucesso' : toast.type === 'error' ? 'Erro' : 'Atenção'}
                        </h4>
                        <p className="text-sm font-medium">{toast.message}</p>
                    </div>
                    <button onClick={() => setToast(null)} className="ml-4 opacity-50 hover:opacity-100"><X size={16} /></button>
                </div>
            )}

            {/* Header */}
            <div className="mb-8 animate-fade-in">
                <button onClick={() => navigate('/dashboard/classes')} className="text-text-muted hover:text-white flex items-center gap-1.5 text-sm mb-4 transition-colors group">
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Voltar para Turmas
                </button>

                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">{classData.name}</h1>
                        <p className="text-primary-light flex items-center gap-2 mt-2 font-medium bg-primary/10 w-fit px-3 py-1.5 rounded-full text-sm border border-primary/20">
                            <Calendar size={14} /> {classData.schedule}
                        </p>
                    </div>

                    {/* Stats Cards */}
                    <div className="flex gap-3 w-full lg:w-auto">
                        <div className="glass-card p-3 px-4 flex items-center gap-3 flex-1 lg:flex-none border border-white/5">
                            <div className="bg-primary/15 p-2 rounded-lg border border-primary/20">
                                <Users size={18} className="text-primary" />
                            </div>
                            <div>
                                <p className="text-[10px] text-text-muted uppercase tracking-wider">Alunos</p>
                                <p className="text-lg font-bold text-white">{activeStudents.length}</p>
                            </div>
                        </div>
                        <div className="glass-card p-3 px-4 flex items-center gap-3 flex-1 lg:flex-none border border-white/5">
                            <div className="bg-indigo-500/15 p-2 rounded-lg border border-indigo-500/20">
                                <BookOpen size={18} className="text-indigo-400" />
                            </div>
                            <div>
                                <p className="text-[10px] text-text-muted uppercase tracking-wider">Aulas</p>
                                <p className="text-lg font-bold text-white">{sessions.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="mt-6 bg-bg-card/50 p-1 rounded-xl flex gap-1 w-full md:w-fit overflow-x-auto border border-white/5">
                    {[
                        { key: 'attendance', label: 'Chamada', icon: <ClipboardList size={16} /> },
                        { key: 'history', label: 'Histórico', icon: <History size={16} /> },
                    ].map(({ key, label, icon }) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key as any)}
                            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 flex-1 md:flex-none justify-center ${activeTab === key
                                ? 'bg-primary text-white shadow-lg shadow-primary/25'
                                : 'text-text-muted hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {icon}
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="animate-slide-up">
                {activeTab === 'students' && (
                    <div className="glass-card p-5 sm:p-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-white/5 pb-4 gap-3">
                            <h2 className="text-xl font-bold flex items-center gap-3 text-white">
                                <div className="bg-indigo-500/15 p-2 rounded-lg border border-indigo-500/20">
                                    <GraduationCap size={20} className="text-indigo-400" />
                                </div>
                                Alunos Matriculados
                                <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-full border border-primary/20">{students.length}</span>
                            </h2>
                            <div className="flex items-center gap-3">
                                <button onClick={loadAllStudents} className="btn btn-outline"><Users size={16} /> Gerenciar</button>
                                <button onClick={() => setShowCreateStudentModal(true)} className="btn btn-primary-gradient flex items-center gap-2"><Plus size={16} /> Novo Aluno</button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {students.map((s: Student) => (
                                <div key={s.id} className="flex items-center justify-between p-3.5 rounded-xl bg-bg-dark/30 border border-white/5 hover:border-primary/20 transition-all group hover:bg-bg-dark/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-indigo-500/20 flex items-center justify-center border border-white/10 shrink-0">
                                            <span className="text-sm font-bold text-primary-light">{s.name.charAt(0).toUpperCase()}</span>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-white text-sm group-hover:text-primary-light transition-colors">{s.name}</p>
                                            <p className="text-xs text-text-muted flex items-center gap-1">
                                                <span className={`w-1.5 h-1.5 rounded-full ${s.active !== false ? 'bg-success' : 'bg-text-muted/50'}`}></span>
                                                {s.active !== false ? 'Ativo' : 'Inativo'}
                                                <span className="mx-1 opacity-30">•</span>
                                                #{s.id.toString().padStart(4, '0')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleGenerateReport(s.id)} className="p-2 hover:bg-primary/20 text-text-muted hover:text-primary rounded-lg transition-colors" title="Relatório">
                                            <FileText size={15} />
                                        </button>
                                        <button onClick={() => {
                                            setEditingStudent(s);
                                            setEditStudentData({
                                                name: s.name,
                                                phone: s.phone || '',
                                                parent_name: s.parent_name || '',
                                                parent_phone: s.parent_phone || '',
                                                parent_email: s.parent_email || ''
                                            });
                                        }} className="p-2 hover:bg-white/10 text-text-muted hover:text-white rounded-lg transition-colors" title="Editar">
                                            <Pencil size={15} />
                                        </button>
                                        <button onClick={() => setDeletingStudent(s)} className="p-2 hover:bg-danger/20 text-text-muted hover:text-danger rounded-lg transition-colors" title="Excluir">
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {students.length === 0 && (
                                <div className="p-12 text-center">
                                    <div className="bg-white/5 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
                                        <GraduationCap size={28} className="text-text-muted/50" />
                                    </div>
                                    <p className="text-text-muted text-lg font-medium">Nenhum aluno matriculado</p>
                                    <p className="text-text-muted/60 text-sm mt-1">Clique em "Novo Aluno" para começar.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'attendance' && (
                    <div className="glass-card p-5 sm:p-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent"></div>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-white/5 pb-4 gap-3">
                            <h2 className="text-xl font-bold flex items-center gap-3 text-white">
                                <div className="bg-primary/15 p-2 rounded-lg border border-primary/20">
                                    <ClipboardList size={20} className="text-primary" />
                                </div>
                                {editingSessionId ? 'Editando Chamada' : 'Nova Chamada'}
                            </h2>
                            <div className="flex items-center gap-3">
                                <button onClick={loadAllStudents} className="btn btn-outline">
                                    <Users size={16} /> Gerenciar Alunos
                                </button>
                                <div className="text-sm text-text-muted bg-bg-dark px-3 py-1 rounded-lg border border-white/5">
                                    {new Date().toLocaleDateString()}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="md:col-span-2 space-y-1">
                                <label className="text-xs font-medium text-text-muted uppercase tracking-wider ml-1">Descrição</label>
                                <input className="w-full p-3 bg-bg-dark/50 border border-border rounded-lg text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all" value={sessionDesc} onChange={e => setSessionDesc(e.target.value)} placeholder="Ex: Introdução à Álgebra (Aula 01)" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-text-muted uppercase tracking-wider ml-1">Data</label>
                                <input type="date" className="w-full p-3 bg-bg-dark/50 border border-border rounded-lg text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all" value={sessionDate} onChange={e => setSessionDate(e.target.value)} />
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-xl border border-white/5 bg-bg-dark/20">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-black/20">
                                            <th className="text-left p-4 text-xs font-bold text-text-muted uppercase tracking-wider min-w-[200px]">Aluno</th>
                                            <th className="text-left p-4 text-xs font-bold text-text-muted uppercase tracking-wider w-[150px]">Status</th>
                                            <th className="text-center p-4 text-xs font-bold text-text-muted uppercase tracking-wider w-[150px]">Trabalho Entregue?</th>
                                            <th className="text-left p-4 text-xs font-bold text-text-muted uppercase tracking-wider w-[120px]">Nota</th>
                                            <th className="text-left p-4 text-xs font-bold text-text-muted uppercase tracking-wider min-w-[250px]">Obs</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {[...students].filter(s => s.active !== false).sort((a, b) => a.name.localeCompare(b.name)).map(s => {
                                            const log = attendanceLogs[s.id] || {};
                                            return (
                                                <tr key={s.id} className="hover:bg-white/5 transition-colors group">
                                                    <td className="p-4 font-medium text-white">{s.name}</td>
                                                    <td className="p-4">
                                                        <select
                                                            className={`w-full p-2 rounded-lg text-sm border-none focus:ring-2 focus:ring-primary outline-none transition-colors cursor-pointer ${log.status === 'present' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}
                                                            value={log.status}
                                                            onChange={e => updateLog(s.id, 'status', e.target.value)}
                                                        >
                                                            <option value="present" className="bg-bg-card text-white">Presente</option>
                                                            <option value="absent" className="bg-bg-card text-white">Ausente</option>
                                                        </select>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <button
                                                            onClick={() => updateLog(s.id, 'essay_delivered', !log.essay_delivered)}
                                                            className={`px-3 py-1 rounded-full text-xs font-bold ring-1 transition-all ${log.essay_delivered
                                                                ? 'bg-primary/20 text-primary ring-primary/30 hover:bg-primary/30'
                                                                : 'bg-white/5 text-text-muted ring-white/10 hover:bg-white/10'
                                                                }`}
                                                        >
                                                            {log.essay_delivered ? 'Sim' : 'Não'}
                                                        </button>
                                                    </td>
                                                    <td className="p-4">
                                                        <input
                                                            type="number"
                                                            className={`w-full bg-transparent border-b outline-none py-1 text-sm text-center font-mono transition-colors ${log.essay_delivered
                                                                ? 'border-white/10 focus:border-primary text-primary-light placeholder-text-muted/30'
                                                                : 'border-transparent text-text-muted/20 cursor-not-allowed'
                                                                }`}
                                                            value={log.grade === undefined ? '' : log.grade}
                                                            onChange={e => updateLog(s.id, 'grade', e.target.value)}
                                                            placeholder={log.essay_delivered ? '-' : ''}
                                                            disabled={!log.essay_delivered}
                                                        />
                                                    </td>
                                                    <td className="p-4">
                                                        <input
                                                            className="w-full bg-transparent border-b border-white/10 focus:border-primary outline-none py-1 text-sm text-text-muted focus:text-white placeholder-text-muted/30 transition-colors"
                                                            value={log.observation || ''}
                                                            onChange={e => updateLog(s.id, 'observation', e.target.value)}
                                                            placeholder="Observação..."
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        {students.length > 0 && (
                            <div className="mt-8 flex justify-end">
                                <button
                                    onClick={handleSaveAttendance}
                                    disabled={saving}
                                    className={`
                                        bg-gradient-to-r from-primary to-primary-hover text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/25 
                                        transition-all flex items-center gap-2
                                        ${saving ? 'opacity-70 cursor-wait' : 'hover:shadow-primary/40 hover:-translate-y-1 active:translate-y-0'}
                                    `}
                                >
                                    {saving ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Salvando...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={20} /> Salvar Chamada
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {activeTab === 'history' && (
                <div className="space-y-3 animate-fade-in">
                    {sessions.length > 0 && (
                        <div className="flex items-center gap-2 mb-2">
                            <History size={16} className="text-text-muted" />
                            <span className="text-sm text-text-muted">{sessions.length} {sessions.length === 1 ? 'chamada registrada' : 'chamadas registradas'}</span>
                        </div>
                    )}
                    {sessions
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .map((sess, index) => {
                            const dynamicLabel = `Aula ${String(index + 1).padStart(2, '0')}`;
                            const displayTitle = sess.description?.match(/^Aula \d+$/) ? dynamicLabel : sess.description;
                            return (
                                <div key={sess.id} className="glass-card p-4 hover:border-primary/30 transition-all duration-300 group hover:translate-y-[-2px] hover:shadow-lg hover:shadow-primary/5">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center border border-primary/20 shrink-0">
                                                <span className="text-primary font-bold text-sm">{String(index + 1).padStart(2, '0')}</span>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white text-base group-hover:text-primary-light transition-colors">{displayTitle}</h3>
                                                <p className="text-text-muted text-sm flex items-center gap-1.5">
                                                    <Calendar size={12} /> {new Date(sess.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleViewSession(sess.id)} disabled={loadingSession} className="text-primary hover:text-white cursor-pointer transition-all px-4 py-2 bg-white/5 hover:bg-primary/20 rounded-xl text-sm flex items-center gap-2 border border-white/5 hover:border-primary/30 font-medium">
                                            <Eye size={16} /> Ver Detalhes
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    {sessions.length === 0 && (
                        <div className="glass-card p-12 text-center">
                            <div className="bg-white/5 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
                                <ClipboardList size={28} className="text-text-muted/50" />
                            </div>
                            <p className="text-text-muted text-lg font-medium">Nenhuma chamada registrada</p>
                            <p className="text-text-muted/60 text-sm mt-1">Crie uma chamada na aba "Chamada" para começar.</p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'payments' && (
                <div className="glass-card p-5 sm:p-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-white/5 pb-4 gap-3">
                        <h2 className="text-xl font-bold flex items-center gap-3 text-white">
                            <div className="bg-emerald-500/15 p-2 rounded-lg border border-emerald-500/20">
                                <DollarSign size={20} className="text-emerald-400" />
                            </div>
                            Mensalidades
                        </h2>
                        <div className="flex gap-2">
                            <select value={selectedMonth} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedMonth(Number(e.target.value))} className="bg-bg-dark/50 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all cursor-pointer">
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                    <option key={m} value={m} className="bg-bg-dark text-white">{new Date(0, m - 1).toLocaleString('pt-BR', { month: 'long' })}</option>
                                ))}
                            </select>
                            <select value={selectedYear} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedYear(Number(e.target.value))} className="bg-bg-dark/50 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all cursor-pointer">
                                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                                    <option key={y} value={y} className="bg-bg-dark text-white">{y}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {students.map((s: Student) => {
                            const payment = localPayments[s.id] || { status: 'PENDING', amount: 0, student_id: s.id };
                            const isPaid = payment.status === 'PAID';
                            return (
                                <div key={s.id} className="flex items-center justify-between p-3.5 rounded-xl bg-bg-dark/30 border border-white/5 hover:border-primary/20 transition-all group hover:bg-bg-dark/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-primary/20 flex items-center justify-center border border-white/10 shrink-0">
                                            <span className="text-sm font-bold text-emerald-300">{s.name.charAt(0).toUpperCase()}</span>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-white text-sm">{s.name}</p>
                                            <p className="text-xs text-text-muted">{s.parent_name || 'Sem responsável'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <select
                                            className={`p-2 px-3 rounded-lg text-xs font-bold border-none focus:ring-2 focus:ring-primary outline-none transition-colors cursor-pointer ${isPaid ? 'bg-success/20 text-success' : 'bg-yellow-500/20 text-yellow-400'}`}
                                            value={payment.status}
                                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateLocalPayment(s.id, 'status', e.target.value)}
                                        >
                                            <option value="PENDING" className="bg-bg-card text-white">Pendente</option>
                                            <option value="PAID" className="bg-bg-card text-white">Pago</option>
                                        </select>
                                        <input
                                            type="text"
                                            className={`w-28 bg-bg-dark/50 border rounded-lg px-3 py-2 text-sm font-mono text-right transition-colors ${isPaid
                                                ? 'border-white/10 focus:border-emerald-500 text-white focus:ring-2 focus:ring-emerald-500/20'
                                                : 'border-transparent text-text-muted/30 cursor-not-allowed'
                                                }`}
                                            value={formatCurrency(payment.amount)}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateLocalPayment(s.id, 'amount', parseCurrency(e.target.value))}
                                            disabled={!isPaid}
                                            placeholder="R$ 0,00"
                                        />
                                    </div>
                                </div>
                            );
                        })}
                        {students.length === 0 && (
                            <div className="p-12 text-center">
                                <div className="bg-white/5 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
                                    <DollarSign size={28} className="text-text-muted/50" />
                                </div>
                                <p className="text-text-muted text-lg font-medium">Nenhum aluno para gerenciar pagamentos</p>
                                <p className="text-text-muted/60 text-sm mt-1">Matricule alunos primeiro na aba "Alunos".</p>
                            </div>
                        )}
                    </div>
                    {students.length > 0 && (
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={handleSavePayments}
                                disabled={savingPayments}
                                className={`
                                    bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/25 
                                    transition-all flex items-center gap-2
                                    ${savingPayments ? 'opacity-70 cursor-wait' : 'hover:shadow-emerald-500/40 hover:-translate-y-1 active:translate-y-0'}
                                `}
                            >
                                {savingPayments ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Salvando...
                                    </>
                                ) : (
                                    <>
                                        <Save size={20} /> Salvar Pagamentos
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Modals */}
            {/* ... Other modals (Enroll, Create, Edit, Delete) same as before ... */}
            {/* Enrollment Modal */}
            {/* Manage Students Modal */}
            {/* Manage Students Modal */}
            <ManageStudentsModal
                isOpen={showEnrollModal}
                onClose={() => setShowEnrollModal(false)}
                students={allStudents}
                enrolledStudentIds={students.map(s => s.id)}
                onEnroll={handleEnrollStudent}
                onUnenroll={handleUnenrollStudent}
            />

            {/* Create Student Modal */}
            {showCreateStudentModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="glass-card w-full max-w-md animate-slide-up relative">
                        <button onClick={() => setShowCreateStudentModal(false)} className="absolute top-4 right-4 text-text-muted hover:text-white">
                            <X size={20} />
                        </button>
                        <h3 className="text-xl mb-6 font-bold text-white flex items-center gap-2">
                            <Plus size={20} className="text-primary" /> Novo Aluno
                        </h3>
                        <form onSubmit={handleCreateStudent} className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-text-muted uppercase tracking-wider ml-1">Nome Completo</label>
                                <input
                                    className="w-full p-3 bg-bg-dark/50 border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                    value={newStudentData.name}
                                    onChange={e => setNewStudentData({ ...newStudentData, name: e.target.value })}
                                    placeholder="Ex: João Silva"
                                    required
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-text-muted uppercase tracking-wider ml-1">Celular</label>
                                <input
                                    className="w-full p-3 bg-bg-dark/50 border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                    value={newStudentData.phone}
                                    onChange={e => setNewStudentData({ ...newStudentData, phone: formatPhone(e.target.value) })}
                                    maxLength={15}
                                    placeholder="(99) 99999-9999"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-text-muted uppercase tracking-wider ml-1">Responsável</label>
                                    <input
                                        className="w-full p-3 bg-bg-dark/50 border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                        value={newStudentData.parent_name}
                                        onChange={e => setNewStudentData({ ...newStudentData, parent_name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-text-muted uppercase tracking-wider ml-1">Cel. Responsável</label>
                                    <input
                                        className="w-full p-3 bg-bg-dark/50 border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                        value={newStudentData.parent_phone}
                                        onChange={e => setNewStudentData({ ...newStudentData, parent_phone: formatPhone(e.target.value) })}
                                        maxLength={15}
                                        placeholder="(99) 99999-9999"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-text-muted uppercase tracking-wider ml-1">Email Responsável</label>
                                <input
                                    type="email"
                                    className="w-full p-3 bg-bg-dark/50 border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                    value={newStudentData.parent_email}
                                    onChange={e => setNewStudentData({ ...newStudentData, parent_email: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setShowCreateStudentModal(false)} className="px-4 py-2 rounded-lg text-text-muted hover:bg-white/5 transition-colors">Cancelar</button>
                                <button type="submit" disabled={creatingStudent} className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-6 rounded-lg shadow-lg shadow-primary/20 transition-all cursor-pointer disabled:opacity-50">
                                    {creatingStudent ? 'Criando...' : 'Adicionar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Student Modal */}
            {editingStudent && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="glass-card w-full max-w-md animate-slide-up relative">
                        <button onClick={() => setEditingStudent(null)} className="absolute top-4 right-4 text-text-muted hover:text-white">
                            <X size={20} />
                        </button>
                        <h3 className="text-xl mb-6 font-bold text-white flex items-center gap-2">
                            <Pencil size={20} className="text-primary" /> Editar Aluno
                        </h3>
                        <form onSubmit={handleUpdateStudent} className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-text-muted uppercase tracking-wider ml-1">Nome Completo</label>
                                <input
                                    className="w-full p-3 bg-bg-dark/50 border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                    value={editStudentData.name}
                                    onChange={e => setEditStudentData({ ...editStudentData, name: e.target.value })}
                                    required
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-text-muted uppercase tracking-wider ml-1">Celular</label>
                                <input
                                    className="w-full p-3 bg-bg-dark/50 border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                    value={editStudentData.phone}
                                    onChange={e => setEditStudentData({ ...editStudentData, phone: formatPhone(e.target.value) })}
                                    maxLength={15}
                                    placeholder="(99) 99999-9999"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-text-muted uppercase tracking-wider ml-1">Responsável</label>
                                    <input
                                        className="w-full p-3 bg-bg-dark/50 border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                        value={editStudentData.parent_name}
                                        onChange={e => setEditStudentData({ ...editStudentData, parent_name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-text-muted uppercase tracking-wider ml-1">Cel. Responsável</label>
                                    <input
                                        className="w-full p-3 bg-bg-dark/50 border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                        value={editStudentData.parent_phone}
                                        onChange={e => setEditStudentData({ ...editStudentData, parent_phone: formatPhone(e.target.value) })}
                                        maxLength={15}
                                        placeholder="(99) 99999-9999"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-text-muted uppercase tracking-wider ml-1">Email Responsável</label>
                                <input
                                    type="email"
                                    className="w-full p-3 bg-bg-dark/50 border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                    value={editStudentData.parent_email}
                                    onChange={e => setEditStudentData({ ...editStudentData, parent_email: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setEditingStudent(null)} className="px-4 py-2 rounded-lg text-text-muted hover:bg-white/5 transition-colors">Cancelar</button>
                                <button type="submit" className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-6 rounded-lg shadow-lg shadow-primary/20 transition-all cursor-pointer">
                                    Salvar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Student Modal */}
            {deletingStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="glass-card w-full max-w-sm p-6 relative animate-slide-up border-danger/30">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 rounded-full bg-danger/20 flex items-center justify-center mb-4 text-danger">
                                <AlertTriangle size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Excluir Aluno?</h3>
                            <p className="text-text-muted mb-6">
                                Tem certeza que deseja remover <strong>{deletingStudent.name}</strong>? Todo o histórico de presença será apagado.
                            </p>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setDeletingStudent(null)}
                                    className="flex-1 py-2 rounded-lg bg-bg-dark border border-white/10 text-white hover:bg-white/5 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleDeleteStudent}
                                    className="flex-1 py-2 rounded-lg bg-danger hover:bg-danger-hover text-white font-bold shadow-lg shadow-danger/20 transition-colors"
                                >
                                    Sim, Excluir
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Session Details Modal */}
            {viewingSession && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-bg-card border border-white/5 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl relative animate-slide-up flex flex-col">

                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex justify-between items-start sticky top-0 bg-bg-card z-10">
                            <div>
                                <h3 className="text-xl font-bold text-white mb-1">{viewingSession.description}</h3>
                                <p className="text-text-muted text-sm flex items-center gap-2">
                                    <Calendar size={14} /> {viewingSession.date}
                                </p>
                            </div>
                            <button onClick={() => setViewingSession(null)} className="text-text-muted hover:text-white transition-colors p-1 rounded-full hover:bg-white/5">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        <th className="py-3 px-2 text-text-muted font-medium">Aluno</th>
                                        <th className="py-3 px-2 text-text-muted font-medium">Status</th>
                                        <th className="py-3 px-2 text-text-muted font-medium">Nota</th>
                                        <th className="py-3 px-2 text-text-muted font-medium">Observação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {viewingSession.logs
                                        .sort((a, b) => {
                                            const nameA = a.student?.name || getStudentName(a.student_id);
                                            const nameB = b.student?.name || getStudentName(b.student_id);
                                            return nameA.localeCompare(nameB);
                                        })
                                        .map(log => (
                                            <tr key={log.id} className="hover:bg-white/5 transition-colors">
                                                <td className="py-3 px-2 font-medium text-white">{log.student?.name || getStudentName(log.student_id)}</td>
                                                <td className="py-3 px-2">
                                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${log.status === 'present' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${log.status === 'present' ? 'bg-success' : 'bg-danger'}`}></span>
                                                        {log.status === 'present' ? 'Presente' : 'Ausente'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-2 text-text-muted">{log.grade !== null ? log.grade : '—'}</td>
                                                <td className="py-3 px-2 text-text-muted truncate max-w-[150px]" title={log.observation}>{log.observation || '—'}</td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-white/5 flex flex-col-reverse sm:flex-row justify-end gap-3 bg-bg-card rounded-b-2xl">
                            <button
                                onClick={() => {
                                    requestConfirmation(
                                        'Excluir Chamada?',
                                        <>Tem certeza que deseja excluir a chamada de <strong>{viewingSession.description}</strong>? Esta ação não pode ser desfeita.</>,
                                        () => handleDeleteSession(viewingSession.id),
                                        'danger'
                                    );
                                }}
                                className="px-4 py-2 rounded-lg text-xs font-medium text-danger hover:bg-danger/10 transition-colors flex items-center justify-center gap-2"
                            >
                                <Trash2 size={16} /> Excluir
                            </button>
                            <button
                                onClick={() => handleEditSession(viewingSession)}
                                className="px-4 py-2 rounded-lg text-xs font-medium text-text-muted hover:text-white hover:bg-white/5 transition-colors border border-transparent hover:border-white/10 flex items-center justify-center gap-2"
                            >
                                <Pencil size={16} /> Editar
                            </button>
                            <button onClick={() => handleGenerateSessionReport(viewingSession.id)} className="px-4 py-2 rounded-lg text-xs font-medium bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2">
                                <Download size={16} /> Relatório
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {confirmation && confirmation.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className={`glass-card w-full max-w-sm p-6 relative animate-slide-up ${confirmation.type === 'danger' ? 'border-danger/30' : 'border-white/10'}`}>
                        <div className="flex flex-col items-center text-center">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${confirmation.type === 'danger' ? 'bg-danger/20 text-danger' :
                                confirmation.type === 'warning' ? 'bg-yellow-500/20 text-yellow-500' :
                                    'bg-primary/20 text-primary'
                                }`}>
                                <AlertTriangle size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">{confirmation.title}</h3>
                            <div className="text-text-muted mb-6 text-sm">
                                {confirmation.message}
                            </div>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setConfirmation(null)}
                                    className="flex-1 py-2 rounded-lg bg-bg-dark border border-white/10 text-white hover:bg-white/5 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => {
                                        confirmation.onConfirm();
                                        setConfirmation(null);
                                    }}
                                    className={`flex-1 py-2 rounded-lg text-white font-bold shadow-lg transition-colors ${confirmation.type === 'danger' ? 'bg-danger hover:bg-danger-hover shadow-danger/20' :
                                        confirmation.type === 'warning' ? 'bg-yellow-500 hover:bg-yellow-600 shadow-yellow-500/20' :
                                            'bg-primary hover:bg-primary-hover shadow-primary/20'
                                        }`}
                                >
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
