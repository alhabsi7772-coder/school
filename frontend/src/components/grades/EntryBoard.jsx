import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, LayoutList, BookOpen } from 'lucide-react';
import { GRADE_NUM } from './gradesApi';

const ST = {
  none: { label: 'لم يبدأ', ink: 'var(--sub-red-ink)', bar: 'var(--sub-red)', soft: 'var(--sub-red-soft)' },
  partial: { label: 'ناقص', ink: 'var(--sub-amber-ink)', bar: 'var(--sub-amber)', soft: 'var(--sub-amber-soft)' },
  done: { label: 'أكمل', ink: 'var(--sub-green-ink)', bar: 'var(--sub-green)', soft: 'var(--sub-green-soft)' },
};

const statusOf = (t) => (!t.complete ? 'none' : t.complete >= t.expected ? 'done' : 'partial');
const pctOf = (c, e) => (e ? Math.round((c / e) * 100) : 0);
const barColor = (p) => (p >= 100 ? ST.done.bar : p > 0 ? ST.partial.bar : ST.none.bar);

const Dot = ({ s }) => <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ST[s].bar }} />;

const Bar = ({ pct }) => (
  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--sub-surface-2)' }}>
    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor(pct) }} />
  </div>
);

const Missing = ({ t }) => (
  <div className="flex flex-wrap gap-1">
    {(t.pending || []).map((p, k) => (
      <span key={k} className="sub-badge sub-badge-gray" style={{ fontSize: 10 }}>{GRADE_NUM[p.grade] || p.grade}/{p.section} · ناقص {p.missing}</span>
    ))}
  </div>
);

function TeacherRow({ t, showSubject, tid }) {
  const s = statusOf(t), pct = pctOf(t.complete, t.expected);
  return (
    <div className="grid items-center gap-3 px-3 py-2.5 rounded-xl" data-testid={tid}
      style={{ gridTemplateColumns: showSubject ? '1.4fr 1fr 1.4fr 56px 1.6fr' : '1.4fr 1.4fr 56px 1.6fr', background: 'var(--sub-surface)', border: '1px solid var(--sub-line)' }}>
      <span className="flex items-center gap-2 font-bold text-sm min-w-0" style={{ color: 'var(--sub-navy-ink)' }}><Dot s={s} /><span className="truncate">{t.name}</span></span>
      {showSubject && <span className="text-xs font-semibold truncate" style={{ color: 'var(--sub-muted)' }}>{t.subject || '—'}</span>}
      <Bar pct={pct} />
      <span className="font-black text-sm text-center" style={{ color: ST[s].ink }}>{pct}%</span>
      <Missing t={t} />
    </div>
  );
}

function SubjectView({ list }) {
  const [open, setOpen] = useState(null);
  const rows = useMemo(() => {
    const m = {};
    list.forEach(t => {
      const k = t.subject || 'بدون مادة';
      const r = m[k] || (m[k] = { subject: k, teachers: [], complete: 0, expected: 0, none: 0, partial: 0, done: 0 });
      r.teachers.push(t); r.complete += t.complete; r.expected += t.expected; r[statusOf(t)] += 1;
    });
    const out = Object.values(m);
    out.forEach(r => r.teachers.sort((a, b) => pctOf(a.complete, a.expected) - pctOf(b.complete, b.expected)));
    return out;
  }, [list]);

  return (
    <div className="space-y-2">
      {rows.map((r, i) => {
        const pct = pctOf(r.complete, r.expected), isOpen = open === r.subject;
        return (
          <div key={r.subject} className="rounded-2xl" style={{ border: '1px solid var(--sub-line)', background: 'var(--sub-surface-2)' }}>
            <button type="button" onClick={() => setOpen(isOpen ? null : r.subject)} data-testid={`entry-subject-row-${i}`}
              className="w-full grid items-center gap-3 p-3 text-right" style={{ gridTemplateColumns: '1.3fr 2fr 56px auto 20px' }}>
              <span className="font-black text-sm" style={{ color: 'var(--sub-navy-ink)' }}>{r.subject} <span className="text-xs font-semibold" style={{ color: 'var(--sub-muted)' }}>({r.teachers.length})</span></span>
              <Bar pct={pct} />
              <span className="font-black text-sm text-center" style={{ color: 'var(--sub-navy-ink)' }}>{pct}%</span>
              <span className="flex gap-1">
                {['done', 'partial', 'none'].map(k => (
                  <span key={k} className="sub-badge font-black" style={{ background: ST[k].soft, color: ST[k].ink, fontSize: 11 }}>{ST[k].label} {r[k]}</span>
                ))}
              </span>
              <ChevronDown className="w-4 h-4 transition-transform" style={{ color: 'var(--sub-muted)', transform: isOpen ? 'rotate(180deg)' : 'none' }} />
            </button>
            {isOpen && (
              <div className="px-3 pb-3 space-y-1.5" data-testid={`entry-subject-teachers-${i}`}>
                {r.teachers.map(t => <TeacherRow key={t.id} t={t} tid={`entry-subject-teacher-${t.id}`} />)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ListView({ list }) {
  const [filter, setFilter] = useState('all');
  const counts = useMemo(() => list.reduce((c, t) => ({ ...c, [statusOf(t)]: c[statusOf(t)] + 1 }), { none: 0, partial: 0, done: 0 }), [list]);
  const rows = useMemo(() => list.filter(t => filter === 'all' || statusOf(t) === filter)
    .sort((a, b) => pctOf(a.complete, a.expected) - pctOf(b.complete, b.expected)), [list, filter]);
  const FILTERS = [{ k: 'all', label: 'الكل', n: list.length }, ...['none', 'partial', 'done'].map(k => ({ k, label: ST[k].label, n: counts[k] }))];

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-3">
        {FILTERS.map(f => (
          <button key={f.k} type="button" onClick={() => setFilter(f.k)} data-testid={`entry-filter-${f.k}`}
            className="sub-btn sub-btn-sm"
            style={filter === f.k ? { background: f.k === 'all' ? 'var(--sub-navy)' : ST[f.k].bar, color: '#fff' } : { background: 'var(--sub-surface-2)', color: f.k === 'all' ? 'var(--sub-navy-ink)' : ST[f.k].ink, border: '1px solid var(--sub-line)' }}>
            {f.k !== 'all' && <Dot s={f.k} />} {f.label} <span className="font-black">{f.n}</span>
          </button>
        ))}
      </div>
      <div className="space-y-1.5 max-h-[560px] overflow-y-auto">
        {rows.map(t => <TeacherRow key={t.id} t={t} showSubject tid={`entry-list-row-${t.id}`} />)}
        {rows.length === 0 && <p className="text-center text-sm py-6" style={{ color: 'var(--sub-muted)' }}>لا يوجد معلمون</p>}
      </div>
    </>
  );
}

export default function EntryBoard({ teachers = [] }) {
  const [view, setView] = useState('subject');
  const list = useMemo(() => teachers.filter(t => t.expected > 0), [teachers]);
  const noClasses = teachers.length - list.length;
  const TABS = [{ k: 'subject', label: 'حسب المادة', icon: BookOpen }, { k: 'list', label: 'قائمة المعلمين', icon: LayoutList }];

  return (
    <div className="sub-card p-5 sub-rise" data-testid="grades-entry-board">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <h3 className="font-black" style={{ color: 'var(--sub-navy-ink)' }}>متابعة إدخال الدرجات — الفصل الحالي</h3>
        <div className="flex gap-1 p-1 rounded-xl mr-auto" style={{ background: 'var(--sub-surface-2)', border: '1px solid var(--sub-line)' }}>
          {TABS.map(tb => (
            <button key={tb.k} type="button" onClick={() => setView(tb.k)} data-testid={`entry-view-${tb.k}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-colors"
              style={view === tb.k ? { background: 'var(--sub-navy)', color: 'var(--sub-on-navy)' } : { color: 'var(--sub-muted)' }}>
              <tb.icon className="w-4 h-4" /> {tb.label}
            </button>
          ))}
        </div>
        <Link to="/grades/teachers" className="sub-btn sub-btn-ghost sub-btn-sm">إدارة المعلمين</Link>
      </div>
      {list.length === 0
        ? <p className="text-center text-sm py-8" style={{ color: 'var(--sub-muted)' }} data-testid="entry-board-empty">لا يوجد معلمون مرتبطون بصفوف بعد</p>
        : view === 'subject' ? <SubjectView list={list} /> : <ListView list={list} />}
      {noClasses > 0 && (
        <p className="text-xs mt-3 font-semibold" style={{ color: 'var(--sub-muted)' }} data-testid="entry-board-noclasses">
          {noClasses} معلم بدون صفوف مسجّلة (غير محسوبين) — أضف صفوفهم من صفحة المعلمين
        </p>
      )}
    </div>
  );
}
