import type { Permission } from '../context/AuthContext';

export const PERM_LABELS: Record<Permission, { label: string; hint: string }> = {
    'attendance.edit': { label: 'Chamada', hint: 'Lançar, editar e excluir chamadas' },
    'students.manage': { label: 'Alunos', hint: 'Cadastrar, editar, excluir e matricular alunos' },
    'classes.manage': { label: 'Turmas', hint: 'Criar e editar turmas e definir o professor responsável' },
    'finance': { label: 'Financeiro', hint: 'Mensalidades, pagamentos e relatório financeiro' },
    'reports.view': { label: 'Relatórios', hint: 'Gerar relatórios de alunos e de aulas' },
};

export const PERM_ORDER = Object.keys(PERM_LABELS) as Permission[];

// Fixas no backend (core/access.py): professor nunca tem financeiro.
export const TEACHER_PERMS: Permission[] = ['attendance.edit', 'reports.view'];
export const SECRETARY_DEFAULT: Permission[] = ['students.manage', 'classes.manage', 'reports.view'];

export const ROLE_LABELS: Record<string, string> = { owner: 'Direção', teacher: 'Professor', secretary: 'Secretaria' };
