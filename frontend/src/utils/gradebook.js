// Gradebook structure mirroring the official MOE template (grades 5-6)
export const GB_FIELDS = [
  { key: 'd1', label: 'حوار 1', max: 10 },
  { key: 'd2', label: 'حوار 2', max: 10 },
  { key: 'q1', label: 'قصيرة 1', max: 5 },
  { key: 'q2', label: 'قصيرة 2', max: 5 },
  { key: 'q3', label: 'قصيرة 3', max: 5 },
  { key: 'q4', label: 'قصيرة 4', max: 5 },
  { key: 'p1', label: 'عملي 1', max: 20 },
  { key: 'p2', label: 'عملي 2', max: 20 },
  { key: 'proj', label: 'المشروع', max: 20 },
];

// Official MOE template for grades 7-10: dialogue 2×10 + practical 2×20 + short test 20 + project 20 = 100
export const GB_FIELDS_78 = [
  { key: 'd1', label: 'حوار 1', max: 10 },
  { key: 'd2', label: 'حوار 2', max: 10 },
  { key: 'p1', label: 'عملي 1', max: 20 },
  { key: 'p2', label: 'عملي 2', max: 20 },
  { key: 'q1', label: 'الاختبار القصير', max: 20 },
  { key: 'proj', label: 'المشروع', max: 20 },
];

export const gbFields = (tpl) => (tpl === '7-10' ? GB_FIELDS_78 : GB_FIELDS);
export const gbMaxMap = (tpl) => Object.fromEntries(gbFields(tpl).map(f => [f.key, f.max]));

export const GB_MAX = Object.fromEntries(GB_FIELDS.map(f => [f.key, f.max]));

export const GB_GROUPS = [
  { name: 'الحوار', keys: ['d1', 'd2'], totalMax: 20 },
  { name: 'الأسئلة القصيرة', keys: ['q1', 'q2', 'q3', 'q4'], totalMax: 20 },
  { name: 'الأنشطة العملية', keys: ['p1', 'p2'], totalMax: 40 },
];

export const sumKeys = (sc, keys) => {
  let any = false, s = 0;
  keys.forEach(k => { const v = sc?.[k]; if (v != null) { any = true; s += v; } });
  return any ? Math.round(s * 10) / 10 : null;
};

export const totalScore = (sc, tpl = '5-6') => sumKeys(sc, gbFields(tpl).map(f => f.key));

// منتصف الفصل — مطابق لصيغة السجل الرسمي:
// 5-6: (حوار1 + قصيرة1 + قصيرة2 + عملي1) × 100 ÷ 40
// 7-10: (حوار1 + عملي1 + الاختبار القصير) × 100 ÷ 50
export const midterm = (sc, tpl = '5-6') => {
  if (sc?.d1 == null) return null;
  if (tpl === '7-10') {
    const s = (sc.d1 || 0) + (sc.p1 || 0) + (sc.q1 || 0);
    return Math.round((s * 100 / 50) * 10) / 10;
  }
  const s = (sc.d1 || 0) + (sc.q1 || 0) + (sc.q2 || 0) + (sc.p1 || 0);
  return Math.round((s * 100 / 40) * 10) / 10;
};

export const levelLetter = (v) =>
  v == null ? '' : v >= 90 ? 'أ' : v >= 80 ? 'ب' : v >= 65 ? 'ج' : v >= 50 ? 'د' : 'هـ';

export const descNum = (v) =>
  v == null ? '' : v >= 95 ? '1' : v >= 90 ? '2' : v >= 80 ? '3' : v >= 70 ? '4' : v >= 60 ? '5' : v >= 50 ? '6' : '7';

export const LEVEL_COLORS = { 'أ': '#34D399', 'ب': '#38BDF8', 'ج': '#FBBF24', 'د': '#FB923C', 'هـ': '#F87171' };

export const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',')[1]);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});
