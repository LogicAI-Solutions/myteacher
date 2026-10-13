import { isAxiosError } from 'axios';

/** Status HTTP de um erro de chamada à API (undefined se não houve resposta). */
export const apiStatus = (err: unknown): number | undefined =>
    isAxiosError(err) ? err.response?.status : undefined;

/** Mensagem `detail` do backend quando for texto; senão o fallback. */
export const apiDetail = (err: unknown, fallback: string): string => {
    const detail = isAxiosError(err) ? err.response?.data?.detail : undefined;
    return typeof detail === 'string' ? detail : fallback;
};
