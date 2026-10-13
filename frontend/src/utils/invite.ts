export const PENDING_INVITE_KEY = 'pending_invite';

/** Convite guardado antes do login (senha ou Google): o AuthContext aceita assim que houver token. */
export const setPendingInvite = (token: string) => {
    try { sessionStorage.setItem(PENDING_INVITE_KEY, token); } catch { /* sem storage: aceite manual na página do convite */ }
};

export const clearPendingInvite = () => {
    try { sessionStorage.removeItem(PENDING_INVITE_KEY); } catch { /* ok */ }
};
