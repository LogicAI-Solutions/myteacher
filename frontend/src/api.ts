import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const studentToken = localStorage.getItem('student_token');

  const isPortal = window.location.pathname.startsWith('/portal');

  if (isPortal && studentToken) {
    config.headers.Authorization = `Bearer ${studentToken}`;
  } else if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (studentToken) {
    // Fallback if no admin token
    config.headers.Authorization = `Bearer ${studentToken}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (error.config && error.config.url && (error.config.url.includes('/token') || error.config.url.includes('/users/me'))) {
        return Promise.reject(error);
      }
      if (window.location.pathname.startsWith('/portal')) {
        localStorage.removeItem('student_token');
        window.location.href = '/portal/login';
      } else {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
