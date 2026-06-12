export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('teacherToken')}` }
});

export const GRADES = {
  'الخامس': [1, 2, 3, 4, 5, 6, 7],
  'السادس': [1, 2, 3, 4, 5, 6],
  'السابع': [1, 2, 3, 4, 5, 6],
  'الثامن': [1, 2, 3, 4, 5],
};

export const QUESTION_TYPES = {
  mcq: { label: 'اختياري', color: 'bg-blue-900/40 text-cyan-300 border border-cyan-800/40' },
  true_false: { label: 'صح أم خطأ', color: 'bg-purple-900/40 text-purple-300 border border-purple-800/40' },
  short: { label: 'إجابة قصيرة', color: 'bg-teal-900/40 text-teal-300 border border-teal-800/40' },
  long: { label: 'إجابة طويلة', color: 'bg-orange-900/40 text-orange-300 border border-orange-800/40' },
};

export const STATUS_MAP = {
  draft: { label: 'مسودة', color: 'badge-draft' },
  waiting: { label: 'في الانتظار', color: 'badge-waiting' },
  active: { label: 'جارٍ الآن', color: 'badge-active' },
  closed: { label: 'منتهي', color: 'badge-closed' },
};

export const getScoreColor = (pct) => {
  if (pct >= 80) return 'text-emerald-400';
  if (pct >= 60) return 'text-yellow-400';
  if (pct >= 40) return 'text-orange-400';
  return 'text-red-400';
};

export const generateCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();
