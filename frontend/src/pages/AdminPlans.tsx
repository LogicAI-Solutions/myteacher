import { useEffect, useState } from 'react';
import api from '../api';
import { Edit, X } from 'lucide-react';
import type { Plan } from './Pricing';

export const AdminPlans = () => {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

    useEffect(() => {
        loadPlans();
    }, []);

    const loadPlans = async () => {
        setLoading(true);
        try {
            const res = await api.get('/plans/');
            setPlans(res.data);
        } catch (err) {
            console.error('Failed to load plans');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!editingPlan) return;
        setLoading(true);
        try {
            await api.put(`/plans/${editingPlan.id}`, editingPlan);
            setEditingPlan(null);
            loadPlans();
        } catch (err) {
            console.error('Failed to update plan');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="sheet sheet-p mt-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-text-main">Gerenciar Planos</h2>

            {loading && <p>Carregando...</p>}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map(plan => (
                    <div key={plan.id} className="border border-border p-4 rounded-[2px] bg-bg-dark/50">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-lg text-primary">{plan.name}</h3>
                            <button onClick={() => setEditingPlan(plan)} className="text-text-muted hover:text-text-main">
                                <Edit size={16} />
                            </button>
                        </div>
                        <p className="text-sm text-text-muted mb-2">{plan.description}</p>
                        <p className="font-bold text-xl">{plan.price} <span className="text-sm text-text-muted">{plan.period}</span></p>
                        <ul className="mt-4 text-sm text-text-muted space-y-1">
                            {plan.features?.map((f, i) => (
                                <li key={i} className={f.included ? 'text-text-main' : 'text-text-muted/50'}>
                                    {f.included ? '' : '×'} {f.text}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            {editingPlan && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--wash-2)] animate-fade-in">
                    <div className="sheet sheet-p w-full max-w-lg relative">
                        <button onClick={() => setEditingPlan(null)} className="absolute top-4 right-4 text-text-muted hover:text-text-main">
                            <X size={20} />
                        </button>
                        <h2 className="text-xl font-bold mb-4">Editar Plano</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-text-muted">Nome</label>
                                <input
                                    className="w-full p-2 bg-bg-dark border border-border rounded"
                                    value={editingPlan.name}
                                    onChange={e => setEditingPlan({...editingPlan, name: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-text-muted">Preço (ex: R$ 49)</label>
                                <input
                                    className="w-full p-2 bg-bg-dark border border-border rounded"
                                    value={editingPlan.price}
                                    onChange={e => setEditingPlan({...editingPlan, price: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-text-muted">Descrição</label>
                                <input
                                    className="w-full p-2 bg-bg-dark border border-border rounded"
                                    value={editingPlan.description}
                                    onChange={e => setEditingPlan({...editingPlan, description: e.target.value})}
                                />
                            </div>
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="w-full bg-primary hover:bg-primary-hover text-[var(--on-institution)] py-2 rounded mt-4"
                            >
                                {loading ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
