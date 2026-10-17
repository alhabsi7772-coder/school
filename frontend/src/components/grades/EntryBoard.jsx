import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, XCircle, Clock, CheckCircle2 } from 'lucide-react';
import { GRADE_NUM } from './gradesApi';

const COLS = [
  { key: 'none', title: 'لم يبدأ', icon: XCircle, ink: 'var(--sub-red-ink)', soft: 'var(--sub-red-soft)', line: 'var(--sub-red-line)', bar: 'var(--sub-red)' },
  { key: 'partial', title: 'بدأ ولم يكمل', icon: Clock, ink: 'var(--sub-amber-ink)', soft: 'var(--sub-amber-soft)', line: 'var(--sub-amber-line)', bar: 'var(--sub-amber)' },
  { key: 'done', title: 'أكمل', icon: CheckCircle2, ink: 'var(--sub-green-ink)', soft: 'var(--sub-green-soft)', line: 'var(--sub-green-line)', bar: 'var(--sub-green)' },
];

const statusOf = (t) => (!t.complete ? 'none' : t.complete >= t.expected ? 'done' : 'partial');
const pctOf = (t) => (t.expected ? Math.round((t.complete / t.expected) * 100) : 0);

function TeacherCard({ t, col }) {
  const pct = pctOf(t);
  return (
    <div className="p-3 rounded-xl" style={{ background: 'var(--sub-surface)', border: `1px solid ${col.line}` }} data-testid={`entry-card-${t.id}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-black text-sm truncate" style={{ color: 'var(--sub-navy-ink)' }}>{t.name}</p>
          <p className="text-xs font-semibold" style={{ color: 'var(--sub-muted)' }}>{t.subject || '—'}</p>
        </div>
        <span className="font-black text-sm" style={{ color: col.ink }}>{pct}%</span>
      </div>
      <div className="w-full h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: 'var(--sub-surface-2)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: col.bar }} />
      </div>
      <p className="text-[11px] mt-1 font-semibold" style={{ color: 'var(--sub-muted)' }}>{t.complete} من {t.expected} درجة</p>
      {t.pending?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {t.pending.map((p, k) => (
            <span key={k} className="sub-badge sub-badge-gray" style={{ fontSize: 10 }} title={`ناقص ${p.missing} من ${p.students}`}>
              {GRADE_NUM[p.grade] || p.grade}/{p.section} · ناقص {p.missing}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EntryBoard({ teachers = [] }) {
  const [q, setQ] = useState('');
  const { groups, noClasses } = useMemo(() => {
    const term = q.trim();
    const list = teachers.filter(t => !term || t.name.includes(term) || (t.subject || '').includes(term));
    const g = { none: [], partial: [], done: [] };
    list.filter(t => t.expected > 0).forEach(t => g[statusOf(t)].push(t));
    return { groups: g, noClasses: list.filter(t => !t.expected).length };
  }, [teachers, q]);

  return (
    <div className="sub-card p-5 sub-rise" data-testid="grades-entry-board">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <h3 className="font-black" style={{ color: 'var(--sub-navy-ink)' }}>متابعة إدخال الدرجات — الفصل الحالي</h3>
        <div className="relative mr-auto">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--sub-muted)' }} />
          <input className="sub-input" style={{ width: 240, paddingRight: 36 }} placeholder="بحث باسم المعلم أو المادة" value={q} onChange={e => setQ(e.target.value)} data-testid="entry-board-search" />
        </div>
        <Link to="/grades/teachers" className="sub-btn sub-btn-ghost sub-btn-sm">إدارة المعلمين</Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {COLS.map(col => (
          <div key={col.key} className="rounded-2xl p-3" style={{ background: col.soft, border: `1px solid ${col.line}` }} data-testid={`entry-col-${col.key}`}>
            <div className="flex items-center gap-2 mb-3 px-1">
              <col.icon className="w-5 h-5" style={{ color: col.ink }} />
              <span className="font-black" style={{ color: col.ink }}>{col.title}</span>
              <span className="sub-badge mr-auto font-black" style={{ background: 'var(--sub-surface)', color: col.ink }} data-testid={`entry-count-${col.key}`}>{groups[col.key].length}</span>
            </div>
            <div className="space-y-2 max-h-[520px] overflow-y-auto">
              {groups[col.key].map((t, i, arr) => (
                <div key={t.id}>
                  {(i === 0 || arr[i - 1].subject !== t.subject) && (
                    <p className="text-[11px] font-black px-1 pt-1 pb-1" style={{ color: col.ink }} data-testid={`entry-subject-${col.key}-${i}`}>{t.subject || 'بدون مادة'}</p>
                  )}
                  <TeacherCard t={t} col={col} />
                </div>
              ))}
              {groups[col.key].length === 0 && <p className="text-center text-xs py-6 font-semibold" style={{ color: col.ink, opacity: 0.7 }}>لا يوجد</p>}
            </div>
          </div>
        ))}
      </div>
      {noClasses > 0 && (
        <p className="text-xs mt-3 font-semibold" style={{ color: 'var(--sub-muted)' }} data-testid="entry-board-noclasses">
          {noClasses} معلم بدون صفوف مسجّلة (غير محسوبين) — أضف صفوفهم من صفحة المعلمين
        </p>
      )}
    </div>
  );
}
