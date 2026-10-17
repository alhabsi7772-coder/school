import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Lock as LockIcon, Unlock, AlertTriangle, Settings, KeyRound, X, Eye, EyeOff, Trash2, Plus, CalendarRange } from 'lucide-react';
import GradesLayout from './GradesLayout';
import { gradesApi, errMsg, GRADES_LIST, SEMESTERS } from './gradesApi';

function ChangePasswordModal({ onClose }) {
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [newPwd2, setNewPwd2] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (newPwd.length < 4) return toast.error('كلمة المرور الجديدة قصيرة جداً');
    if (newPwd !== newPwd2) return toast.error('كلمتا المرور الجديدتان غير متطابقتين');
    setSaving(true);
    try {
      await gradesApi.post('/auth/change-password', { old_password: oldPwd, new_password: newPwd });
      toast.success('تم تغيير كلمة المرور بنجاح');
      onClose();
    } catch (e) { toast.error(errMsg(e, 'تعذر تغيير كلمة المرور — تأكد من كلمة المرور الحالية')); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--sub-overlay)' }} onClick={onClose}>
      <form onSubmit={submit} className="sub-card p-6 w-full max-w-sm sub-rise" onClick={(e) => e.stopPropagation()} data-testid="grades-change-password-modal">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-lg flex items-center gap-2" style={{ color: 'var(--sub-navy-ink)' }}>
            <KeyRound className="w-5 h-5" /> تغيير كلمة المرور
          </h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5" data-testid="grades-change-password-close"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--sub-muted)' }}>كلمة المرور الحالية</label>
            <input type="password" className="sub-input w-full" value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} required data-testid="grades-old-password-input" />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--sub-muted)' }}>كلمة المرور الجديدة</label>
            <input type="password" className="sub-input w-full" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} required data-testid="grades-new-password-input" />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--sub-muted)' }}>تأكيد كلمة المرور الجديدة</label>
            <input type="password" className="sub-input w-full" value={newPwd2} onChange={(e) => setNewPwd2(e.target.value)} required data-testid="grades-new-password-confirm-input" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" className="sub-btn sub-btn-ghost" onClick={onClose} data-testid="grades-change-password-cancel">إلغاء</button>
          <button type="submit" disabled={saving} className="sub-btn sub-btn-primary" data-testid="grades-change-password-submit">
            {saving ? 'جارٍ الحفظ...' : 'حفظ كلمة المرور'}
          </button>
        </div>
      </form>
    </div>
  );
}


function SemesterCard({ current, onChange }) {
  const [pending, setPending] = useState(null);
  return (
    <div className="sub-card p-5 mb-6 sub-rise" data-testid="grades-semester-card">
      <div className="flex items-center gap-2 mb-2">
        <CalendarRange className="w-5 h-5" style={{ color: 'var(--sub-navy)' }} />
        <h3 className="font-black" style={{ color: 'var(--sub-navy-ink)' }}>الفصل الدراسي الحالي</h3>
      </div>
      <p className="text-xs mb-4" style={{ color: 'var(--sub-muted)' }}>يُدخل المعلمون درجات الفصل المحدد فقط، وتعرض الإحصائيات ونتائج أولياء الأمور هذا الفصل فقط.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {SEMESTERS.map(s => (
          <button key={s.value} type="button" onClick={() => s.value !== current && setPending(s)}
            className="p-4 rounded-2xl text-right font-black transition-colors"
            style={s.value === current
              ? { background: 'var(--sub-navy)', color: 'var(--sub-on-navy)', border: '1px solid var(--sub-navy)' }
              : { background: 'var(--sub-surface-2)', color: 'var(--sub-navy-ink)', border: '1px solid var(--sub-line)' }}
            data-testid={`grades-semester-${s.value}`}>
            {s.label}
            <span className="block text-xs font-semibold mt-1 opacity-80">{s.value === current ? 'الفصل المفعّل حالياً' : 'اضغط للتفعيل'}</span>
          </button>
        ))}
      </div>
      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--sub-overlay)' }} onClick={() => setPending(null)}>
          <div className="sub-card p-6 w-full max-w-sm sub-rise" onClick={e => e.stopPropagation()} data-testid="grades-semester-confirm">
            <h3 className="font-black text-lg flex items-center gap-2" style={{ color: 'var(--sub-navy-ink)' }}><AlertTriangle className="w-5 h-5" style={{ color: 'var(--sub-amber-ink)' }} /> تأكيد تغيير الفصل</h3>
            <p className="text-sm mt-3" style={{ color: 'var(--sub-muted)' }}>سيتم التحويل إلى <b>{pending.label}</b>. سيُدخل المعلمون درجات هذا الفصل فقط، وستظهر نتائجه لأولياء الأمور. الدرجات السابقة لن تُحذف.</p>
            <div className="flex justify-end gap-2 mt-5">
              <button className="sub-btn sub-btn-ghost" onClick={() => setPending(null)} data-testid="grades-semester-cancel">إلغاء</button>
              <button className="sub-btn sub-btn-primary" onClick={() => { onChange(pending.value); setPending(null); }} data-testid="grades-semester-confirm-btn">تأكيد التغيير</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SubjectsCard({ config, onSave }) {
  const [list, setList] = useState(config);
  const [name, setName] = useState('');
  useEffect(() => setList(config), [config]);
  const add = () => {
    const n = name.trim();
    if (!n) return;
    if (list.some(c => c.name === n)) return toast.error('المادة موجودة مسبقاً');
    onSave([...list, { name: n, hidden: false }]);
    setName('');
  };
  const del = (n) => window.confirm(`حذف مادة «${n}»؟ لن تظهر في الإدخال والإحصائيات والنتائج.`) && onSave(list.filter(c => c.name !== n));
  const toggle = (n) => onSave(list.map(c => c.name === n ? { ...c, hidden: !c.hidden } : c));
  return (
    <div className="sub-card p-5 mb-6 sub-rise" data-testid="grades-subjects-card">
      <h3 className="font-black mb-1" style={{ color: 'var(--sub-navy-ink)' }}>إدارة المواد</h3>
      <p className="text-xs mb-4" style={{ color: 'var(--sub-muted)' }}>المادة المخفية لا تظهر في إدخال الدرجات ولا الإحصائيات ولا نتائج أولياء الأمور، ويمكن تفعيلها في أي وقت دون فقدان درجاتها.</p>
      <div className="flex gap-2 mb-4">
        <input className="sub-input flex-1" placeholder="اسم مادة جديدة" value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()} data-testid="grades-new-subject-input" />
        <button className="sub-btn sub-btn-primary sub-btn-sm" onClick={add} data-testid="grades-add-subject-btn"><Plus className="w-4 h-4" /> إضافة</button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {list.map((c, i) => (
          <div key={c.name} className="flex items-center gap-2 p-3 rounded-xl" data-testid={`grades-subject-row-${i}`}
            style={{ background: 'var(--sub-surface-2)', border: '1px solid var(--sub-line)', opacity: c.hidden ? 0.6 : 1 }}>
            <span className="font-bold text-sm flex-1" style={{ color: 'var(--sub-navy-ink)' }}>{c.name}</span>
            <span className={`sub-badge ${c.hidden ? 'sub-badge-gray' : 'sub-badge-green'}`}>{c.hidden ? 'مخفية' : 'مفعّلة'}</span>
            <button className="sub-btn sub-btn-ghost sub-btn-sm" onClick={() => toggle(c.name)} title={c.hidden ? 'تفعيل' : 'إخفاء'} data-testid={`grades-subject-toggle-${i}`}>
              {c.hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            <button className="sub-btn sub-btn-ghost sub-btn-sm" style={{ color: 'var(--sub-red-ink)' }} onClick={() => del(c.name)} data-testid={`grades-subject-delete-${i}`}>
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GradesSettings() {
  const [settings, setSettings] = useState({ site_closed: false, grades_locked: false, subjects: [], subjects_config: [] });
  const [gradeMax, setGradeMax] = useState({});
  const [maxGrade, setMaxGrade] = useState(GRADES_LIST[0]);
  const subjectMax = gradeMax[maxGrade] || {};
  const [savingMax, setSavingMax] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [showPwdModal, setShowPwdModal] = useState(false);

  const apply = (d) => { setSettings(d); setGradeMax(d.grade_subject_max || {}); };

  useEffect(() => {
    gradesApi.get('/settings').then(r => apply(r.data)).catch(e => toast.error(errMsg(e))).finally(() => setLoading(false));
  }, []);

  const put = async (body, msg) => {
    try {
      const res = await gradesApi.put('/settings', body);
      apply(res.data);
      if (msg) toast.success(msg);
    } catch (e) { toast.error(errMsg(e)); }
  };

  const setMax = (sub, key, value) => {
    setGradeMax(prev => {
      const g = prev[maxGrade] || {};
      return { ...prev, [maxGrade]: { ...g, [sub]: { ...(g[sub] || { quiz1: 10, quiz2: 10 }), [key]: value === '' ? 0 : Number(value) } } };
    });
  };

  const saveMax = async () => {
    setSavingMax(true);
    await put({ grade_subject_max: { [maxGrade]: subjectMax } }, `تم حفظ الدرجات العظمى للصف ${maxGrade}`);
    setSavingMax(false);
  };

  const toggleLock = async (key) => {
    setToggling(true);
    const closedMsg = { grades_locked: 'تم قفل كتابة الدرجات', parent_closed: 'تم إغلاق النتائج عن أولياء الأمور', site_closed: 'تم إغلاق النظام' };
    await put({ [key]: !settings[key] }, !settings[key] ? closedMsg[key] : (key === 'parent_closed' ? 'تم فتح النتائج لأولياء الأمور' : 'تم فتح النظام'));
    setToggling(false);
  };

  if (loading) return <GradesLayout><p className="text-center py-10" style={{ color: 'var(--sub-muted)' }}>جارٍ التحميل...</p></GradesLayout>;

  return (
    <GradesLayout title="الإعدادات" subtitle="إعدادات النظام والفصل الدراسي والمواد والدرجات العظمى">
      <SemesterCard current={settings.current_semester || '1'}
        onChange={(v) => put({ current_semester: v }, `تم تفعيل ${SEMESTERS.find(s => s.value === v)?.label}`)} />
      {/* لوحة التحكم في النظام */}
      <div className="sub-card p-5 mb-6 sub-rise" data-testid="grades-control-panel">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5" style={{ color: 'var(--sub-navy)' }} />
          <h3 className="font-black" style={{ color: 'var(--sub-navy-ink)' }}>التحكم في النظام</h3>
          <button onClick={() => setShowPwdModal(true)} className="sub-btn sub-btn-ghost sub-btn-sm mr-auto" data-testid="grades-open-change-password">
            <KeyRound className="w-4 h-4" /> تغيير كلمة المرور
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {/* فتح/غلق النظام */}
          <div className="p-4 rounded-2xl flex items-center justify-between gap-3"
            style={{ background: 'var(--sub-surface-2)', border: '1px solid var(--sub-line)' }}>
            <div>
              <p className="font-black text-sm" style={{ color: 'var(--sub-navy-ink)' }}>دخول المعلمين إلى النظام</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--sub-muted)' }}>
                {settings.site_closed ? 'النظام مغلق — لا يمكن للمعلمين تسجيل الدخول (المدير يستطيع)' : 'النظام مفتوح — يستطيع المعلمون تسجيل الدخول وإدخال الدرجات'}
              </p>
            </div>
            <button onClick={() => toggleLock('site_closed')} disabled={toggling}
              className="sub-btn sub-btn-sm flex-shrink-0"
              style={settings.site_closed ? { background: 'var(--sub-green-soft)', color: 'var(--sub-green-ink)', border: '1px solid var(--sub-green-line)' } : { background: 'var(--sub-red)', color: '#fff' }}
              data-testid="grades-toggle-site">
              {settings.site_closed ? <><Unlock className="w-4 h-4" /> فتح النظام</> : <><LockIcon className="w-4 h-4" /> غلق النظام</>}
            </button>
          </div>

          {/* قفل إدخال الدرجات */}
          <div className="p-4 rounded-2xl flex items-center justify-between gap-3"
            style={{ background: 'var(--sub-surface-2)', border: '1px solid var(--sub-line)' }}>
            <div>
              <p className="font-black text-sm" style={{ color: 'var(--sub-navy-ink)' }}>كتابة الدرجات</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--sub-muted)' }}>
                {settings.grades_locked ? 'الإدخال مقفول — لا يستطيع المعلمون تعديل الدرجات' : 'الإدخال مفتوح — يستطيع المعلمون إدخال الدرجات وتعديلها'}
              </p>
            </div>
            <button onClick={() => toggleLock('grades_locked')} disabled={toggling}
              className="sub-btn sub-btn-sm flex-shrink-0"
              style={settings.grades_locked ? { background: 'var(--sub-green-soft)', color: 'var(--sub-green-ink)', border: '1px solid var(--sub-green-line)' } : { background: 'var(--sub-red)', color: '#fff' }}
              data-testid="grades-toggle-lock">
              {settings.grades_locked ? <><Unlock className="w-4 h-4" /> فتح الإدخال</> : <><LockIcon className="w-4 h-4" /> قفل الإدخال</>}
            </button>
          </div>

          {/* إغلاق النتائج عن أولياء الأمور */}
          <div className="p-4 rounded-2xl flex items-center justify-between gap-3"
            style={{ background: 'var(--sub-surface-2)', border: '1px solid var(--sub-line)' }}>
            <div>
              <p className="font-black text-sm" style={{ color: 'var(--sub-navy-ink)' }}>دخول أولياء الأمور</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--sub-muted)' }}>
                {settings.parent_closed ? 'مغلق — لا يستطيع أولياء الأمور عرض النتائج' : 'مفتوح — يستطيع أولياء الأمور عرض نتائج أبنائهم'}
              </p>
            </div>
            <button onClick={() => toggleLock('parent_closed')} disabled={toggling}
              className="sub-btn sub-btn-sm flex-shrink-0"
              style={settings.parent_closed ? { background: 'var(--sub-green-soft)', color: 'var(--sub-green-ink)', border: '1px solid var(--sub-green-line)' } : { background: 'var(--sub-red)', color: '#fff' }}
              data-testid="grades-toggle-parent">
              {settings.parent_closed ? <><Unlock className="w-4 h-4" /> فتح للأولياء</> : <><LockIcon className="w-4 h-4" /> غلق عن الأولياء</>}
            </button>
          </div>
        </div>

        {/* روابط سريعة */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4" style={{ borderTop: '1px solid var(--sub-line)' }}>
          <Link to="/grades/teachers" className="sub-btn sub-btn-ghost sub-btn-sm" data-testid="grades-quick-teachers">إدارة المعلمين</Link>
          <Link to="/grades/students" className="sub-btn sub-btn-ghost sub-btn-sm" data-testid="grades-quick-students">إدارة الطلاب</Link>
          <Link to="/grades/stats" className="sub-btn sub-btn-ghost sub-btn-sm" data-testid="grades-quick-stats">الإحصائيات وكشف المتميزين</Link>
          <a href="/grades/parent" target="_blank" rel="noreferrer" className="sub-btn sub-btn-ghost sub-btn-sm" data-testid="grades-quick-parent">صفحة ولي الأمر</a>
        </div>

        {settings.site_closed && (
          <p className="text-xs mt-3 flex items-center gap-1.5" style={{ color: 'var(--sub-amber-ink)' }}>
            <AlertTriangle className="w-3.5 h-3.5" /> تذكير: النظام مغلق حالياً للمعلمين
          </p>
        )}
      </div>

      {/* الدرجات العظمى للمواد */}
      <div className="sub-card p-5 mb-6 sub-rise" data-testid="grades-subject-max-card">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <h3 className="font-black" style={{ color: 'var(--sub-navy-ink)' }}>الدرجات العظمى للاختبارات القصيرة (لكل صف ومادة)</h3>
          <select className="sub-input w-auto text-sm font-bold" value={maxGrade} onChange={(e) => setMaxGrade(e.target.value)} data-testid="grades-max-grade-select">
            {GRADES_LIST.map(g => <option key={g} value={g}>الصف {g}</option>)}
          </select>
          <button onClick={saveMax} disabled={savingMax} className="sub-btn sub-btn-primary sub-btn-sm mr-auto" data-testid="grades-save-subject-max">
            {savingMax ? 'جارٍ الحفظ...' : `حفظ درجات الصف ${maxGrade}`}
          </button>
        </div>
        <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--sub-line)' }}>
          <table className="sub-table">
            <thead><tr><th>م</th><th>المادة</th><th>اختبار قصير 1</th><th>اختبار قصير 2</th><th>المجموع</th></tr></thead>
            <tbody>
              {(settings.subjects || []).map((sub, i) => {
                const v = subjectMax[sub] || { quiz1: 10, quiz2: 10 };
                return (
                  <tr key={sub}>
                    <td>{i + 1}</td>
                    <td className="font-bold">{sub}</td>
                    <td><input type="number" min="0" max="100" step="0.5" className="sub-input w-24 text-center"
                      value={v.quiz1} onChange={(e) => setMax(sub, 'quiz1', e.target.value)} data-testid={`grades-max-q1-${i}`} /></td>
                    <td><input type="number" min="0" max="100" step="0.5" className="sub-input w-24 text-center"
                      value={v.quiz2} onChange={(e) => setMax(sub, 'quiz2', e.target.value)} data-testid={`grades-max-q2-${i}`} /></td>
                    <td className="font-black">{(Number(v.quiz1) || 0) + (Number(v.quiz2) || 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs mt-3" style={{ color: 'var(--sub-muted)' }}>اختر الصف ثم عدّل درجات مواده واحفظ — لكل صف درجات مستقلة. تُطبَّق هذه الحدود فوراً على إدخال المعلمين وعلى حساب «الدرجة النهائية» في الإحصائيات وكشف المتميزين ونتائج ولي الأمر.</p>
      </div>

      <SubjectsCard config={settings.subjects_config || []} onSave={(cfg) => put({ subjects_config: cfg }, 'تم حفظ المواد')} />
      {showPwdModal && <ChangePasswordModal onClose={() => setShowPwdModal(false)} />}
    </GradesLayout>
  );
}
