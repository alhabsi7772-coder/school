import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Layers } from 'lucide-react';
import { gradesApi, errMsg, GRADES_LIST, LEVEL_COLORS } from './gradesApi';

const SECTIONS = ['1', '2', '3', '4', '5', '6', '7', '8'];

export default function ClassStatsCard() {
  const [grade, setGrade] = useState(GRADES_LIST[0]);
  const [section, setSection] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    gradesApi.get('/class-stats', { params: section ? { grade, section } : { grade } })
      .then(r => setData(r.data)).catch(e => toast.error(errMsg(e)));
  }, [grade, section]);

  const subs = data?.subjects || [];
  return (
    <div className="sub-card p-5 mb-5 sub-rise" data-testid="grades-class-stats-card">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Layers className="w-5 h-5" style={{ color: 'var(--sub-navy)' }} />
        <h3 className="font-black" style={{ color: 'var(--sub-navy-ink)' }}>إحصائيات الصف — جميع المواد</h3>
        <span className="sub-badge sub-badge-gray">{data?.rows?.length ?? 0} طالب</span>
        <select className="sub-input w-auto mr-auto" value={grade} onChange={e => setGrade(e.target.value)} data-testid="grades-class-stats-grade">
          {GRADES_LIST.map(g => <option key={g} value={g}>الصف {g}</option>)}
        </select>
        <select className="sub-input w-auto" value={section} onChange={e => setSection(e.target.value)} data-testid="grades-class-stats-section">
          <option value="">كل الشعب</option>
          {SECTIONS.map(s => <option key={s} value={s}>شعبة {s}</option>)}
        </select>
      </div>
      {!data?.rows?.length ? (
        <p className="text-center py-8 text-sm" style={{ color: 'var(--sub-muted)' }}>لا يوجد طلاب في هذا الاختيار</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--sub-line)' }}>
          <table className="sub-table">
            <thead>
              <tr>
                <th>الترتيب</th><th>اسم الطالب</th><th>الشعبة</th>
                {subs.map(s => <th key={s} className="text-xs">{s}<br /><span className="text-[10px] font-normal" style={{ color: 'var(--sub-muted)' }}>(من {data.subject_max[s]})</span></th>)}
                <th>المجموع</th><th>النسبة</th><th>المستوى</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r, i) => (
                <tr key={r.id} data-testid={`grades-class-stats-row-${i}`}>
                  <td className="font-black">{r.rank ?? '—'}</td>
                  <td className="font-bold">{r.name}</td>
                  <td>{r.section}</td>
                  {subs.map(s => <td key={s}>{r.marks[s] ?? '—'}</td>)}
                  <td className="font-black">{r.max ? `${r.total} / ${r.max}` : '—'}</td>
                  <td className="font-black" style={{ color: 'var(--sub-navy-ink)' }}>{r.pct != null ? `${r.pct}%` : '—'}</td>
                  <td>{r.level ? <span className="sub-badge" style={{ background: LEVEL_COLORS[r.level], color: '#0b1220' }}>{r.level}</span> : '—'}</td>
                </tr>
              ))}
              <tr style={{ background: 'var(--sub-surface-2)' }}>
                <td colSpan={3} className="font-black">متوسط المادة</td>
                {subs.map(s => <td key={s} className="font-bold">{data.subject_avg[s]}</td>)}
                <td colSpan={3}></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
