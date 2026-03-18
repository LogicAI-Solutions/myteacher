const DEFAULT_SUPPORT_WHATSAPP_NUMBER = '5521974546156';

const getSupportWhatsAppNumber = () => {
    return import.meta.env.VITE_SUPPORT_WHATSAPP_NUMBER || DEFAULT_SUPPORT_WHATSAPP_NUMBER;
};

export const buildSupportWhatsAppUrl = (message?: string) => {
    const number = getSupportWhatsAppNumber();
    if (message) {
        return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
    }
    return `https://wa.me/${number}`;
};

export const openSupportWhatsApp = (message?: string) => {
    const url = buildSupportWhatsAppUrl(message);
    window.open(url, '_blank', 'noopener,noreferrer');
};
