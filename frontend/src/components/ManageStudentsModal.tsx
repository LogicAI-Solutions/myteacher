import React, { useState } from 'react';
import { X, Plus, Users, Search } from 'lucide-react';

interface Student {
    id: number;
    name: string;
    phone?: string;
    parent_name?: string;
    parent_phone?: string;
    parent_email?: string;
    active?: boolean;
}

interface ManageStudentsModalProps {
    isOpen: boolean;
    onClose: () => void;
    students: Student[]; // All students in the system
    enrolledStudentIds: number[];
    onEnroll: (id: number) => void;
    onUnenroll: (id: number) => void;
}

export const ManageStudentsModal: React.FC<ManageStudentsModalProps> = ({ isOpen, onClose, students, enrolledStudentIds, onEnroll, onUnenroll }) => {
    const [searchTerm, setSearchTerm] = useState('');

    if (!isOpen) return null;

    const filteredStudents = students
        .filter((s: Student) => s.active !== false) // Show only active students (default true)
        .filter((s: Student) => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className="modal-overlay">
            <div className="glass-modal w-full max-w-md flex flex-col max-h-[85vh] animate-slide-up relative overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-white/5 z-10">
                    <button onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-text-main transition-colors p-2 rounded-xl hover:bg-white/5">
                        <X size={20} />
                    </button>

                    <h3 className="text-xl mb-1 font-bold text-text-main flex items-center gap-2">
                        <Users size={20} className="text-primary-light" /> Gerenciar Alunos
                    </h3>
                    <p className="text-sm text-text-muted">Adicione ou remova alunos desta turma com tranquilidade.</p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                    <div className="relative sticky top-0 z-20">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted/60" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar aluno..."
                            className="glass-input pl-10"
                            value={searchTerm}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="flex flex-col gap-3 min-h-[200px]">
                        {filteredStudents.map((s: Student) => {
                            const isEnrolled = enrolledStudentIds.includes(s.id);
                            return (
                                <div key={s.id} className={`p-4 rounded-xl border flex justify-between items-center transition-all duration-300 group ${isEnrolled ? 'bg-primary/10 border-primary/30' : 'bg-white/5 border-white/5 hover:border-white/10'}`}>
                                    <div className="flex flex-col gap-0.5">
                                        <span className={`font-semibold text-base ${isEnrolled ? 'text-text-main' : 'text-text-muted group-hover:text-text-main transition-colors'}`}>{s.name}</span>
                                        {isEnrolled && (
                                            <span className="text-[10px] uppercase tracking-widest text-primary font-bold flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Matriculado
                                            </span>
                                        )}
                                    </div>

                                    {isEnrolled ? (
                                        <button
                                            onClick={() => onUnenroll(s.id)}
                                            className="px-3 py-1.5 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 transition-all text-xs font-bold flex items-center gap-1.5 border border-danger/10"
                                            title="Remover da turma"
                                        >
                                            <X size={14} /> <span className="hidden sm:inline">Remover</span>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => onEnroll(s.id)}
                                            className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all text-xs font-bold flex items-center gap-1.5 border border-primary/10"
                                            title="Adicionar à turma"
                                        >
                                            <Plus size={14} /> <span className="hidden sm:inline">Adicionar</span>
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                        {filteredStudents.length === 0 && (
                            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/5 rounded-xl text-center flex-1">
                                <Users size={32} className="text-text-muted mb-3 opacity-30" />
                                <p className="text-text-muted font-medium">{searchTerm ? 'Nenhum aluno encontrado.' : 'Nenhum aluno disponível.'}</p>
                                <p className="text-xs text-text-muted/60 mt-1">Tente buscar por outro nome.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 flex justify-end">
                    <button onClick={onClose} className="px-6 py-2 rounded-xl text-sm text-text-muted hover:bg-white/5 transition-all font-medium">
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};
