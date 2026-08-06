import React, { useState, useEffect, useRef } from 'react';
import { UserCircle, Key, Palette, Camera, Check, AlertCircle, Save, X, CreditCard } from 'lucide-react';
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { useAuth } from '../context/AuthContext';
import { useTheme, THEMES } from '../context/ThemeContext';
import api from '../api';
import type { Plan } from './Pricing';

// Sentinela do backend: planos ilimitados são semeados com 9999 em core/init_db.py.
const UNLIMITED_CLASSES = 9999;

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

    // Plano / assinatura
    const [plans, setPlans] = useState<Plan[]>([]);
    const [checkoutFor, setCheckoutFor] = useState<number | null>(null);
    const [planMessage, setPlanMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        // Só planos com preço no Stripe podem ser assinados.
        api.get('/plans/')
            .then(res => setPlans(res.data.filter((p: Plan) => p.stripe_price_id)))
            .catch(() => setPlanMessage({ type: 'error', text: 'Não foi possível carregar os planos.' }));
    }, []);

    const currentPlan = user?.is_trial ? undefined : plans.find(p => String(p.id) === user?.plan_id);

    const handleSubscribe = async (planId: number) => {
        setCheckoutFor(planId);
        setPlanMessage({ type: '', text: '' });
        try {
            const { data } = await api.post('/billing/checkout', null, { params: { plan_id: planId } });
            window.location.href = data.url;
        } catch (error: any) {
            setPlanMessage({
                type: 'error',
                text: error?.response?.status === 503
                    ? 'O pagamento ainda não está disponível. Fale com o suporte.'
                    : error?.response?.data?.detail || 'Não foi possível abrir o pagamento. Tente de novo.',
            });
            setCheckoutFor(null);
        }
    };

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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[var(--wash-2)]">
                    <div className="sheet sheet-p w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-spring-up">
                        <div className="p-4 border-b border-border flex items-center justify-between">
                            <h3 className="text-xl font-bold text-text-main">Recortar Foto</h3>
                            <button onClick={() => setShowCropModal(false)} className="p-2 text-text-muted hover:text-text-main rounded-[2px] hover:bg-[var(--wash-1)] transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-[var(--wash-2)]">
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

                        <div className="p-6 border-t border-border flex gap-4">
                            <button
                                onClick={() => setShowCropModal(false)}
                                className="flex-1 px-6 py-3 rounded-[2px] border border-border text-text-muted font-bold hover:bg-[var(--wash-1)] transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={getCroppedImg}
                                className="flex-1 btn btn-outline px-6 py-3 rounded-[2px] text-text-main font-bold flex items-center justify-center gap-2"
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

            {/* Plano e assinatura */}
            <section className="sheet sheet-p space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                    <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                        <CreditCard size={22} className="text-primary" /> Plano e Assinatura
                    </h2>
                    {user?.is_trial ? (
                        <span className="stamp stamp-late">
                            Teste grátis — {user.trial_days_remaining ?? 0}{' '}
                            {user.trial_days_remaining === 1 ? 'dia restante' : 'dias restantes'}
                        </span>
                    ) : currentPlan ? (
                        <span className="stamp stamp-paid">Plano {currentPlan.name} ativo</span>
                    ) : null}
                </div>

                <p className="text-text-muted text-sm text-center max-w-[60ch] mx-auto">
                    {user?.is_trial
                        ? 'Quando o teste acabar, o acesso fica bloqueado até você escolher um plano. Pode assinar agora que o teste continua até o fim.'
                        : currentPlan
                            ? 'Você pode trocar de plano ou cancelar a qualquer momento pelo portal de pagamento.'
                            : 'Escolha um plano para liberar o sistema.'}
                </p>

                {planMessage.text && (
                    <div className={`p-4 rounded-[2px] border flex items-center gap-3 animate-slide-up ${planMessage.type === 'success' ? 'bg-success/10 border-success/20 text-success' : 'bg-danger/10 border-danger/20 text-danger'}`}>
                        <AlertCircle size={18} />
                        <span className="text-sm font-medium">{planMessage.text}</span>
                    </div>
                )}

                {plans.length === 0 ? (
                    <p className="text-sm text-text-muted">Nenhum plano disponível para assinatura no momento.</p>
                ) : (
                    <div className="flex flex-wrap justify-center gap-4 items-stretch">
                        {plans.map(plan => {
                            const isCurrent = String(plan.id) === user?.plan_id && !user?.is_trial;
                            return (
                                <div
                                    key={plan.id}
                                    className={`flex flex-col gap-3 p-4 rounded-[3px] border w-full max-w-[20rem] ${isCurrent ? 'border-primary bg-[var(--wash-1)]' : 'border-border'}`}
                                >
                                    <div className="flex items-baseline justify-between gap-2">
                                        <span className="font-bold text-text-main">{plan.name}</span>
                                        <span className="font-bold text-text-main whitespace-nowrap">
                                            {plan.price}<span className="text-xs text-text-muted">{plan.period}</span>
                                        </span>
                                    </div>
                                    <p className="text-sm font-semibold text-text-main">
                                        {plan.max_classes >= UNLIMITED_CLASSES ? 'Turmas ilimitadas' : `Até ${plan.max_classes} turmas`}
                                    </p>
                                    {plan.description && (
                                        <p className="text-xs text-text-muted leading-snug">{plan.description}</p>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => handleSubscribe(plan.id)}
                                        disabled={checkoutFor !== null || isCurrent}
                                        aria-busy={checkoutFor === plan.id}
                                        className="btn btn-outline mt-auto w-full justify-center font-bold py-2.5 rounded-[2px] disabled:opacity-60 disabled:pointer-events-none"
                                    >
                                        {isCurrent
                                            ? <><Check size={16} /> Plano atual</>
                                            : checkoutFor === plan.id
                                                ? 'Abrindo pagamento...'
                                                : currentPlan ? 'Trocar para este' : 'Assinar'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Profile Information */}
                <section className="sheet sheet-p space-y-6">
                    <h2 className="text-xl font-bold text-text-main flex items-center gap-2 border-b border-border pb-4">
                        <UserCircle size={22} className="text-primary" /> Informações Pessoais
                    </h2>

                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                        <div className="flex flex-col items-center gap-4 py-4">
                            <div className="relative group">
                                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/20 bg-[var(--wash-1)] flex items-center justify-center">
                                    {avatar ? (
                                        <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <UserCircle size={64} className="text-text-muted" />
                                    )}
                                </div>
                                <label className="absolute bottom-0 right-0 p-2 bg-primary text-[var(--on-institution)] rounded-full cursor-pointer transition-transform">
                                    <Camera size={18} />
                                    <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                                </label>
                            </div>
                            <p className="text-xs text-text-muted">Clique no ícone para alterar sua foto</p>
                        </div>

                        {profileMessage.text && (
                            <div className={`p-4 rounded-[2px] border flex items-center gap-3 animate-slide-up ${profileMessage.type === 'success' ? 'bg-success/10 border-success/20 text-success' : 'bg-danger/10 border-danger/20 text-danger'}`}>
                                {profileMessage.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
                                <span className="text-sm font-medium">{profileMessage.text}</span>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="label">Email (não alterável)</label>
                                <input
                                    type="email"
                                    className="input mt-2 opacity-60 cursor-not-allowed"
                                    value={user?.email || ''}
                                    disabled
                                />
                            </div>

                            <div>
                                <label className="label">Nome Completo</label>
                                <input
                                    type="text"
                                    className="input mt-2"
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
                            className="btn btn-outline w-full text-text-main font-bold py-3 rounded-[2px] flex items-center justify-center gap-2 transition-all"
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
                <section className="sheet sheet-p space-y-6">
                    <h2 className="text-xl font-bold text-text-main flex items-center gap-2 border-b border-border pb-4">
                        <Key size={22} className="text-primary" /> Segurança
                    </h2>

                    <form onSubmit={handleUpdatePassword} className="space-y-6">
                        {passwordMessage.text && (
                            <div className={`p-4 rounded-[2px] border flex items-center gap-3 animate-slide-up ${passwordMessage.type === 'success' ? 'bg-success/10 border-success/20 text-success' : 'bg-danger/10 border-danger/20 text-danger'}`}>
                                {passwordMessage.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
                                <span className="text-sm font-medium">{passwordMessage.text}</span>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="label">Nova Senha</label>
                                <input
                                    type="password"
                                    className="input mt-2"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    required
                                    placeholder="********"
                                />
                            </div>
                            <div>
                                <label className="label">Confirmar Nova Senha</label>
                                <input
                                    type="password"
                                    className="input mt-2"
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
                            className="btn btn-outline w-full text-text-main font-bold py-3 rounded-[2px] flex items-center justify-center gap-2 transition-all"
                        >
                            {passwordLoading ? 'Alterando...' : 'Alterar Minha Senha'}
                        </button>
                    </form>

                    <div className="pt-6">
                        <h2 className="text-xl font-bold text-text-main flex items-center gap-2 border-b border-border pb-4 mb-6">
                            <Palette size={22} className="text-primary" /> Aparência
                        </h2>
                        {/* A amostra é a própria folha: papel, tinta e carimbo do tema,
                            não um círculo de cor solto. */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {THEMES.map(({ id, name, description }) => {
                                const active = theme === id;
                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => setTheme(id)}
                                        aria-pressed={active}
                                        className={`text-left p-3 rounded-[3px] border transition-colors duration-150 ${
                                            active ? 'border-primary bg-[var(--wash-1)]' : 'border-border hover:border-rule-strong'
                                        }`}
                                    >
                                        <span className={`theme-${id} block rounded-[2px] border border-border overflow-hidden`}>
                                            <span className="block h-14 p-2.5" style={{ background: 'var(--desk)' }}>
                                                <span className="block h-full rounded-[2px] border p-1.5" style={{ background: 'var(--sheet)', borderColor: 'var(--rule)' }}>
                                                    <span className="block h-1.5 w-3/5 rounded-[1px]" style={{ background: 'var(--ink)' }} />
                                                    <span className="mt-1.5 flex gap-1">
                                                        <span className="block h-1.5 w-6 rounded-[1px]" style={{ background: 'var(--institution)' }} />
                                                        <span className="block h-1.5 w-4 rounded-[1px]" style={{ background: 'var(--ochre)' }} />
                                                        <span className="block h-1.5 w-3 rounded-[1px]" style={{ background: 'var(--margin-red)' }} />
                                                    </span>
                                                </span>
                                            </span>
                                        </span>
                                        <span className="mt-2.5 flex items-center justify-between gap-2">
                                            <span className={`text-sm font-semibold ${active ? 'text-primary' : 'text-text-main'}`}>{name}</span>
                                            {active && <Check size={15} className="text-primary shrink-0" />}
                                        </span>
                                        <span className="mt-0.5 block text-xs text-text-muted leading-snug">{description}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};
