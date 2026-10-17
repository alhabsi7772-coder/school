import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Users, BookOpen, CheckCircle2, Clock, AlertTriangle, Settings } from 'lucide-react';
import GradesLayout from './GradesLayout';
import EntryBoard from './EntryBoard';
import { gradesApi, errMsg, GRADES_LIST } from './gradesApi';

export default function GradesAdmin() {
  const [stats, setStats] = useState(null);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([gradesApi.get('/admin/stats'), gradesApi.get('/settings')])
      .then(([s, st]) => { setStats(s.data); setSettings(st.data); })
      .catch(e => toast.error(errMsg(e)))
      .finally(() => setLoading(false));
  }, []);

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

      {/* الحالة الحالية */}
      <div className="sub-card p-5 mb-6 sub-rise flex flex-wrap items-center gap-2" data-testid="grades-status-card">
        <span className="text-xs font-bold" style={{ color: 'var(--sub-muted)' }}>الحالة الحالية:</span>
        <span className="sub-badge sub-badge-navy" data-testid="grades-status-semester">{settings.current_semester === '2' ? 'الفصل الدراسي الثاني' : 'الفصل الدراسي الأول'}</span>
        <span className={`sub-badge ${settings.site_closed ? 'sub-badge-red' : 'sub-badge-green'}`} data-testid="grades-status-site">{settings.site_closed ? 'النظام مغلق' : 'النظام مفتوح'}</span>
        <span className={`sub-badge ${settings.grades_locked ? 'sub-badge-red' : 'sub-badge-green'}`} data-testid="grades-status-lock">{settings.grades_locked ? 'الإدخال مقفول' : 'الإدخال مفتوح'}</span>
        <span className={`sub-badge ${settings.parent_closed ? 'sub-badge-red' : 'sub-badge-green'}`} data-testid="grades-status-parent">{settings.parent_closed ? 'النتائج مغلقة عن الأولياء' : 'النتائج متاحة للأولياء'}</span>
        <Link to="/grades/settings" className="sub-btn sub-btn-primary sub-btn-sm mr-auto" data-testid="grades-go-settings"><Settings className="w-4 h-4" /> الإعدادات</Link>
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

      <EntryBoard teachers={stats?.teachers || []} />
    </GradesLayout>
  );
}
