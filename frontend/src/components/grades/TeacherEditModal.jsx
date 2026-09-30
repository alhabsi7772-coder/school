import { useState } from 'react';
import { X } from 'lucide-react';
import { GRADES_LIST, SUBJECTS, GRADE_NUM } from './gradesApi';

const SECTIONS = ['1', '2', '3', '4', '5', '6', '7', '8'];

function ClassPicker({ classes, onChange }) {
  const has = (g, s) => classes.some((c) => c.grade === g && String(c.section) === s);
  const toggle = (g, s) => onChange(has(g, s)
    ? classes.filter((c) => !(c.grade === g && String(c.section) === s))
    : [...classes, { grade: g, section: s }]);

  return (
    <div className="space-y-2" data-testid="teacher-class-picker">
      {GRADES_LIST.map((g) => (
        <div key={g} className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold w-14" style={{ color: 'var(--sub-muted)' }}>{g}</span>
          {SECTIONS.map((s) => (
            <button key={s} type="button" onClick={() => toggle(g, s)}
              className="sub-badge"
              style={{ cursor: 'pointer', minWidth: 42, justifyContent: 'center', border: '1px solid var(--sub-line)', background: has(g, s) ? 'var(--sub-navy)' : 'transparent', color: has(g, s) ? '#fff' : 'var(--sub-muted)', transition: 'background-color .15s, color .15s' }}
              data-testid={`class-toggle-${GRADE_NUM[g]}-${s}`}>
              {GRADE_NUM[g]}/{s}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function TeacherEditModal({ teacher, title, onClose, onSave }) {
  const [form, setForm] = useState({
    name: teacher.name || '', subject: teacher.subject || '',
    employee_number: teacher.employee_number || '', civil_number: teacher.civil_number || '',
    classes: teacher.classes || [],
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--sub-overlay)' }} onClick={onClose}>
      <form onSubmit={submit} className="sub-card p-6 w-full max-w-2xl sub-rise space-y-4 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} data-testid="teacher-edit-modal">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-lg" style={{ color: 'var(--sub-navy-ink)' }}>{title}</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5" data-testid="teacher-edit-close"><X className="w-4 h-4" /></button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input className="sub-input sm:col-span-2" placeholder="اسم المعلم" required value={form.name} onChange={set('name')} data-testid="teacher-edit-name" />
          <select className="sub-input" value={form.subject} onChange={set('subject')} data-testid="teacher-edit-subject">
            <option value="">— المادة —</option>
            {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input className="sub-input" placeholder="الرقم الوظيفي" value={form.employee_number} onChange={set('employee_number')} data-testid="teacher-edit-emp" />
          <input className="sub-input" placeholder="الرقم المدني" value={form.civil_number} onChange={set('civil_number')} data-testid="teacher-edit-civil" />
        </div>
        <div>
          <p className="text-xs font-bold mb-2" style={{ color: 'var(--sub-muted)' }}>الصفوف ({form.classes.length})</p>
          <ClassPicker classes={form.classes} onChange={(classes) => setForm({ ...form, classes })} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="sub-btn sub-btn-ghost" onClick={onClose}>إلغاء</button>
          <button type="submit" disabled={saving} className="sub-btn sub-btn-primary" data-testid="teacher-edit-save">{saving ? 'جارٍ الحفظ...' : 'حفظ'}</button>
        </div>
      </form>
    </div>
  );
}
