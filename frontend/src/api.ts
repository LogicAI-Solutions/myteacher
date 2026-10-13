import axios from 'axios';

const rawApiUrl = import.meta.env.VITE_API_URL || '/api';
const api = axios.create({
  baseURL: rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Trial vencido no meio da sessão: qualquer rota protegida devolve 403 TRIAL_EXPIRED
    // e o uso fica bloqueado até escolher um plano.
    // /checkout/success faz poll do /users/me esperando o webhook do Stripe ativar
    // a conta; enquanto isso o backend ainda devolve TRIAL_EXPIRED. Não redirecionar
    // ali, senão quem acabou de pagar volta pro paywall.
    if (
      error.response?.status === 403 &&
      ['TRIAL_EXPIRED', 'SCHOOL_INACTIVE'].includes(error.response?.data?.detail) &&
      !window.location.pathname.startsWith('/trial-expired') &&
      !window.location.pathname.startsWith('/checkout/success')
    ) {
      // Membro de escola: a assinatura é da direção, a tela não oferece checkout
      window.location.href = error.response.data.detail === 'SCHOOL_INACTIVE' ? '/trial-expired?escola=1' : '/trial-expired';
      return Promise.reject(error);
    }
    if (error.response && error.response.status === 401) {
      if (error.config && error.config.url && (error.config.url.includes('/token') || error.config.url.includes('/users/me'))) {
        return Promise.reject(error);
      }
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
