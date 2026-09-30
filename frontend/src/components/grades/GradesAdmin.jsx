import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Users, BookOpen, CheckCircle2, Clock, Lock, Unlock, Lock as LockIcon, AlertTriangle, FileUp } from 'lucide-react';
import GradesLayout from './GradesLayout';
import { gradesApi, errMsg, GRADES_LIST, classLabel } from './gradesApi';

export default function GradesAdmin() {
  const [stats, setStats] = useState(null);
  const [settings, setSettings] = useState({ site_closed: false, grades_locked: false });
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const fetchAll = async () => {
    try {
      const [s, st] = await Promise.all([
        gradesApi.get('/admin/stats'),
        gradesApi.get('/settings'),
      ]);
      setStats(s.data);
      setSettings(st.data);
    } catch (e) { toast.error(errMsg(e)); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const toggleLock = async (key) => {
    setToggling(true);
    try {
      const res = await gradesApi.put('/settings', { [key]: !settings[key] });
      setSettings(res.data);
      toast.success(!settings[key] ? (key === 'grades_locked' ? 'تم قفل كتابة الدرجات' : 'تم إغلاق النظام') : 'تم فتح النظام');
    } catch (e) { toast.error(errMsg(e)); }
    finally { setToggling(false); }
  };

  if (loading) return <GradesLayout><p className="text-center py-10" style={{ color: 'var(--sub-muted)' }}>جارٍ التحميل...</p></GradesLayout>;

  const cards = [
    { l: 'إجمالي المعلمين', v: stats?.total_teachers ?? '—', ic: Users, c: 'var(--sub-navy-ink)', bg: 'var(--sub-navy-soft)' },
    { l: 'إجمالي الطلاب', v: stats?.total_students ?? '—', ic: BookOpen, c: 'var(--sub-teal-ink)', bg: 'var(--sub-teal-soft)' },
    { l: 'معلمون أدخلوا الدرجات', v: stats?.teachers_entered ?? '—', ic: CheckCircle2, c: 'var(--sub-green-ink)', bg: 'var(--sub-green-soft)' },
    { l: 'معلمون لم يدخلوا', v: stats?.teachers_pending ?? '—', ic: Clock, c: 'var(--sub-amber-ink)', bg: 'var(--sub-amber-soft)' },
    { l: 'معلمون لم يكملوا', v: stats?.teachers_incomplete ?? '—', ic: AlertTriangle, c: 'var(--sub-red-ink)', bg: 'var(--sub-red-soft)' },
  ];

  return (
    <GradesLayout title="لوحة تحكم المدير" subtitle="نظرة عامة على نظام درجات الخيرات ومتابعة المعلمين">
      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {cards.map((s, i) => (
          <div key={s.l} className={`sub-stat sub-rise sub-rise-${Math.min(3, i + 1)}`}>
            <div className="flex items-center justify-between">
              <span className="v">{s.v}</span>
              <span style={{ width: 40, height: 40, borderRadius: 14, background: s.bg, display: 'grid', placeItems: 'center' }}><s.ic className="w-5 h-5" style={{ color: s.c }} /></span>
            </div>
            <div className="l">{s.l}</div>
          </div>
        ))}
      </div>

      {/* أزرار التحكم */}
      <div className="sub-card p-5 mb-6 sub-rise">
        <h3 className="font-black mb-4" style={{ color: 'var(--sub-navy-ink)' }}>التحكم في النظام</h3>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => toggleLock('grades_locked')} disabled={toggling}
            className="sub-btn sub-btn-sm" style={settings.grades_locked ? { background: 'var(--sub-red)', color: '#fff' } : { background: 'var(--sub-green-soft)', color: 'var(--sub-green-ink)', border: '1px solid var(--sub-green-line)' }}
            data-testid="grades-toggle-lock">
            {settings.grades_locked ? <><LockIcon className="w-4 h-4" /> قفل كتابة الدرجات مفعّل</> : <><Unlock className="w-4 h-4" /> كتابة الدرجات مفتوحة</>}
          </button>
          <button onClick={() => toggleLock('site_closed')} disabled={toggling}
            className="sub-btn sub-btn-sm" style={settings.site_closed ? { background: 'var(--sub-red)', color: '#fff' } : { background: 'var(--sub-amber-soft)', color: 'var(--sub-amber-ink)', border: '1px solid var(--sub-amber-line)' }}
            data-testid="grades-toggle-site">
            {settings.site_closed ? <><LockIcon className="w-4 h-4" /> النظام مغلق للمعلمين</> : <><Unlock className="w-4 h-4" /> النظام مفتوح</>}
          </button>
        </div>
        {settings.site_closed && (
          <p className="text-xs mt-3 flex items-center gap-1.5" style={{ color: 'var(--sub-amber-ink)' }}>
            <AlertTriangle className="w-3.5 h-3.5" /> النظام مغلق — لن يتمكن المعلمون من تسجيل الدخول (المدير يستطيع)
          </p>
        )}
      </div>

      {/* توزيع الطلاب حسب الصف */}
      <div className="sub-card p-5 mb-6 sub-rise">
        <h3 className="font-black mb-4" style={{ color: 'var(--sub-navy-ink)' }}>توزيع الطلاب حسب الصف</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {GRADES_LIST.map((g) => (
            <div key={g} className="text-center p-4 rounded-2xl" style={{ background: 'var(--sub-surface-2)', border: '1px solid var(--sub-line)' }}>
              <div className="text-2xl font-black" style={{ color: 'var(--sub-navy-ink)' }}>{stats?.by_grade?.[g] ?? 0}</div>
              <div className="text-xs font-bold mt-1" style={{ color: 'var(--sub-muted)' }}>{g}</div>
            </div>
          ))}
        </div>
      </div>

      {/* تنبيه: معلمون لم يكملوا إدخال الدرجات */}
      {(stats?.teachers || []).some(t => t.incomplete) && (
        <div className="sub-card p-5 mb-6 sub-rise" data-testid="grades-incomplete-card"
          style={{ background: 'var(--sub-amber-soft)', borderColor: 'var(--sub-amber-line)' }}>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5" style={{ color: 'var(--sub-amber-ink)' }} />
            <h3 className="font-black" style={{ color: 'var(--sub-amber-ink)' }}>معلمون لم يكملوا إدخال درجات شعبهم</h3>
            <span className="sub-badge sub-badge-amber mr-auto">{stats.teachers.filter(t => t.incomplete).length} معلم</span>
          </div>
          <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--sub-amber-line)', background: 'var(--sub-surface)' }}>
            <table className="sub-table">
              <thead><tr><th>م</th><th>المعلم</th><th>المادة</th><th>الشعب الناقصة</th><th>المتبقي</th></tr></thead>
              <tbody>
                {stats.teachers.filter(t => t.incomplete).map((t, i) => (
                  <tr key={t.id} data-testid={`grades-incomplete-row-${i}`}>
                    <td>{i + 1}</td>
                    <td className="font-bold">{t.name}</td>
                    <td className="text-xs font-semibold">{t.subject || '—'}</td>
                    <td className="text-xs">
                      {t.pending.map((p, k) => (
                        <span key={k} className="sub-badge sub-badge-gray" style={{ margin: '2px' }}>
                          {p.grade}/{p.section} · {p.semester_label} · ناقص {p.missing} من {p.students}
                        </span>
                      ))}
                    </td>
                    <td className="font-black" style={{ color: 'var(--sub-red-ink)' }}>{t.pending.reduce((a, p) => a + p.missing, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* حالة المعلمين */}
      <div className="sub-card p-5 sub-rise">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black" style={{ color: 'var(--sub-navy-ink)' }}>متابعة إدخال الدرجات</h3>
          <Link to="/grades/teachers" className="sub-btn sub-btn-ghost sub-btn-sm">إدارة المعلمين</Link>
        </div>
        <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--sub-line)' }}>
          <table className="sub-table">
            <thead><tr><th>م</th><th>المعلم</th><th>الرقم الوظيفي</th><th>المادة</th><th>الصفوف</th><th>الدرجات المدخلة</th><th>الحالة</th></tr></thead>
            <tbody>
              {(stats?.teachers || []).map((t, i) => (
                <tr key={t.id}>
                  <td>{i + 1}</td>
                  <td className="font-bold">{t.name}</td>
                  <td className="text-xs" style={{ color: 'var(--sub-muted)' }}>{t.employee_number || '—'}</td>
                  <td className="text-xs font-semibold">{t.subject || '—'}</td>
                  <td className="text-xs">{(t.classes || []).map(classLabel).join('، ') || '—'}</td>
                  <td className="font-black">{t.scores_count || 0}</td>
                  <td>
                    {t.entered
                      ? <span className="sub-badge sub-badge-green"><CheckCircle2 className="w-3 h-3" /> أدخل</span>
                      : <span className="sub-badge sub-badge-amber"><Clock className="w-3 h-3" /> لم يدخل</span>}
                  </td>
                </tr>
              ))}
              {(!stats?.teachers || stats.teachers.length === 0) && (
                <tr><td colSpan={7} className="text-center py-8" style={{ color: 'var(--sub-muted)' }}>لا يوجد معلمون — استورد بيانات المعلمين من صفحة المعلمين</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </GradesLayout>
  );
}
