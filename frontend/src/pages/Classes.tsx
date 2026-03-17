import React, { useEffect, useState } from 'react';
import api from '../api';
import { Plus, Calendar, Pencil, Trash, X, AlertTriangle, GripVertical, ArrowUpDown, BookOpen, Users, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Loading } from '../components/Loading';
import { Toast, type ToastType } from '../components/Toast';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ClassModel {
    id: number;
    name: string;
    schedule: string;
    display_order?: number;
    student_count?: number;
    session_count?: number;
}

interface SortableClassCardProps {
    cls: ClassModel;
    index: number;
    isReorderMode: boolean;
    openEditModal: (e: React.MouseEvent, cls: ClassModel) => void;
    openDeleteModal: (e: React.MouseEvent, cls: ClassModel) => void;
}

// Palette of accent colors for cards
const cardAccents = [
    { bg: 'bg-primary/15', border: 'border-primary/20', text: 'text-primary', glow: 'shadow-primary/10' },
    { bg: 'bg-indigo-500/15', border: 'border-indigo-500/20', text: 'text-indigo-600', glow: 'shadow-indigo-500/10' },
    { bg: 'bg-violet-500/15', border: 'border-violet-500/20', text: 'text-violet-600', glow: 'shadow-violet-500/10' },
    { bg: 'bg-cyan-500/15', border: 'border-cyan-500/20', text: 'text-cyan-600', glow: 'shadow-cyan-500/10' },
    { bg: 'bg-emerald-500/15', border: 'border-emerald-500/20', text: 'text-emerald-600', glow: 'shadow-emerald-500/10' },
    { bg: 'bg-amber-500/15', border: 'border-amber-500/20', text: 'text-amber-600', glow: 'shadow-amber-500/10' },
];

const SortableClassCard = ({ cls, index, isReorderMode, openEditModal, openDeleteModal }: SortableClassCardProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: cls.id });

    const accent = cardAccents[index % cardAccents.length];

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        animationDelay: `${index * 80}ms`,
        zIndex: isDragging ? 50 : 'auto',
        opacity: isDragging ? 0.85 : 1,
    };

    const cardContent = (
        <>
            {/* Top gradient accent line */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="p-6">
                {/* Header: Icon + Actions */}
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-start gap-3">
                        {isReorderMode && (
                            <div
                                {...attributes}
                                {...listeners}
                                style={{ touchAction: 'none' }}
                                className="cursor-grab active:cursor-grabbing p-1 -ml-1 mt-1 text-text-muted hover:text-primary transition-colors"
                            >
                                <GripVertical size={20} />
                            </div>
                        )}
                        <div className={`p-2.5 rounded-xl ${accent.bg} ${accent.border} border shadow-lg ${accent.glow}`}>
                            <BookOpen size={22} className={accent.text} />
                        </div>
                    </div>
                    {!isReorderMode && (
                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
                            <button onClick={(e) => openEditModal(e, cls)} className="bg-black/5 backdrop-blur-sm p-2 rounded-lg hover:bg-primary/20 text-text-muted hover:text-primary transition-all duration-200 border border-black/5 hover:border-primary/30">
                                <Pencil size={15} />
                            </button>
                            <button onClick={(e) => openDeleteModal(e, cls)} className="bg-black/5 backdrop-blur-sm p-2 rounded-lg hover:bg-danger/20 text-text-muted hover:text-danger transition-all duration-200 border border-black/5 hover:border-danger/30">
                                <Trash size={15} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-text-main group-hover:text-primary transition-colors duration-300 mb-1 leading-tight">
                    {cls.name}
                </h3>

                {/* Schedule */}
                <p className="text-text-muted text-sm flex items-center gap-1.5 mb-4">
                    <Clock size={13} className="text-text-muted/60" /> {cls.schedule}
                </p>

                {/* Bottom stats bar */}
                <div className="flex items-center gap-4 pt-3 border-t border-black/5">
                    <div className="flex items-center gap-1.5 text-xs text-text-muted">
                        <Users size={13} className={accent.text} />
                        <span>{cls.student_count ?? '—'} alunos</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-text-muted">
                        <Calendar size={13} className={accent.text} />
                        <span>{cls.session_count ?? '—'} aulas</span>
                    </div>
                </div>
            </div>
        </>
    );

    if (isReorderMode) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className={`glass-card group transition-all duration-300 relative overflow-hidden ${isDragging ? 'ring-2 ring-primary shadow-xl shadow-primary/20 scale-[1.02]' : 'hover:translate-y-[-4px]'}`}
            >
                {cardContent}
            </div>
        );
    }

    return (
        <Link
            ref={setNodeRef}
            style={style}
            to={`/dashboard/class/${cls.id}`}
            className={`glass-card group hover:translate-y-[-4px] hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 block no-underline text-inherit relative overflow-hidden animate-slide-up ${isReorderMode ? 'animate-jiggle cursor-grab active:cursor-grabbing pointer-events-none' : ''}`}
        >
            {cardContent}
        </Link>
    );
};

export const Classes = () => {
    const [classes, setClasses] = useState<ClassModel[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [newClass, setNewClass] = useState({ name: '', schedule: '' });
    const [isLoading, setIsLoading] = useState(true);
    const [isReorderMode, setIsReorderMode] = useState(false);
    const [originalClasses, setOriginalClasses] = useState<ClassModel[]>([]);

    // Edit/Delete State
    const [editingClass, setEditingClass] = useState<ClassModel | null>(null);
    const [editClassName, setEditClassName] = useState('');
    const [editClassSchedule, setEditClassSchedule] = useState('');
    const [deletingClass, setDeletingClass] = useState<ClassModel | null>(null);
    const [toast, setToast] = useState<{ message: string, type: ToastType } | null>(null);

    const showToast = (message: string, type: ToastType) => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // DnD sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const fetchClasses = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/classes/');
            // Fetch student and session counts per class
            const classesWithCounts = await Promise.all(
                res.data.map(async (cls: ClassModel) => {
                    try {
                        const [studentsRes, sessionsRes] = await Promise.all([
                            api.get(`/classes/${cls.id}/students`),
                            api.get(`/classes/${cls.id}/attendance`)
                        ]);
                        return {
                            ...cls,
                            student_count: studentsRes.data?.length ?? 0,
                            session_count: sessionsRes.data?.length ?? 0
                        };
                    } catch {
                        return { ...cls, student_count: 0, session_count: 0 };
                    }
                })
            );
            setClasses(classesWithCounts);
        } catch (error: unknown) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchClasses();
    }, []);

    const handleCreateClass = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/classes/', newClass);
            setShowModal(false);
            setNewClass({ name: '', schedule: '' });
            fetchClasses();
        } catch (error: unknown) {
            alert('Error creating class');
            showToast('Erro ao criar turma', 'error');
        }
    };

    const handleUpdateClass = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingClass) return;
        try {
            await api.put(`/classes/${editingClass.id}`, { name: editClassName, schedule: editClassSchedule });
            setEditingClass(null);
            fetchClasses();
        } catch (error: unknown) {
            showToast('Erro ao atualizar turma', 'error');
        }
    };

    const handleDeleteClass = async () => {
        if (!deletingClass) return;
        try {
            await api.delete(`/classes/${deletingClass.id}`);
            setDeletingClass(null);
            fetchClasses();
        } catch (error: unknown) {
            showToast('Erro ao excluir turma', 'error');
        }
    };

    const openEditModal = (e: React.MouseEvent, cls: ClassModel) => {
        e.preventDefault(); // Prevent Link navigation
        setEditingClass(cls);
        setEditClassName(cls.name);
        setEditClassSchedule(cls.schedule);
    };

    const openDeleteModal = (e: React.MouseEvent, cls: ClassModel) => {
        e.preventDefault(); // Prevent Link navigation
        setDeletingClass(cls);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = classes.findIndex((cls: ClassModel) => cls.id === active.id);
            const newIndex = classes.findIndex((cls: ClassModel) => cls.id === over.id);

            const newOrder = arrayMove(classes, oldIndex, newIndex);
            setClasses(newOrder);
        }
    };

    const handleSaveOrder = async () => {
        try {
            const orderData = classes.map((cls: ClassModel, index: number) => ({
                id: cls.id,
                display_order: index
            }));
            await api.put('/classes/reorder', orderData);
            setOriginalClasses(classes);
            setIsReorderMode(false);
        } catch (error: unknown) {
            console.error('Error saving order:', error);
            showToast('Erro ao salvar a nova ordem', 'error');
        }
    };

    const handleCancelReorder = () => {
        setClasses(originalClasses);
        setIsReorderMode(false);
    };

    const handleSortAlphabetically = () => {
        const sorted = [...classes].sort((a, b) => a.name.localeCompare(b.name));
        setClasses(sorted);
    };

    const startReorderMode = () => {
        setOriginalClasses([...classes]);
        setIsReorderMode(true);
    };

    return (
        <div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            {/* Header */}
            <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-text-main">
                        Minhas Turmas
                    </h2>
                    {!isLoading && classes.length > 0 && (
                        <p className="text-text-muted text-sm mt-1">
                            {classes.length} {classes.length === 1 ? 'turma cadastrada' : 'turmas cadastradas'}
                        </p>
                    )}
                </div>
                {classes.length > 1 && (
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        {!isReorderMode ? (
                            <button
                                onClick={startReorderMode}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 bg-black/5 text-text-muted hover:bg-black/10 hover:text-text-main border border-black/5 w-full sm:w-auto justify-center"
                            >
                                <ArrowUpDown size={18} />
                                Reorganizar
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={handleSortAlphabetically}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 bg-black/5 text-text-muted hover:bg-black/10 hover:text-text-main border border-black/10 flex-1 sm:flex-none justify-center"
                                >
                                    <ArrowUpDown size={18} />
                                    Ordenar (A-Z)
                                </button>
                                <button
                                    onClick={handleCancelReorder}
                                    className="px-4 py-2 rounded-xl font-medium transition-all duration-300 bg-black/5 text-text-muted hover:bg-black/10 hover:text-danger border border-black/10 flex-1 sm:flex-none justify-center"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveOrder}
                                    className="px-4 py-2 rounded-xl font-medium transition-all duration-300 bg-primary text-white shadow-lg shadow-primary/30 w-full sm:w-auto justify-center"
                                >
                                    Salvar Ordem
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {isLoading ? (
                <div className="h-[50vh] flex items-center justify-center">
                    <Loading text="Carregando turmas..." />
                </div>
            ) : (
                <div className="animate-fade-in space-y-8">
                    {isReorderMode && (
                        <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 text-center">
                            <p className="text-primary text-sm">
                                <GripVertical size={16} className="inline-block mr-2 -mt-0.5" />
                                Arraste os cards para reorganizar suas turmas
                            </p>
                        </div>
                    )}
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext items={classes.map(c => c.id)} strategy={rectSortingStrategy}>
                            <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                                {classes.map((cls, index) => (
                                    <SortableClassCard
                                        key={cls.id}
                                        cls={cls}
                                        index={index}
                                        isReorderMode={isReorderMode}
                                        openEditModal={openEditModal}
                                        openDeleteModal={openDeleteModal}
                                    />
                                ))}

                                {/* Add Class Card Button - only show when not in reorder mode */}
                                {!isReorderMode && (
                                    <button
                                        onClick={() => setShowModal(true)}
                                        className="glass-card flex flex-col items-center justify-center gap-4 group hover:bg-black/5 transition-all duration-300 border-dashed border-2 border-black/10 hover:border-primary/40 cursor-pointer min-h-[200px] animate-slide-up"
                                        style={{ animationDelay: `${classes.length * 80}ms` }}
                                    >
                                        <div className="bg-primary/10 p-4 rounded-2xl group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300 border border-primary/20 shadow-lg shadow-primary/5">
                                            <Plus size={28} className="text-primary" />
                                        </div>
                                        <span className="font-medium text-text-muted group-hover:text-text-main transition-colors text-sm">Criar Nova Turma</span>
                                    </button>
                                )}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>
            )}

            {classes.length === 0 && !isLoading && (
                <div className="text-center mt-12 animate-fade-in">
                    <p className="text-text-muted text-lg">Comece criando sua primeira turma acima.</p>
                </div>
            )}

            {/* Create Class Modal */}
            {showModal && (
                <div className="modal-overlay animate-fade-in">
                    <div className="glass-modal w-full max-w-md p-8 animate-slide-up relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/0 via-primary to-primary/0"></div>
                        <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-text-muted hover:text-text-main p-2 rounded-xl hover:bg-black/5 transition-all">
                            <X size={20} />
                        </button>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2.5 rounded-xl bg-primary/15 border border-primary/20">
                                <Plus size={20} className="text-primary" />
                            </div>
                            <h3 className="text-2xl font-bold text-text-main">Nova Turma</h3>
                        </div>
                        <form onSubmit={handleCreateClass} className="flex flex-col gap-5">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-text-muted uppercase tracking-wider ml-1">Nome da Turma</label>
                                <input className="glass-input" value={newClass.name} onChange={e => setNewClass({ ...newClass, name: e.target.value })} required placeholder="Ex: Matemática Avançada" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-text-muted uppercase tracking-wider ml-1">Horário</label>
                                <input className="glass-input" value={newClass.schedule} onChange={e => setNewClass({ ...newClass, schedule: e.target.value })} required placeholder="Ex: Segundas e Quartas, 19h" />
                            </div>
                            <div className="flex justify-end gap-3 mt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-text-muted hover:text-text-main hover:bg-black/5 rounded-xl transition-all font-medium">Cancelar</button>
                                <button type="submit" className="btn-primary-gradient px-6 py-2.5 text-white rounded-xl font-medium shadow-lg shadow-primary/20">Criar Turma</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Class Modal */}
            {editingClass && (
                <div className="modal-overlay animate-fade-in">
                    <div className="glass-modal w-full max-w-md p-8 animate-slide-up relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/0 via-primary to-primary/0"></div>
                        <button onClick={() => setEditingClass(null)} className="absolute top-4 right-4 text-text-muted hover:text-text-main p-2 rounded-xl hover:bg-black/5 transition-all">
                            <X size={20} />
                        </button>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2.5 rounded-xl bg-primary/15 border border-primary/20">
                                <Pencil size={20} className="text-primary" />
                            </div>
                            <h3 className="text-2xl font-bold text-text-main">Editar Turma</h3>
                        </div>
                        <form onSubmit={handleUpdateClass} className="flex flex-col gap-5">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-text-muted uppercase tracking-wider ml-1">Nome da Turma</label>
                                <input className="glass-input" value={editClassName} onChange={e => setEditClassName(e.target.value)} required />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-text-muted uppercase tracking-wider ml-1">Horário</label>
                                <input className="glass-input" value={editClassSchedule} onChange={e => setEditClassSchedule(e.target.value)} required />
                            </div>
                            <div className="flex justify-end gap-3 mt-2">
                                <button type="button" onClick={() => setEditingClass(null)} className="px-5 py-2.5 text-text-muted hover:text-text-main hover:bg-black/5 rounded-xl transition-all font-medium">Cancelar</button>
                                <button type="submit" className="btn-primary-gradient px-6 py-2.5 text-white rounded-xl font-medium shadow-lg shadow-primary/20">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Class Modal */}
            {deletingClass && (
                <div className="modal-overlay animate-fade-in">
                    <div className="glass-modal w-full max-w-sm p-6 relative animate-slide-up overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-danger/0 via-danger to-danger/0"></div>
                        <div className="flex flex-col items-center text-center pt-2">
                            <div className="w-14 h-14 rounded-2xl bg-danger/20 flex items-center justify-center mb-4 text-danger border border-danger/30 shadow-lg shadow-danger/10">
                                <AlertTriangle size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-text-main mb-2">Excluir Turma?</h3>
                            <p className="text-text-muted mb-6">
                                Tem certeza que deseja excluir <strong className="text-text-main">{deletingClass.name}</strong>? Esta ação removerá todos os alunos e chamadas associados.
                            </p>
                            <div className="flex gap-3 w-full">
                                <button onClick={() => setDeletingClass(null)} className="flex-1 py-2.5 text-text-muted hover:bg-black/5 hover:text-text-main transition-all rounded-xl font-medium border border-transparent hover:border-black/10">Cancelar</button>
                                <button onClick={handleDeleteClass} className="flex-1 py-2.5 bg-danger/90 hover:bg-danger text-white rounded-xl shadow-lg shadow-danger/30 transition-all font-medium">Excluir</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
