import axios from 'axios';

export const GRADES_API = `${process.env.REACT_APP_BACKEND_URL}/api/grades`;
export const SCHOOL_NAME = 'مدرسة الخيرات للبنين ٥-٨';

export const gradesApi = axios.create({ baseURL: GRADES_API });

// إرفاق التوكن تلقائياً
gradesApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('gradesToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// إعادة التوجيه عند انتهاء الجلسة
gradesApi.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && !window.location.pathname.includes('/grades/login') && !window.location.pathname.includes('/grades/parent')) {
      localStorage.removeItem('gradesToken');
      window.location.href = '/grades/login';
    }
    return Promise.reject(err);
  }
);

export const errMsg = (e, fallback = 'حدث خطأ غير متوقع') =>
  e.response?.data?.detail || e.response?.data?.message || fallback;

export const GRADES_LIST = ['الخامس', 'السادس', 'السابع', 'الثامن'];
export const SUBJECTS = [
  'التربية الإسلامية', 'اللغة العربية', 'اللغة الإنجليزية', 'الرياضيات',
  'العلوم', 'الدراسات الاجتماعية', 'التربية الصحية', 'الحاسوب',
  'المهارات الحياتية', 'التربية الفنية', 'التربية الموسيقية', 'التربية البدنية',
];
export const SEMESTERS = [
  { value: '1', label: 'الفصل الدراسي الأول' },
  { value: '2', label: 'الفصل الدراسي الثاني' },
];
export const QUIZ_MAX = 10;
export const LEVEL_COLORS = { 'أ': '#34D399', 'ب': '#38BDF8', 'ج': '#FBBF24', 'د': '#FB923C', 'هـ': '#F87171' };
export const levelLetter = (v) => v == null ? '' : v >= 90 ? 'أ' : v >= 80 ? 'ب' : v >= 65 ? 'ج' : v >= 50 ? 'د' : 'هـ';
