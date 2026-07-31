import { useEffect, useState } from 'react';
import api from '../api';
import { Save, Settings } from 'lucide-react';
import { Toast, type ToastType } from '../components/Toast';

interface AppConfig {
    id: number;
    key: string;
    value: string | null;
}

export const AdminSettings = () => {
    const [configs, setConfigs] = useState<AppConfig[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: ToastType } | null>(null);

    const showToast = (message: string, type: ToastType) => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        loadConfigs();
    }, []);

    const loadConfigs = async () => {
        setLoading(true);
        try {
            const res = await api.get('/config/');
            setConfigs(res.data);
        } catch (err) {
            console.error('Failed to load configs', err);
            showToast('Erro ao carregar configurações', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleConfigChange = (key: string, value: string) => {
        setConfigs(prev => prev.map(c => c.key === key ? { ...c, value } : c));
    };

    const handleSave = async (key: string, value: string | null) => {
        setSaving(true);
        try {
            await api.put(`/config/${key}`, { value });
            showToast('Configuração salva com sucesso', 'success');
        } catch (err) {
            console.error('Failed to update config', err);
            showToast('Erro ao salvar configuração', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="glass-card p-6 mt-6 animate-fade-in">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-text-main">
                <Settings size={20} className="text-primary" /> Configurações do Sistema
            </h2>
            
            {loading && <p className="text-text-muted">Carregando...</p>}
            
            <div className="space-y-6 max-w-2xl">
                {configs.map(config => (
                    <div key={config.id} className="bg-bg-dark/50 border border-white/5 p-4 rounded-xl">
                        <label className="block text-sm font-medium text-text-muted uppercase tracking-wider mb-2">
                            {config.key.replace(/_/g, ' ')}
                        </label>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                className="flex-1 p-3 bg-bg-dark border border-white/10 rounded-lg text-text-main focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                                value={config.value || ''}
                                onChange={(e) => handleConfigChange(config.key, e.target.value)}
                                placeholder="Não configurado"
                            />
                            <button
                                onClick={() => handleSave(config.key, config.value)}
                                disabled={saving}
                                className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                            >
                                <Save size={18} /> Salvar
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
