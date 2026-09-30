import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { KeyRound, Clock, Image as ImageIcon, Save, Upload, School, Sun, Moon, Sparkles, AlertOctagon, Trash2 } from 'lucide-react';
import SubLayout from './SubLayout';
import { subApi, errMsg } from './subApi';
import { useSubTheme } from './subTheme';

const PERIOD_NAMES = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة', 'السابعة', 'الثامنة'];

function AccountCard() {
  const [f, setF] = useState({ username: '', new_password: '', confirm: '', current_password: '' });
  const [busy, setBusy] = useState(false);
  useEffect(() => { subApi.get('/auth/me').then((r) => setF((x) => ({ ...x, username: r.data.username }))).catch(() => {}); }, []);
  const save = async (e) => {
    e.preventDefault();
    if (f.new_password && f.new_password !== f.confirm) return toast.error('تأكيد كلمة المرور غير متطابق');
    setBusy(true);
    try {
      const r = await subApi.put('/auth/account', { current_password: f.current_password, username: f.username, new_password: f.new_password || null });
      localStorage.setItem('subToken', r.data.token);
      toast.success('تم تحديث بيانات الدخول');
      setF({ ...f, new_password: '', confirm: '', current_password: '' });
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={save} className="sub-card p-5 space-y-4 sub-rise" data-testid="sub-account-card">
      <div className="sub-card-title"><span className="ic" style={{ background: 'var(--sub-amber-soft)' }}><KeyRound className="w-4 h-4" style={{ color: 'var(--sub-amber)' }} /></span> بيانات الدخول</div>
      <div>
        <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--sub-muted)' }}>اسم المستخدم</label>
        <input className="sub-input" dir="ltr" style={{ textAlign: 'left' }} value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} required minLength={3} data-testid="sub-acc-username" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--sub-muted)' }}>كلمة المرور الجديدة (اختياري)</label>
          <input type="password" className="sub-input" value={f.new_password} onChange={(e) => setF({ ...f, new_password: e.target.value })} minLength={6} data-testid="sub-acc-newpwd" />
        </div>
        <div>
          <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--sub-muted)' }}>تأكيد كلمة المرور الجديدة</label>
          <input type="password" className="sub-input" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} data-testid="sub-acc-confirm" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--sub-red-ink)' }}>كلمة المرور الحالية (مطلوبة للتأكيد)</label>
        <input type="password" className="sub-input" value={f.current_password} onChange={(e) => setF({ ...f, current_password: e.target.value })} required data-testid="sub-acc-current" />
      </div>
      <button className="sub-btn sub-btn-primary" disabled={busy} data-testid="sub-acc-save"><Save className="w-4 h-4" /> حفظ بيانات الدخول</button>
    </form>
  );
}

function TimingCard({ cfg, reload }) {
  const [times, setTimes] = useState(cfg.period_times);
  const [school, setSchool] = useState(cfg.school_name);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef();
  useEffect(() => { setTimes(cfg.period_times); setSchool(cfg.school_name); }, [cfg]);
  const save = async () => {
    setBusy(true);
    try { await subApi.put('/settings', { period_times: times, school_name: school }); toast.success('تم حفظ التوقيت'); reload(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const upload = async (file) => {
    if (!file) return;
    const fd = new FormData(); fd.append('file', file);
    try {
      const r = await subApi.post('/settings/timing', fd);
      toast.success(r.data.detected_times?.length >= 8 ? 'تم رفع التوقيت والتعرف على أوقات الحصص' : 'تم رفع صورة التوقيت — عدّل الأوقات يدوياً إن لزم');
      reload();
    } catch (e) { toast.error(errMsg(e)); } finally { if (fileRef.current) fileRef.current.value = ''; }
  };
  return (
    <div className="sub-card p-5 space-y-4 sub-rise sub-rise-2" data-testid="sub-timing-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="sub-card-title"><span className="ic" style={{ background: 'var(--sub-navy-soft)' }}><Clock className="w-4 h-4" style={{ color: 'var(--sub-navy-ink)' }} /></span> التوقيت المدرسي</div>
        <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => upload(e.target.files?.[0])} data-testid="sub-timing-input" />
        <button className="sub-btn sub-btn-ghost sub-btn-sm" onClick={() => fileRef.current?.click()} data-testid="sub-timing-upload"><Upload className="w-3.5 h-3.5" /> رفع صورة/PDF التوقيت</button>
      </div>
      <div>
        <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--sub-muted)' }}><School className="w-3.5 h-3.5 inline ml-1" />اسم المدرسة (يظهر في ورقة التوزيع)</label>
        <input className="sub-input" value={school} onChange={(e) => setSchool(e.target.value)} data-testid="sub-school-name" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          {times.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-16 text-xs font-bold" style={{ color: 'var(--sub-muted)' }}>{PERIOD_NAMES[i]}</span>
              <input className="sub-input py-1.5 text-center" dir="ltr" value={p.from} onChange={(e) => setTimes(times.map((x, j) => (j === i ? { ...x, from: e.target.value } : x)))} data-testid={`sub-time-from-${i + 1}`} />
              <span className="text-xs" style={{ color: 'var(--sub-muted)' }}>إلى</span>
              <input className="sub-input py-1.5 text-center" dir="ltr" value={p.to} onChange={(e) => setTimes(times.map((x, j) => (j === i ? { ...x, to: e.target.value } : x)))} data-testid={`sub-time-to-${i + 1}`} />
            </div>
          ))}
          <button className="sub-btn sub-btn-primary sub-btn-sm mt-2" onClick={save} disabled={busy} data-testid="sub-timing-save"><Save className="w-3.5 h-3.5" /> حفظ التوقيت</button>
        </div>
        <div className="rounded-2xl overflow-hidden border flex items-center justify-center min-h-[220px]" style={{ borderColor: 'var(--sub-line)', background: 'var(--sub-surface-2)' }} data-testid="sub-timing-preview">
          {cfg.timing_file ? (
            cfg.timing_file.includes('.pdf') ? (
              <a href={`${process.env.REACT_APP_BACKEND_URL}${cfg.timing_file}`} target="_blank" rel="noreferrer" className="sub-btn sub-btn-ghost sub-btn-sm">عرض ملف التوقيت (PDF)</a>
            ) : (
              <img src={`${process.env.REACT_APP_BACKEND_URL}${cfg.timing_file}`} alt="التوقيت المدرسي" className="w-full h-auto object-contain max-h-[420px]" />
            )
          ) : (
            <div className="text-center p-6" style={{ color: 'var(--sub-muted)' }}><ImageIcon className="w-8 h-8 mx-auto mb-2" /><p className="text-xs font-bold">لم تُرفع صورة التوقيت بعد</p></div>
          )}
        </div>
      </div>
    </div>
  );
}

function ThemeCard() {
  const [theme, setTheme] = useSubTheme();
  const opts = [['light', Sun, 'نهاري', 'ورقي فاتح هادئ'], ['dark', Moon, 'ليلي', 'كحلي داكن مريح للعين'], ['lux', Sparkles, 'لوكس AI', 'أسود زجاجي بجسيمات زمردية']];
  return (
    <div className="sub-card p-5 sub-rise sub-rise-3" data-testid="sub-theme-card">
      <div className="sub-card-title mb-4"><span className="ic" style={{ background: 'var(--sub-green-soft)' }}><Sparkles className="w-4 h-4" style={{ color: 'var(--sub-green-ink)' }} /></span> مظهر النظام</div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {opts.map(([k, Icon, l, d]) => (
          <button key={k} type="button" onClick={() => setTheme(k)} className="sub-period text-right" style={{ padding: '1rem', borderColor: theme === k ? 'var(--sub-navy)' : undefined, boxShadow: theme === k ? '0 0 0 3px var(--sub-navy-soft)' : undefined }} data-testid={`sub-theme-card-${k}`}>
            <Icon className="w-5 h-5 mb-2" style={{ color: 'var(--sub-navy-ink)' }} />
            <div className="font-black text-sm" style={{ color: 'var(--sub-ink)' }}>{l}</div>
            <div className="text-xs mt-1 font-semibold" style={{ color: 'var(--sub-muted)' }}>{d}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function DangerZoneCard() {
  const [busy, setBusy] = useState(false);
  const reset = async () => {
    const typed = window.prompt('سيتم حذف جميع سجلات الغياب والتوزيع والإحصائيات بشكل نهائي (لن يتم حذف قائمة المعلمين أو الإعدادات).\nهذا الإجراء لا يمكن التراجع عنه. اكتب كلمة "تصفير" للتأكيد:');
    if (typed === null) return;
    if (typed.trim() !== 'تصفير') return toast.error('لم يتم التأكيد بشكل صحيح — لم يُصفَّر أي شيء');
    setBusy(true);
    try {
      const r = await subApi.delete('/system/reset');
      toast.success(r.data.message || 'تم تصفير النظام');
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <div className="sub-card p-5 space-y-3 sub-rise sub-rise-3" style={{ borderColor: 'var(--sub-red-line)' }} data-testid="sub-danger-card">
      <div className="sub-card-title" style={{ color: 'var(--sub-red-ink)' }}>
        <span className="ic" style={{ background: 'var(--sub-red-soft)' }}><AlertOctagon className="w-4 h-4" style={{ color: 'var(--sub-red-ink)' }} /></span>
        منطقة الخطر
      </div>
      <p className="text-xs font-semibold" style={{ color: 'var(--sub-muted)' }}>
        تصفير النظام يحذف نهائياً كل سجلات الغياب والتوزيع والإحصائيات من البداية، دون التأثير على قائمة المعلمين أو إعدادات التوقيت. هذا الإجراء لا يمكن التراجع عنه.
      </p>
      <button className="sub-btn sub-btn-danger" onClick={reset} disabled={busy} data-testid="sub-system-reset-btn">
        <Trash2 className="w-4 h-4" /> {busy ? 'جارٍ التصفير...' : 'تصفير النظام من البداية'}
      </button>
    </div>
  );
}

export default function SubSettings() {
  const [cfg, setCfg] = useState(null);
  const load = () => subApi.get('/settings').then((r) => setCfg(r.data)).catch((e) => toast.error(errMsg(e)));
  useEffect(() => { load(); }, []);
  return (
    <SubLayout title="الإعدادات" subtitle="بيانات الدخول، التوقيت المدرسي، ومظهر النظام">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <AccountCard />
        <ThemeCard />
        <div className="xl:col-span-2">{cfg && <TimingCard cfg={cfg} reload={load} />}</div>
        <div className="xl:col-span-2"><DangerZoneCard /></div>
      </div>
    </SubLayout>
  );
}
