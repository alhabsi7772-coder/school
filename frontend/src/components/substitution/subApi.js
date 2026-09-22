import axios from 'axios';

export const SUB_API = `${process.env.REACT_APP_BACKEND_URL}/api/substitution`;

export const subApi = axios.create({ baseURL: SUB_API });

subApi.interceptors.request.use((cfg) => {
  const t = localStorage.getItem('subToken');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

subApi.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('subToken');
      localStorage.removeItem('subName');
      if (!window.location.pathname.startsWith('/substitution/login')) window.location.href = '/substitution/login';
    }
    return Promise.reject(err);
  }
);

export const errMsg = (e, fallback = 'حدث خطأ غير متوقع') => {
  const d = e?.response?.data?.detail;
  if (!d) return fallback;
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) return d.map((x) => x?.msg || JSON.stringify(x)).join(' ');
  return d?.msg || fallback;
};

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const shiftDate = (iso, days) => {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const dayNameAr = (iso) => ['الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'][new Date(iso + 'T00:00:00').getDay() === 0 ? 6 : new Date(iso + 'T00:00:00').getDay() - 1];

export const fmtAr = (iso) => {
  const [y, m, d] = iso.split('-');
  return `${Number(d)}/${Number(m)}/${y}`;
};

export const academicRange = (iso) => {
  const [y, m] = iso.split('-').map(Number);
  const start = m >= 9 ? y : y - 1;
  return [`${start}-09-01`, `${start + 1}-08-31`];
};

export const SCHOOL_NAME = 'مدرسة الخيرات للبنين ٥-٨';
