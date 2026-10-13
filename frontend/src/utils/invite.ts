export const PENDING_INVITE_KEY = 'pending_invite';

/** Convite guardado antes do login (senha ou Google): o AuthContext aceita assim que houver token. */
export const setPendingInvite = (token: string) => {
    try { sessionStorage.setItem(PENDING_INVITE_KEY, token); } catch { /* sem storage: aceite manual na página do convite */ }
};

export const clearPendingInvite = () => {
    try { sessionStorage.removeItem(PENDING_INVITE_KEY); } catch { /* ok */ }
};

export const PENDING_SCHOOL_KEY = 'pending_school_name';

/** Cadastro com Google pelo plano Escola: o nome da escola espera o login para criar a escola. */
export const setPendingSchool = (name: string) => {
    try { sessionStorage.setItem(PENDING_SCHOOL_KEY, name); } catch { /* sem storage: cria pela página Escola */ }
};
