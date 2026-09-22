import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Send, X, Plus, ClipboardList, ArrowLeft, Trash2, Users, Link2 } from 'lucide-react';
import { API, getAuthHeaders } from '../../utils';
import { themeOfGrade } from '../../utils/gradebook';
import SessionManager from './SessionManager';

const semLabel = (s) => (s === '2' ? 'الفصل الثاني' : 'الفصل الأول');
const statusLabel = (s) => s === 'released' ? 'تم الإرسال' : s === 'closed' ? 'مُغلقة' : 'مفتوحة';
const statusColor = (s) => s === 'released' ? '#34D399' : s === 'closed' ? '#94A3B8' : '#FBBF24';

export default function ReleaseGradesButton() {
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeSid, setActiveSid] = useState(null);
  const [creating, setCreating] = useState(false);
  const [rubrics, setRubrics] = useState([]);
  const [gradebooks, setGradebooks] = useState([]);
  const [rubricId, setRubricId] = useState('');
  const [gbId, setGbId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/grade-sessions`, getAuthHeaders());
      setSessions(r.data);
    } catch { toast.error('تعذر تحميل الجلسات'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (open) fetchSessions();
  }, [open]);

  // polling خفيف عند فتح المودال
  useEffect(() => {
    if (!open || activeSid || creating) return undefined;
    const t = setInterval(fetchSessions, 5000);
    return () => clearInterval(t);
  }, [open, activeSid, creating]);

  const openCreate = async () => {
    setCreating(true);
    try {
      const [rs, gs] = await Promise.all([
        axios.get(`${API}/rubrics`, getAuthHeaders()),
        axios.get(`${API}/gradebooks`, getAuthHeaders()),
      ]);
      setRubrics(rs.data.filter(r => r.column !== 'none'));
      setGradebooks(gs.data);
      const firstR = rs.data[0];
      if (firstR) {
        setRubricId(firstR.id);
        // اختيار أول سجل من نفس صف البطاقة افتراضياً
        const match = firstR.grade ? gs.data.find(g => g.grade === firstR.grade) : gs.data[0];
        if (match) setGbId(match.id);
        else setGbId('');
      } else if (gs.data.length) setGbId(gs.data[0].id);
    } catch { toast.error('تعذر تحميل البيانات'); setCreating(false); }
  };

  // عند اختيار بطاقة جديدة، إعادة ضبط السجل تلقائياً ليطابق صف البطاقة
  const pickRubric = (r) => {
    setRubricId(r.id);
    if (r.grade) {
      const match = gradebooks.find(g => g.grade === r.grade);
      setGbId(match ? match.id : '');
    }
  };

  const selRubric = rubrics.find(r => r.id === rubricId);
  const filteredGbs = selRubric?.grade ? gradebooks.filter(g => g.grade === selRubric.grade) : gradebooks;

  const submitCreate = async () => {
    if (!rubricId) return toast.error('اختر بطاقة التقييم');
    if (!gbId) return toast.error('اختر السجل');
    setSubmitting(true);
    try {
      const r = await axios.post(`${API}/grade-sessions`, { rubric_id: rubricId, gradebook_id: gbId }, getAuthHeaders());
      toast.success('تم إنشاء الجلسة — شارك الرابط مع الطلاب');
      setCreating(false);
      setActiveSid(r.data.id);
      fetchSessions();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'تعذر الإنشاء');
    } finally { setSubmitting(false); }
  };

  const deleteSession = async (sid) => {
    if (!window.confirm('حذف الجلسة نهائياً؟')) return;
    try {
      await axios.delete(`${API}/grade-sessions/${sid}`, getAuthHeaders());
      toast.success('تم الحذف');
      fetchSessions();
    } catch { toast.error('تعذر الحذف'); }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} data-testid="release-grades-btn"
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.02]"
        style={{ background: 'rgba(52,211,153,0.1)', color: '#34D399', border: '1px solid rgba(52,211,153,0.25)' }}>
        <Send className="w-4 h-4" />
        إرسال الدرجات للطلاب
      </button>

      {open && !activeSid && !creating && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-4 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="glass-modal rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-5 md:p-6 border-b border-white/10 flex items-start justify-between flex-shrink-0">
              <div className="flex-1">
                <h3 className="font-bold text-white text-lg mb-1">جلسات إرسال الدرجات</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-hint)' }}>
                  أنشئ جلسة لنشاط واحد → شارك الرابط مع الطلاب → طابق أسماءهم بالسجل → ثم أرسل الدرجات
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 hover:bg-white/5 rounded-xl flex-shrink-0 mr-3" data-testid="release-close-btn">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 p-5 md:p-6 space-y-4">
              <button onClick={openCreate} data-testid="session-create-btn"
                className="btn-primary w-full flex items-center justify-center gap-2 py-3">
                <Plus className="w-4 h-4" />
                إنشاء جلسة جديدة
              </button>

              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="w-7 h-7 border-2 rounded-full animate-spin"
                    style={{ borderColor: 'rgba(var(--theme-accent-rgb),0.2)', borderTopColor: 'var(--theme-accent)' }} />
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-10">
                  <ClipboardList className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-hint)' }} />
                  <p className="text-white font-bold mb-1">لا توجد جلسات بعد</p>
                  <p className="text-xs" style={{ color: 'var(--text-hint)' }}>اضغط «إنشاء جلسة جديدة» للبدء</p>
                </div>
              ) : (
                <div className="space-y-3" data-testid="sessions-list">
                  {sessions.map(s => (
                    <div key={s.id} data-testid={`session-row-${s.code}`}
                      className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 transition-all hover:bg-white/5 cursor-pointer"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
                      onClick={() => setActiveSid(s.id)}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-black tracking-wider"
                            style={{ background: 'rgba(var(--theme-accent-rgb),0.15)', color: 'var(--theme-accent)' }}>
                            {s.code}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold"
                            style={{ background: `${statusColor(s.status)}22`, color: statusColor(s.status), border: `1px solid ${statusColor(s.status)}44` }}>
                            {statusLabel(s.status)}
                          </span>
                        </div>
                        <p className="font-bold text-white text-sm mb-1 truncate">{s.rubric_title}</p>
                        <div className="flex items-center gap-3 text-[11px] flex-wrap" style={{ color: 'var(--text-hint)' }}>
                          <span>الصف {s.grade}/{s.section}</span>
                          <span>•</span>
                          <span>{s.column_label}</span>
                          <span>•</span>
                          <span>{semLabel(s.semester)}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {s.participants_count} مشارك
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button data-testid={`session-open-${s.code}`}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
                          style={{ background: 'rgba(var(--theme-accent-rgb),0.12)', color: 'var(--theme-accent)' }}>
                          <Link2 className="w-3.5 h-3.5" /> إدارة
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                          data-testid={`session-del-${s.code}`}
                          className="p-1.5 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#F87171' }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Create Session Picker */}
      {open && creating && createPortal(
        <div className="fixed inset-0 z-[101] flex items-center justify-center p-3 md:p-4 bg-black/70 backdrop-blur-sm" onClick={() => setCreating(false)}>
          <div className="glass-modal rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-white/10 flex items-center justify-between flex-shrink-0">
              <h3 className="font-bold text-white text-lg">إنشاء جلسة جديدة</h3>
              <button onClick={() => setCreating(false)} className="p-2 hover:bg-white/5 rounded-xl">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-5 space-y-5">
              {rubrics.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-white font-bold mb-3">أنشئ بطاقة تقييم أولاً</p>
                  <Link to="/teacher/rubrics/new" onClick={() => { setCreating(false); setOpen(false); }}
                    className="btn-primary inline-flex items-center gap-2">
                    بطاقة تقييم جديدة <ArrowLeft className="w-4 h-4" />
                  </Link>
                </div>
              ) : gradebooks.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-white font-bold mb-3">أنشئ سجل درجات أولاً</p>
                  <Link to="/teacher/gradebooks" onClick={() => { setCreating(false); setOpen(false); }}
                    className="btn-primary inline-flex items-center gap-2">
                    إنشاء سجل الدرجات <ArrowLeft className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-bold text-white mb-2.5">بطاقة التقييم (النشاط/المشروع)</label>
                    <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
                      {rubrics.map(r => {
                        const th = r.grade ? themeOfGrade(r.grade) : null;
                        const sel = rubricId === r.id;
                        return (
                          <button key={r.id} onClick={() => pickRubric(r)} data-testid={`pick-rubric-${r.id}`}
                            className="text-right p-3 rounded-xl border-2 transition-all"
                            style={sel
                              ? th
                                ? { borderColor: th.hex, background: `rgba(${th.rgb},0.12)` }
                                : { borderColor: 'var(--theme-accent)', background: 'rgba(var(--theme-accent-rgb),0.1)' }
                              : th
                                ? { borderColor: `rgba(${th.rgb},0.2)`, background: `rgba(${th.rgb},0.04)` }
                                : { borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              {r.grade && (
                                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold flex-shrink-0"
                                  style={{ background: `rgba(${th.rgb},0.18)`, color: th.hex }}>
                                  الصف {r.grade}
                                </span>
                              )}
                              <p className="text-sm font-bold text-white">{r.title}</p>
                            </div>
                            <p className="text-[11px]" style={{ color: 'var(--text-hint)' }}>
                              {r.column} • {semLabel(r.semester)} • {r.criteria?.length || 0} معايير
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-white mb-1.5">
                      سجل الدرجات (الشعبة)
                    </label>
                    {selRubric?.grade && (
                      <p className="text-[11px] mb-2.5" style={{ color: 'var(--text-hint)' }} data-testid="release-grade-hint">
                        تُعرض فقط سجلات <span className="font-bold" style={{ color: themeOfGrade(selRubric.grade).hex }}>الصف {selRubric.grade}</span>
                        {gradebooks.length !== filteredGbs.length && ` (${gradebooks.length - filteredGbs.length} مخفي)`}
                      </p>
                    )}
                    {filteredGbs.length === 0 ? (
                      <div className="text-center py-4 px-3 rounded-xl text-sm"
                        style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}>
                        لا يوجد سجل درجات للصف {selRubric?.grade} — أنشئ سجلاً من قسم سجل الدرجات أولاً
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {filteredGbs.map(g => {
                          const th = themeOfGrade(g.grade);
                          const sel = gbId === g.id;
                          return (
                            <button key={g.id} onClick={() => setGbId(g.id)} data-testid={`pick-gb-${g.grade}-${g.section}`}
                              className="text-right p-3 rounded-xl border-2 transition-all flex items-center gap-2.5"
                              style={sel
                                ? { borderColor: th.hex, background: `rgba(${th.rgb},0.14)` }
                                : { borderColor: `rgba(${th.rgb},0.2)`, background: `rgba(${th.rgb},0.05)` }}>
                              <span className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0"
                                style={{ background: `rgba(${th.rgb},0.2)`, color: th.hex }}>
                                {g.section}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-bold text-white truncate">الصف {g.grade}/{g.section}</span>
                                <span className="block text-[11px]" style={{ color: 'var(--text-hint)' }}>{g.student_count} طالب</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            {rubrics.length > 0 && gradebooks.length > 0 && (
              <div className="p-5 border-t border-white/10 flex-shrink-0">
                <button onClick={submitCreate} disabled={submitting || !rubricId || !gbId}
                  data-testid="session-confirm-create"
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40">
                  {submitting ? 'جارٍ الإنشاء...' : 'إنشاء الجلسة والحصول على الرابط'}
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {activeSid && (
        <SessionManager sid={activeSid}
          onClose={() => { setActiveSid(null); fetchSessions(); }} />
      )}
    </>
  );
}
