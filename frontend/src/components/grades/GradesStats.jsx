import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BarChart3, Users, Award, TrendingUp } from 'lucide-react';
import GradesLayout from './GradesLayout';
import { gradesApi, errMsg, SEMESTERS } from './gradesApi';

export default function GradesStats() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    gradesApi.get('/my/stats').then(r => setStats(r.data.stats || [])).catch(e => toast.error(errMsg(e))).finally(() => setLoading(false));
  }, []);

  if (loading) return <GradesLayout><p className="text-center py-10" style={{ color: 'var(--sub-muted)' }}>جارٍ التحميل...</p></GradesLayout>;

  return (
    <GradesLayout title="الإحصائيات" subtitle="إحصائيات درجات الطلاب حسب كل تكليف وفصل دراسي">
      {stats.length === 0 ? (
        <div className="sub-card p-8 text-center sub-rise">
          <BarChart3 className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--sub-muted)' }} />
          <p className="font-bold" style={{ color: 'var(--sub-navy-ink)' }}>لا توجد إحصائيات بعد</p>
          <p className="text-sm mt-1" style={{ color: 'var(--sub-muted)' }}>أدخل درجات الطلاب لعرض الإحصائيات</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {stats.map((s, i) => (
            <div key={i} className="sub-card p-5 sub-rise">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-black" style={{ color: 'var(--sub-navy-ink)' }}>{s.subject} — {s.grade} / شعبة {s.section}</h3>
                  <p className="text-xs font-semibold" style={{ color: 'var(--sub-muted)' }}>{s.semester_label}</p>
                </div>
                <span className="sub-badge sub-badge-navy">{s.entered}/{s.total_students} entered</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-xl" style={{ background: 'var(--sub-surface-2)' }}>
                  <Users className="w-4 h-4 mx-auto mb-1" style={{ color: 'var(--sub-navy-ink)' }} />
                  <div className="text-xl font-black" style={{ color: 'var(--sub-navy-ink)' }}>{s.total_students}</div>
                  <div className="text-[10px] font-bold" style={{ color: 'var(--sub-muted)' }}>الطلاب</div>
                </div>
                <div className="text-center p-3 rounded-xl" style={{ background: 'var(--sub-green-soft)' }}>
                  <Award className="w-4 h-4 mx-auto mb-1" style={{ color: 'var(--sub-green-ink)' }} />
                  <div className="text-xl font-black" style={{ color: 'var(--sub-green-ink)' }}>{s.full_mark}</div>
                  <div className="text-[10px] font-bold" style={{ color: 'var(--sub-muted)' }}>الدرجة النهائية</div>
                </div>
                <div className="text-center p-3 rounded-xl" style={{ background: 'var(--sub-amber-soft)' }}>
                  <TrendingUp className="w-4 h-4 mx-auto mb-1" style={{ color: 'var(--sub-amber-ink)' }} />
                  <div className="text-xl font-black" style={{ color: 'var(--sub-amber-ink)' }}>{s.avg ?? '—'}</div>
                  <div className="text-[10px] font-bold" style={{ color: 'var(--sub-muted)' }}>المتوسط</div>
                </div>
              </div>
              {s.entered > 0 && (
                <div className="mt-3">
                  <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: 'var(--sub-surface-2)' }}>
                    <div className="h-full rounded-full" style={{ width: `${(s.entered / s.total_students) * 100}%`, background: 'var(--sub-navy)' }} />
                  </div>
                  <p className="text-[11px] mt-1 font-semibold" style={{ color: 'var(--sub-muted)' }}>نسبة الإدخال: {Math.round((s.entered / s.total_students) * 100)}%</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </GradesLayout>
  );
}
