import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { GraduationCap, Save, AlertTriangle, Lock, Check, Loader2 } from 'lucide-react';
import GradesLayout from './GradesLayout';
import { gradesApi, errMsg, GRADES_LIST, SUBJECTS, SEMESTERS, QUIZ_MAX } from './gradesApi';

const ALL_SECTIONS = ['1', '2', '3', '4', '5', '6', '7'];

export default function GradesEnter() {
  const role = localStorage.getItem('gradesRole') || 'teacher';
  const isAdmin = role === 'admin';

  const [assignments, setAssignments] = useState([]);
  const [semester, setSemester] = useState('1');
  const [grade, setGrade] = useState('');
  const [section, setSection] = useState('');
  const [subject, setSubject] = useState('');
  const [students, setStudents] = useState([]);
  const [scores, setScores] = useState({});
  const [settings, setSettings] = useState({ grades_locked: false });
  const [qmax, setQMax] = useState({ quiz1: QUIZ_MAX, quiz2: QUIZ_MAX });
  const [status, setStatus] = useState('idle'); // idle | saving | saved
  const [loading, setLoading] = useState(true);
  const pending = useRef(new Map());
  const timer = useRef(null);

  useEffect(() => {
    gradesApi.get('/status').then(r => setSettings(r.data)).catch(() => {});
    gradesApi.get('/my/assignments').then(r => {
      const list = r.data.assignments || [];
      setAssignments(list);
      if (list.length) {
        setGrade(list[0].grade);
        setSection(String(list[0].section));
        setSubject(list[0].subject);
      }
      setLoading(false);
    }).catch(e => { toast.error(errMsg(e)); setLoading(false); });
  }, []);

  const gradeOptions = useMemo(() => {
    if (isAdmin && !assignments.length) return GRADES_LIST;
    const s = [...new Set(assignments.map(a => a.grade))];
    return GRADES_LIST.filter(g => s.includes(g));
  }, [assignments, isAdmin]);

  const sectionOptions = useMemo(() => {
    if (isAdmin && !assignments.length) return ALL_SECTIONS;
    const s = [...new Set(assignments.filter(a => a.grade === grade).map(a => String(a.section)))];
    return s.sort((a, b) => Number(a) - Number(b));
  }, [assignments, grade, isAdmin]);

  // ضبط الشعبة والمادة تلقائياً بحسب الصف المختار
  useEffect(() => {
    if (!grade) return;
    if (!sectionOptions.includes(section)) setSection(sectionOptions[0] || '');
    const sub = assignments.find(a => a.grade === grade)?.subject;
    if (sub) setSubject(sub);
  }, [grade, sectionOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!grade || !section || !subject) { setStudents([]); setScores({}); return; }
    gradesApi.get('/my/students', { params: { grade, section } })
      .then(r => setStudents(r.data.students)).catch(e => toast.error(errMsg(e)));
    gradesApi.get('/my/scores', { params: { grade, section, subject, semester } })
      .then(r => {
        setScores(r.data.scores || {});
        setQMax({ quiz1: r.data.quiz1_max ?? QUIZ_MAX, quiz2: r.data.quiz2_max ?? QUIZ_MAX });
      }).catch(e => toast.error(errMsg(e)));
  }, [grade, section, subject, semester]);

  const flush = async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    const ids = [...pending.current.keys()];
    if (!ids.length) return;
    pending.current.clear();
    setStatus('saving');
    try {
      for (const sid of ids) {
        const sc = scores[sid] || {};
        await gradesApi.put('/my/scores', {
          student_id: sid, grade, section, subject, semester,
          quiz1: sc.quiz1 ?? null, quiz2: sc.quiz2 ?? null,
        });
      }
      setStatus('saved');
      setTimeout(() => setStatus(s => (s === 'saved' ? 'idle' : s)), 2500);
    } catch (e) {
      setStatus('idle');
      toast.error(errMsg(e));
    }
  };

  const scoresRef = useRef(scores);
  scoresRef.current = scores;

  const scheduleSave = (sid) => {
    pending.current.set(sid, true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      // نستخدم أحدث نسخة من الدرجات
      const snap = scoresRef.current;
      const ids = [...pending.current.keys()];
      pending.current.clear();
      setStatus('saving');
      (async () => {
        try {
          for (const id of ids) {
            const sc = snap[id] || {};
            await gradesApi.put('/my/scores', {
              student_id: id, grade, section, subject, semester,
              quiz1: sc.quiz1 ?? null, quiz2: sc.quiz2 ?? null,
            });
          }
          setStatus('saved');
          setTimeout(() => setStatus(s => (s === 'saved' ? 'idle' : s)), 2500);
        } catch (e) {
          setStatus('idle');
          toast.error(errMsg(e));
        }
      })();
    }, 800);
  };

  const updateScore = (sid, field, value) => {
    setScores(prev => {
      const cur = prev[sid] || {};
      const v = value === '' ? null : Math.max(0, Math.min(qmax[field], parseFloat(value)));
      return { ...prev, [sid]: { ...cur, [field]: Number.isNaN(v) ? null : v } };
    });
    if (!settings.grades_locked) scheduleSave(sid);
  };

  if (loading) return <GradesLayout><p className="text-center py-10" style={{ color: 'var(--sub-muted)' }}>جارٍ التحميل...</p></GradesLayout>;

  const noAccess = !isAdmin && assignments.length === 0;

  return (
    <GradesLayout title={isAdmin ? 'إدخال الدرجات' : 'إدخال درجات الطلاب'} subtitle="اختر الفصل الدراسي ثم الصف ثم الشعبة وأدخل الدرجات — الحفظ تلقائي">
      {settings.grades_locked && (
        <div className="sub-card p-4 mb-5 sub-rise flex items-center gap-3" style={{ background: 'var(--sub-red-soft)', borderColor: 'var(--sub-red-line)' }}>
          <Lock className="w-5 h-5" style={{ color: 'var(--sub-red-ink)' }} />
          <p className="font-bold text-sm" style={{ color: 'var(--sub-red-ink)' }}>تم قفل كتابة الدرجات من قبل الإدارة — لا يمكن التعديل حالياً</p>
        </div>
      )}

      {noAccess ? (
        <div className="sub-card p-8 text-center sub-rise">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--sub-amber)' }} />
          <p className="font-bold" style={{ color: 'var(--sub-navy-ink)' }}>لا توجد صفوف مسجّلة لك بعد</p>
          <p className="text-sm mt-1" style={{ color: 'var(--sub-muted)' }}>تواصل مع مدير النظام لإضافة المادة والصفوف إلى حسابك</p>
        </div>
      ) : (
        <>
          {/* القوائم المتتابعة: الفصل → الصف → الشعبة */}
          <div className="sub-card p-4 mb-5 sub-rise grid gap-3 md:grid-cols-4">
            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: 'var(--sub-muted)' }}>الفصل الدراسي</label>
              <select className="sub-input w-full" value={semester} onChange={(e) => setSemester(e.target.value)} data-testid="grades-semester-select">
                {SEMESTERS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: 'var(--sub-muted)' }}>الصف</label>
              <select className="sub-input w-full" value={grade} onChange={(e) => setGrade(e.target.value)} data-testid="grades-grade-select">
                <option value="">— اختر الصف —</option>
                {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: 'var(--sub-muted)' }}>الشعبة</label>
              <select className="sub-input w-full" value={section} onChange={(e) => setSection(e.target.value)} disabled={!grade} data-testid="grades-section-select">
                <option value="">— اختر الشعبة —</option>
                {sectionOptions.map(s => <option key={s} value={s}>شعبة {s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: 'var(--sub-muted)' }}>المادة</label>
              {isAdmin && !assignments.length ? (
                <select className="sub-input w-full" value={subject} onChange={(e) => setSubject(e.target.value)} data-testid="grades-subject-select">
                  <option value="">— اختر المادة —</option>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <div className="sub-input w-full flex items-center font-bold" data-testid="grades-subject-fixed" style={{ color: 'var(--sub-navy-ink)' }}>{subject || '—'}</div>
              )}
            </div>
          </div>

          {/* جدول الدرجات */}
          <div className="sub-card p-5 sub-rise">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <GraduationCap className="w-5 h-5" style={{ color: 'var(--sub-navy)' }} />
              <h3 className="font-black text-sm md:text-lg" style={{ color: 'var(--sub-navy-ink)' }}>
                {subject || '—'} — {grade || '—'} / شعبة {section || '—'}
              </h3>
              <span className="sub-badge sub-badge-gray">{students.length} طالب</span>
              <button onClick={flush} disabled={settings.grades_locked} className="sub-btn sub-btn-primary sub-btn-sm mr-auto" data-testid="grades-save-btn">
                {status === 'saving' ? <><Loader2 className="w-4 h-4 animate-spin" /> جارٍ الحفظ…</>
                  : status === 'saved' ? <><Check className="w-4 h-4" /> تم الحفظ</>
                  : <><Save className="w-4 h-4" /> حفظ تلقائي</>}
              </button>
            </div>
            <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--sub-line)' }}>
              <table className="sub-table">
                <thead>
                  <tr>
                    <th>م</th><th>اسم الطالب</th>
                    <th>اختبار قصير 1<br/><span className="text-[10px] font-normal" style={{ color: 'var(--sub-muted)' }}>(من {qmax.quiz1})</span></th>
                    <th>اختبار قصير 2<br/><span className="text-[10px] font-normal" style={{ color: 'var(--sub-muted)' }}>(من {qmax.quiz2})</span></th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => {
                    const sc = scores[s.id] || {};
                    const q1 = sc.quiz1, q2 = sc.quiz2;
                    return (
                      <tr key={s.id}>
                        <td>{i + 1}</td>
                        <td className="font-bold">{s.name}</td>
                        <td><input type="number" min="0" max={qmax.quiz1} step="0.5" disabled={settings.grades_locked}
                          className="sub-input w-20 text-center" value={q1 ?? ''} onChange={(e) => updateScore(s.id, 'quiz1', e.target.value)} onBlur={flush} data-testid={`grades-quiz1-${s.id}`} /></td>
                        <td><input type="number" min="0" max={qmax.quiz2} step="0.5" disabled={settings.grades_locked}
                          className="sub-input w-20 text-center" value={q2 ?? ''} onChange={(e) => updateScore(s.id, 'quiz2', e.target.value)} onBlur={flush} data-testid={`grades-quiz2-${s.id}`} /></td>
                      </tr>
                    );
                  })}
                  {students.length === 0 && (
                    <tr><td colSpan={4} className="text-center py-8" style={{ color: 'var(--sub-muted)' }}>
                      {grade && section ? 'لا يوجد طلاب في هذا الصف/الشعبة — استورد بيانات الطلاب' : 'اختر الفصل والصف والشعبة لعرض الطلاب'}
                    </td></tr>
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
