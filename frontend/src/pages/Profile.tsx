import React, { useState, useEffect } from 'react';
import { UserCircle, Key, Palette, Camera, Check, AlertCircle, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api';

export const Profile = () => {
    const { user } = useAuth();
    const { theme, setTheme } = useTheme();

    // Profile Info State
    const [fullName, setFullName] = useState(user?.full_name || '');
    const [avatar, setAvatar] = useState(user?.avatar || '');
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });

    // Password State
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (user) {
            setFullName(user.full_name || '');
            setAvatar(user.avatar || '');
        }
    }, [user]);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatar(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileLoading(true);
        setProfileMessage({ type: '', text: '' });

        try {
            await api.put('/users/me', {
                full_name: fullName,
                avatar: avatar
            });
            setProfileMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
        } catch (err: any) {
            setProfileMessage({ type: 'error', text: 'Erro ao atualizar perfil.' });
        } finally {
            setProfileLoading(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'As senhas não coincidem.' });
            return;
        }
        setPasswordLoading(true);
        setPasswordMessage({ type: '', text: '' });

        try {
            await api.put('/users/me/password', { password: newPassword });
            setPasswordMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            setPasswordMessage({ type: 'error', text: 'Erro ao atualizar senha.' });
        } finally {
            setPasswordLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            <header className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold text-text-main flex items-center gap-3">
                    <UserCircle size={32} className="text-primary" /> Perfil e Configurações
                </h1>
                <p className="text-text-muted">Gerencie suas informações pessoais, segurança e aparência do sistema.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Profile Information */}
                <section className="glass-card p-8 space-y-6">
                    <h2 className="text-xl font-bold text-text-main flex items-center gap-2 border-b border-white/5 pb-4">
                        <UserCircle size={22} className="text-primary" /> Informações Pessoais
                    </h2>

                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                        <div className="flex flex-col items-center gap-4 py-4">
                            <div className="relative group">
                                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/20 bg-white/5 flex items-center justify-center">
                                    {avatar ? (
                                        <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <UserCircle size={64} className="text-text-muted" />
                                    )}
                                </div>
                                <label className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full cursor-pointer shadow-lg hover:scale-110 transition-transform">
                                    <Camera size={18} />
                                    <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                                </label>
                            </div>
                            <p className="text-xs text-text-muted">Clique no ícone para alterar sua foto</p>
                        </div>

                        {profileMessage.text && (
                            <div className={`p-4 rounded-xl border flex items-center gap-3 animate-slide-up ${profileMessage.type === 'success' ? 'bg-success/10 border-success/20 text-success' : 'bg-danger/10 border-danger/20 text-danger'}`}>
                                {profileMessage.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
                                <span className="text-sm font-medium">{profileMessage.text}</span>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-text-muted uppercase tracking-wider ml-1">Email (não alterável)</label>
                                <input
                                    type="email"
                                    className="glass-input mt-2 opacity-60 cursor-not-allowed"
                                    value={user?.email || ''}
                                    disabled
                                />
                            </div>

                            <div>
                                <label className="text-xs font-medium text-text-muted uppercase tracking-wider ml-1">Nome Completo</label>
                                <input
                                    type="text"
                                    className="glass-input mt-2"
                                    value={fullName}
                                    onChange={e => setFullName(e.target.value)}
                                    placeholder="Seu nome completo"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={profileLoading}
                            className="glass-button w-full text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all"
                        >
                            {profileLoading ? (
                                <>Salvando...</>
                            ) : (
                                <>
                                    <Save size={18} /> Salvar Alterações
                                </>
                            )}
                        </button>
                    </form>
                </section>

                {/* Password Change */}
                <section className="glass-card p-8 space-y-6">
                    <h2 className="text-xl font-bold text-text-main flex items-center gap-2 border-b border-white/5 pb-4">
                        <Key size={22} className="text-primary" /> Segurança
                    </h2>

                    <form onSubmit={handleUpdatePassword} className="space-y-6">
                        {passwordMessage.text && (
                            <div className={`p-4 rounded-xl border flex items-center gap-3 animate-slide-up ${passwordMessage.type === 'success' ? 'bg-success/10 border-success/20 text-success' : 'bg-danger/10 border-danger/20 text-danger'}`}>
                                {passwordMessage.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
                                <span className="text-sm font-medium">{passwordMessage.text}</span>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-text-muted uppercase tracking-wider ml-1">Nova Senha</label>
                                <input
                                    type="password"
                                    className="glass-input mt-2"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    required
                                    placeholder="********"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-text-muted uppercase tracking-wider ml-1">Confirmar Nova Senha</label>
                                <input
                                    type="password"
                                    className="glass-input mt-2"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    required
                                    placeholder="********"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={passwordLoading}
                            className="glass-button w-full text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all"
                        >
                            {passwordLoading ? 'Alterando...' : 'Alterar Minha Senha'}
                        </button>
                    </form>

                    <div className="pt-6">
                        <h2 className="text-xl font-bold text-text-main flex items-center gap-2 border-b border-white/5 pb-4 mb-6">
                            <Palette size={22} className="text-primary" /> Aparência
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <button
                                onClick={() => setTheme('sereno')}
                                className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-3 ${theme === 'sereno' ? 'bg-primary/20 border-primary text-primary shadow-lg ring-1 ring-primary/50' : 'bg-white/5 border-white/5 text-text-muted hover:bg-white/10'}`}
                            >
                                <div className="w-8 h-8 rounded-full bg-[#2d5a6e] shadow-inner"></div>
                                <span className="text-xs font-bold uppercase tracking-widest">Azul Sereno</span>
                            </button>
                            <button
                                onClick={() => setTheme('acolhedor')}
                                className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-3 ${theme === 'acolhedor' ? 'bg-primary/20 border-primary text-primary shadow-lg ring-1 ring-primary/50' : 'bg-white/5 border-white/5 text-text-muted hover:bg-white/10'}`}
                            >
                                <div className="w-8 h-8 rounded-full bg-[#7d8c7b] shadow-inner"></div>
                                <span className="text-xs font-bold uppercase tracking-widest">Acolhedor</span>
                            </button>
                            <button
                                onClick={() => setTheme('dark')}
                                className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-3 ${theme === 'dark' ? 'bg-primary/20 border-primary text-primary shadow-lg ring-1 ring-primary/50' : 'bg-white/5 border-white/5 text-text-muted hover:bg-white/10'}`}
                            >
                                <div className="w-8 h-8 rounded-full bg-[#0f172a] border border-white/10 shadow-inner"></div>
                                <span className="text-xs font-bold uppercase tracking-widest">Dark Profissional</span>
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};
