import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { BarChart3, Users, Award, TrendingUp, Trophy, Printer } from 'lucide-react';
import GradesLayout from './GradesLayout';
import { gradesApi, errMsg, SEMESTERS } from './gradesApi';

export default function GradesStats() {
  const [stats, setStats] = useState([]);
  const [full, setFull] = useState([]);
  const [semFilter, setSemFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const isAdmin = (localStorage.getItem('gradesRole') || 'teacher') === 'admin';

  useEffect(() => {
    Promise.all([
      gradesApi.get('/my/stats').then(r => setStats(r.data.stats || [])).catch(e => toast.error(errMsg(e))),
      gradesApi.get('/full-marks').then(r => { setFull(r.data.rows || []); }).catch(e => toast.error(errMsg(e))),
    ]).finally(() => setLoading(false));
  }, []);

  const fullRows = useMemo(() => semFilter ? full.filter(r => r.semester === semFilter) : full, [full, semFilter]);

  const classSummary = useMemo(() => {
    const m = new Map();
    for (const s of stats) {
      const k = `${s.grade}|${s.section}`;
      if (!m.has(k)) m.set(k, { grade: s.grade, section: s.section, subject: s.subject, total_students: s.total_students, full_mark: 0, entered: 0 });
      const c = m.get(k);
      c.full_mark += s.full_mark || 0;
      c.entered = Math.max(c.entered, s.entered || 0);
    }
    return [...m.values()];
  }, [stats]);

  if (loading) return <GradesLayout><p className="text-center py-10" style={{ color: 'var(--sub-muted)' }}>جارٍ التحميل...</p></GradesLayout>;

  return (
    <GradesLayout title="الإحصائيات" subtitle={isAdmin ? 'إحصائيات عامة والطلاب الحاصلون على الدرجة النهائية' : 'إحصائيات الصفوف التي تدرّسها والطلاب الحاصلون على الدرجة النهائية'}>
      {/* ملخص الصفوف التي يدرسها المعلم */}
      {classSummary.length > 0 && (
        <div className="sub-card p-5 mb-5 sub-rise" data-testid="grades-classes-summary">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5" style={{ color: 'var(--sub-navy)' }} />
            <h3 className="font-black" style={{ color: 'var(--sub-navy-ink)' }}>الصفوف التي تدرّسها</h3>
            <span className="sub-badge sub-badge-gray mr-auto">{classSummary.length} شعبة</span>
          </div>
          <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--sub-line)' }}>
            <table className="sub-table">
              <thead><tr><th>م</th><th>الصف</th><th>الشعبة</th><th>المادة</th><th>عدد الطلاب</th><th>حاصلون على الدرجة النهائية</th></tr></thead>
              <tbody>
                {classSummary.map((c, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td className="font-bold">{c.grade}</td>
                    <td>{c.section}</td>
                    <td>{c.subject}</td>
                    <td className="font-black">{c.total_students}</td>
                    <td><span className="sub-badge" style={{ background: 'var(--sub-green-soft)', color: 'var(--sub-green-ink)' }}>{c.full_mark}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* الطلاب الحاصلون على الدرجة النهائية */}
      <div className="sub-card p-5 mb-5 sub-rise" data-testid="grades-full-marks-card">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Trophy className="w-5 h-5" style={{ color: 'var(--sub-amber-ink)' }} />
          <h3 className="font-black" style={{ color: 'var(--sub-navy-ink)' }}>الحاصلون على الدرجة النهائية لمادتهم</h3>
          <span className="sub-badge sub-badge-navy">{fullRows.length} طالب</span>
          <select className="sub-input mr-auto w-auto" value={semFilter} onChange={(e) => setSemFilter(e.target.value)} data-testid="grades-full-sem-filter">
            <option value="">كل الفصول</option>
            {SEMESTERS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <a href={`/grades/full-marks/print${semFilter ? `?semester=${semFilter}` : ''}`} target="_blank" rel="noreferrer"
            className="sub-btn sub-btn-primary sub-btn-sm" data-testid="grades-full-pdf-btn">
            <Printer className="w-4 h-4" /> تنزيل كشف PDF
          </a>
        </div>
        {fullRows.length === 0 ? (
          <p className="text-center py-8 text-sm" style={{ color: 'var(--sub-muted)' }}>لا يوجد طلاب حاصلون على الدرجة النهائية بعد</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--sub-line)' }}>
            <table className="sub-table">
              <thead>
                <tr>
                  <th>م</th><th>اسم الطالب</th><th>الصف</th><th>الشعبة</th><th>المادة</th><th>الفصل</th>
                  {isAdmin && <th>المعلم</th>}
                  <th>الدرجة</th>
                </tr>
              </thead>
              <tbody>
                {fullRows.map((r, i) => (
                  <tr key={i} data-testid={`grades-full-row-${i}`}>
                    <td>{i + 1}</td>
                    <td className="font-bold">{r.student_name}</td>
                    <td>{r.grade}</td>
                    <td>{r.section}</td>
                    <td>{r.subject}</td>
                    <td className="text-xs" style={{ color: 'var(--sub-muted)' }}>{r.semester_label}</td>
                    {isAdmin && <td className="text-xs">{r.teacher_name}</td>}
                    <td className="font-black" style={{ color: 'var(--sub-green-ink)' }}>{r.total} / {r.max}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {stats.length === 0 ? (
        <div className="sub-card p-8 text-center sub-rise">
          <BarChart3 className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--sub-muted)' }} />
          <p className="font-bold" style={{ color: 'var(--sub-navy-ink)' }}>لا توجد إحصائيات تفصيلية بعد</p>
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
                <span className="sub-badge sub-badge-navy">{s.entered}/{s.total_students} مُدخلة</span>
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
