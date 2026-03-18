import React, { useState, useEffect, useRef } from 'react';
import { UserCircle, Key, Palette, Camera, Check, AlertCircle, Save, X } from 'lucide-react';
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api';

export const Profile = () => {
    const { user, updateUser } = useAuth();
    const { theme, setTheme } = useTheme();

    // Profile Info State
    const [fullName, setFullName] = useState(user?.full_name || '');
    const [avatar, setAvatar] = useState(user?.avatar || '');
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });

    // Image Cropping State
    const [imgSrc, setImgSrc] = useState('');
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const [aspect] = useState<number | undefined>(1);
    const [showCropModal, setShowCropModal] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

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
            reader.addEventListener('load', () => {
                setImgSrc(reader.result?.toString() || '');
                setShowCropModal(true);
            });
            reader.readAsDataURL(file);
        }
    };

    function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
        if (aspect) {
            const { width, height } = e.currentTarget;
            setCrop(centerCrop(
                makeAspectCrop(
                    {
                        unit: '%',
                        width: 90,
                    },
                    aspect,
                    width,
                    height,
                ),
                width,
                height,
            ));
        }
    }

    const getCroppedImg = () => {
        if (!completedCrop || !imgRef.current) return;

        const canvas = document.createElement('canvas');
        const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
        const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
        canvas.width = completedCrop.width;
        canvas.height = completedCrop.height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
            ctx.drawImage(
                imgRef.current,
                completedCrop.x * scaleX,
                completedCrop.y * scaleY,
                completedCrop.width * scaleX,
                completedCrop.height * scaleY,
                0,
                0,
                completedCrop.width,
                completedCrop.height,
            );
        }

        const base64Image = canvas.toDataURL('image/jpeg', 0.8);
        setAvatar(base64Image);
        setShowCropModal(false);
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
            updateUser({ full_name: fullName, avatar: avatar });
            setProfileMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
        } catch (error) {
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
        } catch (error) {
            setPasswordMessage({ type: 'error', text: 'Erro ao atualizar senha.' });
        } finally {
            setPasswordLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* Cropping Modal */}
            {showCropModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="glass-card w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-spring-up">
                        <div className="p-4 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-text-main">Recortar Foto</h3>
                            <button onClick={() => setShowCropModal(false)} className="p-2 text-text-muted hover:text-text-main rounded-xl hover:bg-white/5 transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-black/20">
                            {!!imgSrc && (
                                <ReactCrop
                                    crop={crop}
                                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                                    onComplete={(c) => setCompletedCrop(c)}
                                    aspect={aspect}
                                    circularCrop
                                >
                                    <img
                                        ref={imgRef}
                                        alt="Crop me"
                                        src={imgSrc}
                                        onLoad={onImageLoad}
                                        className="max-w-full max-h-[60vh] object-contain"
                                    />
                                </ReactCrop>
                            )}
                        </div>

                        <div className="p-6 border-t border-white/5 flex gap-4">
                            <button
                                onClick={() => setShowCropModal(false)}
                                className="flex-1 px-6 py-3 rounded-xl border border-white/10 text-text-muted font-bold hover:bg-white/5 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={getCroppedImg}
                                className="flex-1 glass-button px-6 py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2"
                            >
                                <Check size={18} /> Confirmar Recorte
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
