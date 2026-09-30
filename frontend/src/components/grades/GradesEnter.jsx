import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { GraduationCap, Save, AlertTriangle, Lock } from 'lucide-react';
import GradesLayout from './GradesLayout';
import { gradesApi, errMsg, GRADES_LIST, SEMESTERS, QUIZ_MAX, levelLetter, LEVEL_COLORS } from './gradesApi';

export default function GradesEnter() {
  const [assignments, setAssignments] = useState([]);
  const [selected, setSelected] = useState(null); // {grade, section, subject}
  const [semester, setSemester] = useState('1');
  const [students, setStudents] = useState([]);
  const [scores, setScores] = useState({});
  const [settings, setSettings] = useState({ grades_locked: false });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const saveTimer = useRef(null);

  useEffect(() => {
    gradesApi.get('/my/assignments').then(r => {
      setAssignments(r.data.assignments || []);
      if (r.data.assignments?.length) setSelected(r.data.assignments[0]);
    }).catch(e => toast.error(errMsg(e)));
    gradesApi.get('/status').then(r => setSettings(r.data)).catch(() => {});
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!selected) return;
    gradesApi.get('/my/students', { params: { grade: selected.grade, section: selected.section } })
      .then(r => setStudents(r.data.students)).catch(e => toast.error(errMsg(e)));
    gradesApi.get('/my/scores', { params: { ...selected, semester } })
      .then(r => setScores(r.data.scores || {})).catch(e => toast.error(errMsg(e)));
  }, [selected, semester]);

  const updateScore = (studentId, field, value) => {
    setScores(prev => {
      const cur = prev[studentId] || {};
      return { ...prev, [studentId]: { ...cur, [field]: value === '' ? null : Math.max(0, Math.min(QUIZ_MAX, parseFloat(value))) } };
    });
  };

  const saveAll = async () => {
    if (!selected) return;
    setSaving(true);
    let saved = 0;
    for (const s of students) {
      const sc = scores[s.id] || {};
      if (sc.quiz1 === undefined && sc.quiz2 === undefined) continue;
      try {
        await gradesApi.put('/my/scores', { student_id: s.id, grade: selected.grade, section: selected.section, subject: selected.subject, semester, quiz1: sc.quiz1 ?? null, quiz2: sc.quiz2 ?? null });
        saved++;
      } catch (e) {
        if (e.response?.status === 403) { toast.error(errMsg(e)); setSaving(false); return; }
      }
    }
    toast.success(`تم حفظ درجات ${saved} طالب`);
    setSaving(false);
  };

  if (loading) return <GradesLayout><p className="text-center py-10" style={{ color: 'var(--sub-muted)' }}>جارٍ التحميل...</p></GradesLayout>;

  const role = localStorage.getItem('gradesRole') || 'teacher';

  return (
    <GradesLayout title={role === 'admin' ? 'إدخال الدرجات' : 'إدخال درجات الطلاب'} subtitle="اختر الصف والشعبة والمادة ثم أدخل درجات الاختبارات القصيرة">
      {settings.grades_locked && (
        <div className="sub-card p-4 mb-5 sub-rise flex items-center gap-3" style={{ background: 'var(--sub-red-soft)', borderColor: 'var(--sub-red-line)' }}>
          <Lock className="w-5 h-5" style={{ color: 'var(--sub-red-ink)' }} />
          <p className="font-bold text-sm" style={{ color: 'var(--sub-red-ink)' }}>تم قفل كتابة الدرجات من قبل الإدارة — لا يمكن التعديل حالياً</p>
        </div>
      )}

      {assignments.length === 0 ? (
        <div className="sub-card p-8 text-center sub-rise">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--sub-amber)' }} />
          <p className="font-bold" style={{ color: 'var(--sub-navy-ink)' }}>لا توجد تكليفات لك بعد</p>
          <p className="text-sm mt-1" style={{ color: 'var(--sub-muted)' }}>تواصل مع مدير النظام لتكليفك بالصفوف والشعب والمواد</p>
        </div>
      ) : (
        <>
          {/* اختيار التكليف والفصل */}
          <div className="sub-card p-4 mb-5 sub-rise flex flex-wrap gap-3 items-center">
            <select className="sub-input flex-1 min-w-[260px]" value={JSON.stringify(selected)} onChange={(e) => setSelected(JSON.parse(e.target.value))}>
              {assignments.map((a, i) => <option key={i} value={JSON.stringify(a)}>{a.subject} — {a.grade} / شعبة {a.section}</option>)}
            </select>
            <div className="flex rounded-full p-1" style={{ background: 'var(--sub-surface-2)', border: '1px solid var(--sub-line)' }}>
              {SEMESTERS.map((s) => (
                <button key={s.value} onClick={() => setSemester(s.value)} className="px-4 py-1.5 rounded-full text-sm font-bold transition-colors"
                  style={semester === s.value ? { background: 'var(--sub-navy)', color: 'var(--sub-on-navy)' } : { color: 'var(--sub-muted)' }}>{s.label}</button>
              ))}
            </div>
            <button onClick={saveAll} disabled={saving || settings.grades_locked} className="sub-btn sub-btn-primary sub-btn-sm mr-auto" data-testid="grades-save-btn">
              <Save className="w-4 h-4" /> {saving ? 'جارٍ الحفظ...' : 'حفظ'}
            </button>
          </div>

          {/* جدول الدرجات */}
          <div className="sub-card p-5 sub-rise">
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="w-5 h-5" style={{ color: 'var(--sub-navy)' }} />
              <h3 className="font-black" style={{ color: 'var(--sub-navy-ink)' }}>
                {selected?.subject} — {selected?.grade} / شعبة {selected?.section} — {SEMESTERS.find(s => s.value === semester)?.label}
              </h3>
              <span className="sub-badge sub-badge-gray mr-auto">{students.length} طالب</span>
            </div>
            <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--sub-line)' }}>
              <table className="sub-table">
                <thead>
                  <tr>
                    <th>م</th><th>اسم الطالب</th><th>الرقم المدني</th>
                    <th>اختبار قصير 1<br/><span className="text-[10px] font-normal" style={{ color: 'var(--sub-muted)' }}>(من {QUIZ_MAX})</span></th>
                    <th>اختبار قصير 2<br/><span className="text-[10px] font-normal" style={{ color: 'var(--sub-muted)' }}>(من {QUIZ_MAX})</span></th>
                    <th>المجموع<br/><span className="text-[10px] font-normal" style={{ color: 'var(--sub-muted)' }}>(من {QUIZ_MAX * 2})</span></th>
                    <th>المستوى</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => {
                    const sc = scores[s.id] || {};
                    const q1 = sc.quiz1, q2 = sc.quiz2;
                    const total = (q1 != null || q2 != null) ? (q1 || 0) + (q2 || 0) : null;
                    const pct = total != null ? (total / (QUIZ_MAX * 2)) * 100 : null;
                    const lvl = levelLetter(pct);
                    return (
                      <tr key={s.id}>
                        <td>{i + 1}</td>
                        <td className="font-bold">{s.name}</td>
                        <td className="text-xs" style={{ color: 'var(--sub-muted)' }}>{s.civil_number || '—'}</td>
                        <td><input type="number" min="0" max={QUIZ_MAX} step="0.5" disabled={settings.grades_locked}
                          className="sub-input w-20 text-center" value={q1 ?? ''} onChange={(e) => updateScore(s.id, 'quiz1', e.target.value)} data-testid={`grades-quiz1-${s.id}`} /></td>
                        <td><input type="number" min="0" max={QUIZ_MAX} step="0.5" disabled={settings.grades_locked}
                          className="sub-input w-20 text-center" value={q2 ?? ''} onChange={(e) => updateScore(s.id, 'quiz2', e.target.value)} data-testid={`grades-quiz2-${s.id}`} /></td>
                        <td className="font-black">{total ?? '—'}</td>
                        <td>{lvl ? <span className="sub-badge" style={{ background: `${LEVEL_COLORS[lvl]}22`, color: LEVEL_COLORS[lvl] }}>{lvl}</span> : '—'}</td>
                      </tr>
                    );
                  })}
                  {students.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-8" style={{ color: 'var(--sub-muted)' }}>لا يوجد طلاب في هذا الصف/الشعبة — استورد بيانات الطلاب</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </GradesLayout>
  );
}
