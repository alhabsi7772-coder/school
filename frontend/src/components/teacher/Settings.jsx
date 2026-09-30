import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Lock, User, Save, Eye, EyeOff, Award, Check, Palette, Sun, Moon, GraduationCap, Type, CalendarRange, AlertTriangle } from 'lucide-react';
import TeacherLayout from './TeacherLayout';
import { API, getAuthHeaders } from '../../utils';
import { TEMPLATE_LIST } from '../../utils/generateCertificate';
import { useTheme } from '../../context/ThemeContext';
import { FONT_SIZES } from '../../context/ThemeContext';
import { THEMES } from '../../themes';

const CERT_TEMPLATE_KEY = 'certTemplate';

const GROUP_COLORS = {
  'رسمي':  'bg-blue-900/30 text-blue-300 border-blue-700/40',
  'داكن':  'bg-slate-700/40 text-slate-300 border-slate-600/40',
  'عصري':  'bg-teal-900/30 text-teal-300 border-teal-700/40',
  'دافئ':  'bg-orange-900/30 text-orange-300 border-orange-700/40',
  'خاص':   'bg-purple-900/30 text-purple-300 border-purple-700/40',
};

const CATEGORY_COLORS = {
  'واقعي فاخر ✨':    'bg-teal-900/30 text-teal-200 border-teal-500/40',
  'دوائر إلكترونية': 'bg-cyan-900/30 text-cyan-300 border-cyan-700/40',
  'شبكة عصبية':      'bg-violet-900/30 text-violet-300 border-violet-700/40',
  'شبكة سداسية':     'bg-emerald-900/30 text-emerald-300 border-emerald-700/40',
  'تدفق البيانات':   'bg-blue-900/30 text-blue-300 border-blue-700/40',
  'موجات رقمية':     'bg-pink-900/30 text-pink-300 border-pink-700/40',
};

function ThemeCard({ t, isSelected, onSelect }) {
  return (
    <button
      onClick={onSelect}
      data-testid={`theme-${t.id}`}
      className="relative rounded-xl overflow-hidden transition-all duration-300 focus:outline-none"
      style={{
        border: isSelected
          ? `2px solid ${t.accent}`
          : '2px solid rgba(255,255,255,0.08)',
        boxShadow: isSelected
          ? `0 0 18px ${t.orb1}, 0 4px 12px rgba(0,0,0,0.4)`
          : '0 2px 8px rgba(0,0,0,0.3)',
        transform: isSelected ? 'scale(1.04)' : 'scale(1)',
      }}
      onMouseEnter={e => {
        if (!isSelected) e.currentTarget.style.borderColor = `${t.accent}66`;
      }}
      onMouseLeave={e => {
        if (!isSelected) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
      }}
    >
      {/* Color preview */}
      <div
        style={{
          background: `linear-gradient(135deg, ${t.grad1} 0%, ${t.grad2} 100%)`,
          height: '56px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative accent dot */}
        <div style={{
          position: 'absolute',
          bottom: 7,
          right: 7,
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: t.accent,
          boxShadow: `0 0 8px ${t.accent}`,
        }} />
        {/* Grid lines decoration */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `linear-gradient(${t.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${t.gridColor} 1px, transparent 1px)`,
          backgroundSize: '12px 12px',
        }} />
      </div>
      {/* Name */}
      <div style={{ background: 'rgba(11,17,32,0.95)', padding: '6px 4px', textAlign: 'center' }}>
        <p style={{
          color: isSelected ? t.accent : 'var(--text-muted)',
          fontSize: '11px',
          fontWeight: 700,
          lineHeight: 1.3,
        }}>
          {t.name}
        </p>
      </div>
      {/* Selected checkmark */}
      {isSelected && (
        <div style={{
          position: 'absolute',
          top: 4,
          right: 4,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: t.accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Check style={{ width: 10, height: 10, color: '#000' }} />
        </div>
      )}
    </button>
  );
}

export default function Settings() {
  const [profile, setProfile] = useState({ teacher_name: '', school_name: '' });
  const [pwd, setPwd] = useState({ old: '', new: '', confirm: '' });
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [certTemplate, setCertTemplate] = useState(() => localStorage.getItem(CERT_TEMPLATE_KEY) || 'classic_blue');
  const [studentMode, setStudentMode] = useState('dark');
  const [savingStudentMode, setSavingStudentMode] = useState(false);
  const [years, setYears] = useState([]);
  const [currentYear, setCurrentYear] = useState('');
  const [pendingYear, setPendingYear] = useState(null);
  const [savingYear, setSavingYear] = useState(false);
  const [semester, setSemester] = useState(localStorage.getItem('semester') || '1');
  const [savingSemester, setSavingSemester] = useState(false);

  const { themeId, changeTheme, mode, toggleMode, fontLevel, changeFontLevel } = useTheme();

  useEffect(() => { fetchProfile(); fetchStudentMode(); fetchAcademicYears(); }, []);

  const fmtYear = (y) => (y || '').replace('-', '/');

  const fetchAcademicYears = async () => {
    try {
      const res = await axios.get(`${API}/academic-years`, getAuthHeaders());
      setYears(res.data.years || []);
      setCurrentYear(res.data.current || '');
      setSemester(res.data.semester || '1');
      localStorage.setItem('academicYear', res.data.current || '2025-2026');
      localStorage.setItem('semester', res.data.semester || '1');
    } catch { /* تجاهل أخطاء الجلب */ }
  };

  const saveSemester = async (newSem) => {
    if (newSem === semester) return;
    setSavingSemester(true);
    try {
      await axios.put(`${API}/academic-years/semester`, { semester: newSem }, getAuthHeaders());
      setSemester(newSem);
      localStorage.setItem('semester', newSem);
      window.dispatchEvent(new Event('academic-context-changed'));
      toast.success(`الفصل النشط: ${newSem === '1' ? 'الفصل الأول' : 'الفصل الثاني'} — تُعرض اختبارات ومشاريع هذا الفصل، ودرجات السجلات لا تتغير`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'تعذر تغيير الفصل الدراسي');
    } finally { setSavingSemester(false); }
  };

  const confirmYearSwitch = async () => {
    if (!pendingYear) return;
    setSavingYear(true);
    try {
      await axios.put(`${API}/academic-years/current`, { year: pendingYear }, getAuthHeaders());
      localStorage.setItem('academicYear', pendingYear);
      setCurrentYear(pendingYear);
      setPendingYear(null);
      toast.success(`تم التبديل إلى العام الدراسي ${fmtYear(pendingYear)}`);
      setTimeout(() => window.location.reload(), 900);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'تعذر تغيير العام الدراسي');
    } finally { setSavingYear(false); }
  };

  const fetchStudentMode = async () => {
    try {
      const res = await axios.get(`${API}/app-settings`, getAuthHeaders());
      setStudentMode(res.data.student_mode || 'dark');
    } catch {}
  };

  const saveStudentMode = async (newMode) => {
    setSavingStudentMode(true);
    try {
      await axios.put(`${API}/app-settings`, { student_mode: newMode }, getAuthHeaders());
      setStudentMode(newMode);
      toast.success(newMode === 'dark' ? 'وضع الطلاب: ليلي' : 'وضع الطلاب: نهاري');
    } catch { toast.error('تعذر الحفظ'); }
    finally { setSavingStudentMode(false); }
  };

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API}/auth/profile`, getAuthHeaders());
      setProfile({ teacher_name: res.data.teacher_name || '', school_name: res.data.school_name || '' });
    } catch {}
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.put(`${API}/auth/profile`, profile, getAuthHeaders());
      localStorage.setItem('teacherName', profile.teacher_name);
      toast.success('تم حفظ الملف الشخصي');
    } catch { toast.error('تعذر الحفظ'); }
    finally { setLoading(false); }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwd.new !== pwd.confirm) return toast.error('كلمة المرور الجديدة غير متطابقة');
    if (pwd.new.length < 6) return toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    setLoading(true);
    try {
      await axios.post(`${API}/auth/change-password`, { old_password: pwd.old, new_password: pwd.new }, getAuthHeaders());
      toast.success('تم تغيير كلمة المرور');
      setPwd({ old: '', new: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'تعذر تغيير كلمة المرور');
    } finally { setLoading(false); }
  };

  const selectTemplate = (id) => {
    setCertTemplate(id);
    localStorage.setItem(CERT_TEMPLATE_KEY, id);
    toast.success('تم حفظ قالب الشهادة');
  };

  const handleThemeChange = (id) => {
    changeTheme(id);
    const t = THEMES.find(x => x.id === id);
    toast.success(`تم تطبيق ثيم "${t?.name}"`, { duration: 1800 });
  };

  const certGroups = [...new Set(TEMPLATE_LIST.map(t => t.group))];
  const themeCategories = [...new Set(THEMES.map(t => t.category))];

  return (
    <TeacherLayout title="الإعدادات">
      <div className="max-w-4xl space-y-6">

        {/* ── Academic Year Selector ── */}
        <div className="quiz-card p-6">
          <h2 className="font-bold text-white mb-1 flex items-center gap-2">
            <CalendarRange className="w-5 h-5" style={{ color: 'var(--theme-accent)' }} />
            العام الدراسي
          </h2>
          <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
            اختر العام الدراسي النشط — جميع الاختبارات والمشاريع والسجلات والتقييمات تُحفظ وتُعرض حسب العام المختار (كل عام به فصلان: الأول والثاني)
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {years.map(y => {
              const isSelected = y === currentYear;
              return (
                <button
                  key={y}
                  data-testid={`academic-year-${y}`}
                  disabled={savingYear}
                  onClick={() => { if (!isSelected) setPendingYear(y); }}
                  className="relative flex flex-col items-center justify-center gap-1.5 p-4 rounded-2xl border-2 transition-all disabled:opacity-60"
                  style={isSelected
                    ? { borderColor: 'var(--theme-accent)', background: 'rgba(var(--theme-accent-rgb), 0.1)' }
                    : { borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}
                >
                  <CalendarRange className="w-5 h-5"
                    style={{ color: isSelected ? 'var(--theme-accent)' : 'var(--text-hint)' }} />
                  <span className="font-bold text-sm" dir="ltr"
                    style={{ color: isSelected ? 'var(--theme-accent)' : 'var(--text-muted)' }}>
                    {fmtYear(y)}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--text-hint)' }}>
                    الفصل الأول والثاني
                  </span>
                  {isSelected && (
                    <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: 'var(--theme-accent)' }}>
                      <Check className="w-3 h-3 text-black" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Semester selector */}
          <div className="mt-6 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="font-bold text-sm text-white mb-1">الفصل الدراسي النشط</p>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              الاختبارات والمشاريع تُعرض وتُحفظ حسب الفصل النشط، ويحدد أيضاً الفصل الافتراضي في سجل الدرجات والتقييم السريع — درجات السجلات لا تتغير بتبديل الفصل (السجل يشمل الفصلين معاً)
            </p>
            <div className="flex gap-4">
              {[{ v: '1', label: 'الفصل الأول' }, { v: '2', label: 'الفصل الثاني' }].map(s => {
                const isSel = semester === s.v;
                return (
                  <button key={s.v}
                    data-testid={`semester-${s.v}-btn`}
                    disabled={savingSemester}
                    onClick={() => saveSemester(s.v)}
                    className="flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all disabled:opacity-60"
                    style={isSel
                      ? { borderColor: 'var(--theme-accent)', background: 'rgba(var(--theme-accent-rgb), 0.1)' }
                      : { borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}>
                    <span className="font-bold text-sm"
                      style={{ color: isSel ? 'var(--theme-accent)' : 'var(--text-muted)' }}>
                      {s.label}
                    </span>
                    {isSel && <Check className="w-4 h-4" style={{ color: 'var(--theme-accent)' }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Confirmation panel */}
          {pendingYear && (
            <div className="mt-5 p-4 rounded-2xl border"
              data-testid="year-confirm-panel"
              style={{ background: 'rgba(255,170,0,0.06)', borderColor: 'rgba(255,170,0,0.3)' }}>
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#FFB74D' }} />
                <div className="flex-1">
                  <p className="font-bold text-sm text-white mb-1">
                    التبديل إلى العام الدراسي <span dir="ltr">{fmtYear(pendingYear)}</span>؟
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    ستُعرض اختبارات ومشاريع وسجلات هذا العام فقط، وستُحفظ كل البيانات الجديدة فيه.
                    بيانات الأعوام الأخرى تبقى محفوظة ويمكنك الرجوع إليها في أي وقت بإعادة اختيار العام.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={confirmYearSwitch} disabled={savingYear}
                      data-testid="confirm-year-switch-btn"
                      className="px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-60"
                      style={{ background: 'var(--theme-accent)', color: '#000' }}>
                      {savingYear ? 'جارٍ التبديل...' : 'تأكيد التبديل'}
                    </button>
                    <button onClick={() => setPendingYear(null)} disabled={savingYear}
                      data-testid="cancel-year-switch-btn"
                      className="px-4 py-2 rounded-xl text-sm font-bold border transition-all"
                      style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'var(--text-muted)' }}>
                      إلغاء
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Day / Night Mode Toggle ── */}
        <div className="quiz-card p-6">
          <h2 className="font-bold text-white mb-1 flex items-center gap-2">
            {mode === 'dark'
              ? <Moon className="w-5 h-5" style={{ color: 'var(--theme-accent)' }} />
              : <Sun  className="w-5 h-5" style={{ color: 'var(--theme-accent)' }} />}
            وضع العرض
          </h2>
          <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
            اختر بين الوضع الليلي (خلفية داكنة) والوضع النهاري (خلفية فاتحة)
          </p>

          <div className="flex gap-4">
            {/* Dark */}
            <button
              data-testid="mode-dark-btn"
              onClick={() => { if (mode !== 'dark') { toggleMode(); toast.success('تم التبديل إلى الوضع الليلي'); } }}
              className="flex-1 flex items-center gap-3 p-4 rounded-2xl border-2 transition-all"
              style={mode === 'dark'
                ? { borderColor: 'var(--theme-accent)', background: 'rgba(var(--theme-accent-rgb), 0.1)' }
                : { borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: mode === 'dark' ? 'rgba(var(--theme-accent-rgb),0.15)' : 'rgba(255,255,255,0.06)' }}>
                <Moon className="w-5 h-5" style={{ color: mode === 'dark' ? 'var(--theme-accent)' : 'var(--text-hint)' }} />
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: mode === 'dark' ? 'var(--theme-accent)' : 'var(--text-muted)' }}>وضع ليلي</p>
                <p className="text-xs text-slate-400">خلفية داكنة</p>
              </div>
              {mode === 'dark' && <Check className="w-4 h-4 mr-auto" style={{ color: 'var(--theme-accent)' }} />}
            </button>

            {/* Light */}
            <button
              data-testid="mode-light-btn"
              onClick={() => { if (mode !== 'light') { toggleMode(); toast.success('تم التبديل إلى الوضع النهاري'); } }}
              className="flex-1 flex items-center gap-3 p-4 rounded-2xl border-2 transition-all"
              style={mode === 'light'
                ? { borderColor: 'var(--theme-accent)', background: 'rgba(var(--theme-accent-rgb), 0.1)' }
                : { borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: mode === 'light' ? 'rgba(var(--theme-accent-rgb),0.15)' : 'rgba(255,255,255,0.06)' }}>
                <Sun className="w-5 h-5" style={{ color: mode === 'light' ? 'var(--theme-accent)' : 'var(--text-hint)' }} />
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: mode === 'light' ? 'var(--theme-accent)' : 'var(--text-muted)' }}>وضع نهاري</p>
                <p className="text-xs text-slate-400">خلفية فاتحة</p>
              </div>
              {mode === 'light' && <Check className="w-4 h-4 mr-auto" style={{ color: 'var(--theme-accent)' }} />}
            </button>
          </div>
        </div>

        {/* ── Font Size (6 Levels) ── */}
        <div className="quiz-card p-6">
          <h2 className="font-bold text-white mb-1 flex items-center gap-2">
            <Type className="w-5 h-5" style={{ color: 'var(--theme-accent)' }} />
            حجم الخط
          </h2>
          <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
            اختر حجم الخط المناسب لك — يُطبَّق فوراً على كامل التطبيق (6 مستويات)
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {FONT_SIZES.map(f => {
              const isSelected = f.level === fontLevel;
              return (
                <button
                  key={f.level}
                  data-testid={`font-size-${f.level}-btn`}
                  onClick={() => {
                    changeFontLevel(f.level);
                    toast.success(`حجم الخط: ${f.label}`, { duration: 1500 });
                  }}
                  className="relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all"
                  style={isSelected
                    ? { borderColor: 'var(--theme-accent)', background: 'rgba(var(--theme-accent-rgb), 0.1)' }
                    : { borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}
                >
                  <span
                    style={{
                      fontSize: `${f.px}px`,
                      lineHeight: 1,
                      fontWeight: 800,
                      color: isSelected ? 'var(--theme-accent)' : 'var(--text-muted)',
                    }}
                  >
                    أ
                  </span>
                  <span
                    className="text-xs font-bold"
                    style={{ color: isSelected ? 'var(--theme-accent)' : 'var(--text-muted)' }}
                  >
                    {f.label}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--text-hint)' }}>
                    المستوى {f.level}
                  </span>
                  {isSelected && (
                    <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: 'var(--theme-accent)' }}>
                      <Check className="w-3 h-3 text-black" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Student Day / Night Mode ── */}
        <div className="quiz-card p-6">
          <h2 className="font-bold text-white mb-1 flex items-center gap-2">
            <GraduationCap className="w-5 h-5" style={{ color: 'var(--theme-accent)' }} />
            وضع عرض الطلاب
          </h2>
          <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
            اختر كيف تظهر صفحات الاختبار للطلاب — ليلي أو نهاري
          </p>

          <div className="flex gap-4">
            {/* Dark */}
            <button
              data-testid="student-mode-dark-btn"
              disabled={savingStudentMode}
              onClick={() => saveStudentMode('dark')}
              className="flex-1 flex items-center gap-3 p-4 rounded-2xl border-2 transition-all disabled:opacity-60"
              style={studentMode === 'dark'
                ? { borderColor: 'var(--theme-accent)', background: 'rgba(var(--theme-accent-rgb), 0.1)' }
                : { borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: studentMode === 'dark' ? 'rgba(var(--theme-accent-rgb),0.15)' : 'rgba(255,255,255,0.06)' }}>
                <Moon className="w-5 h-5" style={{ color: studentMode === 'dark' ? 'var(--theme-accent)' : 'var(--text-hint)' }} />
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: studentMode === 'dark' ? 'var(--theme-accent)' : 'var(--text-muted)' }}>وضع ليلي</p>
                <p className="text-xs text-slate-400">خلفية داكنة</p>
              </div>
              {studentMode === 'dark' && <Check className="w-4 h-4 mr-auto" style={{ color: 'var(--theme-accent)' }} />}
            </button>

            {/* Light */}
            <button
              data-testid="student-mode-light-btn"
              disabled={savingStudentMode}
              onClick={() => saveStudentMode('light')}
              className="flex-1 flex items-center gap-3 p-4 rounded-2xl border-2 transition-all disabled:opacity-60"
              style={studentMode === 'light'
                ? { borderColor: 'var(--theme-accent)', background: 'rgba(var(--theme-accent-rgb), 0.1)' }
                : { borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: studentMode === 'light' ? 'rgba(var(--theme-accent-rgb),0.15)' : 'rgba(255,255,255,0.06)' }}>
                <Sun className="w-5 h-5" style={{ color: studentMode === 'light' ? 'var(--theme-accent)' : 'var(--text-hint)' }} />
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: studentMode === 'light' ? 'var(--theme-accent)' : 'var(--text-muted)' }}>وضع نهاري</p>
                <p className="text-xs text-slate-400">خلفية فاتحة</p>
              </div>
              {studentMode === 'light' && <Check className="w-4 h-4 mr-auto" style={{ color: 'var(--theme-accent)' }} />}
            </button>
          </div>
        </div>

        {/* ── Theme Picker ── */}
        <div className="quiz-card p-6">
          <h2 className="font-bold text-white mb-1 flex items-center gap-2">
            <Palette className="w-5 h-5" style={{ color: 'var(--theme-accent)' }} />
            ثيم التطبيق
          </h2>
          <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
            اختر المظهر الذي يعجبك — يُطبَّق فوراً على كامل التطبيق
          </p>

          {themeCategories.map(category => (
            <div key={category} className="mb-6">
              <div className={`inline-flex items-center px-3 py-1 rounded-lg border text-xs font-bold mb-3 ${CATEGORY_COLORS[category] || 'bg-slate-700/40 text-slate-300 border-slate-600/40'}`}>
                {category}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
                {THEMES.filter(t => t.category === category).map(t => (
                  <ThemeCard
                    key={t.id}
                    t={t}
                    isSelected={t.id === themeId}
                    onSelect={() => handleThemeChange(t.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Certificate Template Picker */}
        <div className="quiz-card p-6">
          <h2 className="font-bold text-white mb-1 flex items-center gap-2">
            <Award className="w-5 h-5" style={{ color: 'var(--theme-accent)' }} />
            قالب شهادة الإتمام
          </h2>
          <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
            اختر التصميم الذي سيظهر على شهادات الطلاب
          </p>

          {certGroups.map(group => (
            <div key={group} className="mb-6">
              <div className={`inline-flex items-center px-3 py-1 rounded-lg border text-xs font-bold mb-3 ${GROUP_COLORS[group] || 'bg-slate-700/40 text-slate-300 border-slate-600/40'}`}>
                {group}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {TEMPLATE_LIST.filter(t => t.group === group).map(t => {
                  const isSelected = certTemplate === t.id;
                  const [bg1, bg2] = t.preview;
                  return (
                    <button key={t.id} onClick={() => selectTemplate(t.id)}
                      data-testid={`cert-template-${t.id}`}
                      className={`relative rounded-xl border-2 overflow-hidden transition-all ${
                        isSelected
                          ? 'border-cyan-500 shadow-lg scale-105 shadow-cyan-500/20'
                          : 'border-white/10 hover:border-cyan-500/40 hover:shadow-md'
                      }`}
                      title={t.name}>
                      <div className="w-full h-16"
                        style={{ background: `linear-gradient(135deg, ${bg1} 0%, ${bg1} 50%, ${bg2}33 100%)` }}>
                        <div className="absolute inset-1.5 border rounded-lg opacity-60" style={{ borderColor: bg2 }} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                          <div className="h-1.5 rounded-full w-12 opacity-80" style={{ backgroundColor: bg2 }} />
                          <div className="h-1 rounded-full w-8 opacity-50" style={{ backgroundColor: bg2 }} />
                          {t.isDark && <div className="absolute inset-0 bg-black/20 rounded-xl" />}
                        </div>
                      </div>
                      <div className={`px-2 py-1.5 text-center ${t.isDark ? 'bg-slate-900' : 'bg-slate-800'}`}>
                        <p className="text-xs font-semibold leading-tight text-slate-200">{t.name}</p>
                      </div>
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ background: 'var(--theme-accent)' }}>
                          <Check className="w-3 h-3 text-black" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Profile */}
        <div className="quiz-card p-6">
          <h2 className="font-bold text-white mb-5 flex items-center gap-2">
            <User className="w-5 h-5" style={{ color: 'var(--theme-accent)' }} />
            الملف الشخصي
          </h2>
          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                اسم المعلم
              </label>
              <input className="input-field" placeholder="أدخل اسمك"
                value={profile.teacher_name}
                onChange={e => setProfile(p => ({ ...p, teacher_name: e.target.value }))}
                data-testid="teacher-name-input" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                اسم المدرسة
              </label>
              <input className="input-field" placeholder="اسم المدرسة"
                value={profile.school_name}
                onChange={e => setProfile(p => ({ ...p, school_name: e.target.value }))}
                data-testid="school-name-input" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2"
              data-testid="save-profile-btn">
              <Save className="w-4 h-4" />
              <span>حفظ التغييرات</span>
            </button>
          </form>
        </div>

        {/* Change password */}
        <div className="quiz-card p-6">
          <h2 className="font-bold text-white mb-5 flex items-center gap-2">
            <Lock className="w-5 h-5" style={{ color: 'var(--theme-accent)' }} />
            تغيير كلمة المرور
          </h2>
          <form onSubmit={changePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                كلمة المرور الحالية
              </label>
              <div className="relative">
                <input type={showOld ? 'text' : 'password'} className="input-field pl-10"
                  placeholder="كلمة المرور الحالية"
                  value={pwd.old} onChange={e => setPwd(p => ({ ...p, old: e.target.value }))}
                  data-testid="old-password-input" />
                <button type="button" onClick={() => setShowOld(!showOld)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                كلمة المرور الجديدة
              </label>
              <div className="relative">
                <input type={showNew ? 'text' : 'password'} className="input-field pl-10"
                  placeholder="كلمة المرور الجديدة (6 أحرف على الأقل)"
                  value={pwd.new} onChange={e => setPwd(p => ({ ...p, new: e.target.value }))}
                  data-testid="new-password-input" />
                <button type="button" onClick={() => setShowNew(!showNew)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                تأكيد كلمة المرور الجديدة
              </label>
              <input type="password" className="input-field"
                placeholder="أعد كتابة كلمة المرور الجديدة"
                value={pwd.confirm} onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))}
                data-testid="confirm-password-input" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2"
              data-testid="change-pwd-btn">
              <Lock className="w-4 h-4" />
              <span>تغيير كلمة المرور</span>
            </button>
          </form>
        </div>
      </div>
    </TeacherLayout>
  );
}
