import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { X, Copy, Check, Send, Users, RefreshCw, UserCheck, UserX, AlertTriangle, Trash2, Link2 } from 'lucide-react';
import { API, getAuthHeaders } from '../../utils';

const confidenceColor = (c) => c >= 0.85 ? '#34D399' : c >= 0.6 ? '#FBBF24' : '#F87171';

export default function SessionManager({ sid, onClose }) {
  const [sess, setSess] = useState(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const joinUrl = sess ? `${window.location.origin}/g/${sess.code}` : '';

  const load = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/grade-sessions/${sid}`, getAuthHeaders());
      setSess(r.data);
    } catch { toast.error('تعذر تحميل الجلسة'); }
  }, [sid]);

  useEffect(() => {
    load();
    const t = setInterval(load, 3500);
    return () => clearInterval(t);
  }, [load]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success('تم نسخ الرابط');
    } catch { toast.error('تعذر النسخ'); }
  };

  const updateMatch = async (pid, body) => {
    try {
      await axios.put(`${API}/grade-sessions/${sid}/participants/${pid}`, body, getAuthHeaders());
      load();
    } catch (err) { toast.error(err.response?.data?.detail || 'تعذر التحديث'); }
  };

  const removeParticipant = async (pid) => {
    if (!window.confirm('إزالة هذا المشارك من الجلسة؟')) return;
    try {
      await axios.delete(`${API}/grade-sessions/${sid}/participants/${pid}`, getAuthHeaders());
      load();
    } catch { toast.error('تعذر الإزالة'); }
  };

  const releaseAll = async () => {
    const matchedReady = (sess?.participants || []).filter(p => !p.ignored && p.matched_student_id).length;
    if (matchedReady === 0) {
      toast.error('لا يوجد طلاب مطابقون — طابق الأسماء أولاً');
      return;
    }
    setBusy(true);
    try {
      const r = await axios.post(`${API}/grade-sessions/${sid}/release`, {}, getAuthHeaders());
      const sent = r.data?.released_to ?? matchedReady;
      toast.success(`تم إرسال الدرجات لـ ${sent} طالب — يرونها الآن`);
      load();
    } catch (err) { toast.error(err.response?.data?.detail || 'تعذر الإرسال'); }
    finally { setBusy(false); }
  };

  const reopen = async () => {
    setBusy(true);
    try {
      await axios.post(`${API}/grade-sessions/${sid}/reopen`, {}, getAuthHeaders());
      toast.success('تم فتح الجلسة');
      load();
    } catch { toast.error('تعذر الفتح'); }
    finally { setBusy(false); }
  };

  if (!sess) return null;

  const participants = sess.participants || [];
  const released = sess.status === 'released';
  const matchedReady = participants.filter(p => !p.ignored && p.matched_student_id).length;
  const confirmedCount = participants.filter(p => p.confirmed && !p.ignored).length;
  const ignoredCount = participants.filter(p => p.ignored).length;
  const pendingCount = participants.filter(p => !p.confirmed && !p.ignored).length;

  return createPortal(
    <div className="fixed inset-0 z-[102] flex items-center justify-center p-3 md:p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-modal rounded-2xl w-full max-w-4xl max-h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-start justify-between flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <h3 className="font-bold text-white text-lg">{sess.rubric_title}</h3>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold"
                style={released
                  ? { background: 'rgba(52,211,153,0.15)', color: '#34D399', border: '1px solid rgba(52,211,153,0.3)' }
                  : { background: 'rgba(251,191,36,0.15)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.3)' }}>
                {released ? 'تم الإرسال' : matchedReady > 0 ? `${matchedReady} جاهزون للإرسال` : 'بانتظار الطلاب'}
              </span>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-hint)' }}>
              الصف {sess.grade}/{sess.section} • {sess.column_label}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl flex-shrink-0 mr-3" data-testid="session-mgr-close">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Share link */}
          <div className="rounded-xl p-4" style={{ background: 'rgba(var(--theme-accent-rgb),0.06)', border: '1px solid rgba(var(--theme-accent-rgb),0.25)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Link2 className="w-4 h-4" style={{ color: 'var(--theme-accent)' }} />
              <span className="text-sm font-bold text-white">رابط دخول الطلاب</span>
            </div>
            <div className="flex gap-2 items-stretch">
              <div className="flex-1 px-3 py-2.5 rounded-lg text-xs font-mono break-all"
                style={{ background: 'rgba(0,0,0,0.3)', color: 'var(--theme-accent)' }} data-testid="session-link">
                {joinUrl}
              </div>
              <button onClick={copyLink} data-testid="session-copy-btn"
                className="px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 flex-shrink-0"
                style={{ background: 'var(--theme-accent)', color: '#0B1220' }}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'تم' : 'نسخ'}
              </button>
            </div>
            <p className="text-[11px] mt-2.5" style={{ color: 'var(--text-hint)' }}>
              أرسل الرابط في مجموعة الطلاب — يكتبون اسمهم وصفهم ثم تظهر أسماؤهم هنا للمطابقة
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            <Stat label="انضموا" value={participants.length} color="#64B5F6" icon={Users} />
            <Stat label="بانتظار التأكيد" value={pendingCount} color="#FBBF24" icon={AlertTriangle} />
            <Stat label="مؤكدون" value={confirmedCount} color="#34D399" icon={UserCheck} />
            <Stat label="مرفوضون" value={ignoredCount} color="#F87171" icon={UserX} />
          </div>

          {/* Participants */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <Users className="w-4 h-4" style={{ color: 'var(--theme-accent)' }} />
                المشاركون الذين انضموا عبر الرابط
              </h4>
              <button onClick={load} className="p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>

            {participants.length === 0 ? (
              <div className="text-center py-10 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <Users className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--text-hint)' }} />
                <p className="text-sm text-white font-bold mb-1">لا أحد انضم بعد</p>
                <p className="text-[11px]" style={{ color: 'var(--text-hint)' }}>سيظهر الطلاب هنا فور دخولهم بالرابط</p>
              </div>
            ) : (
              <div className="space-y-2.5" data-testid="participants-list">
                {participants.map(p => (
                  <ParticipantRow key={p.id} p={p} roster={sess.roster || []}
                    onChange={(body) => updateMatch(p.id, body)}
                    onRemove={() => removeParticipant(p.id)} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex-shrink-0 flex gap-2 flex-wrap">
          {released ? (
            <button onClick={reopen} disabled={busy} data-testid="session-reopen-btn"
              className="flex-1 px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
              style={{ background: 'rgba(251,191,36,0.12)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.3)' }}>
              <RefreshCw className="w-4 h-4" />
              إعادة فتح الجلسة (إيقاف العرض)
            </button>
          ) : (
            <button onClick={releaseAll} disabled={busy || matchedReady === 0}
              data-testid="session-release-btn"
              className="btn-primary flex-1 flex items-center justify-center gap-2 py-3 disabled:opacity-40">
              <Send className="w-4 h-4" />
              {busy ? 'جارٍ الإرسال...' : `إرسال الدرجات لـ ${matchedReady} طالب`}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function Stat({ label, value, color, icon: Icon }) {
  return (
    <div className="rounded-xl p-2.5 text-center" style={{ background: `${color}10`, border: `1px solid ${color}30` }}>
      <Icon className="w-4 h-4 mx-auto mb-1" style={{ color }} />
      <p className="text-xl font-black" style={{ color }}>{value}</p>
      <p className="text-[10px]" style={{ color: 'var(--text-hint)' }}>{label}</p>
    </div>
  );
}

function ParticipantRow({ p, roster, onChange, onRemove }) {
  const matched = !!p.matched_student_id;
  const conf = p.match_confidence || 0;

  return (
    <div data-testid={`participant-${p.id}`}
      className="rounded-xl p-3.5 flex flex-col gap-3"
      style={p.confirmed
        ? { background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.3)' }
        : p.ignored
        ? { background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.25)', opacity: 0.6 }
        : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white text-sm truncate">{p.joined_name}</p>
          <p className="text-[11px]" style={{ color: 'var(--text-hint)' }}>
            كتب: الصف {p.joined_grade}/{p.joined_section}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {p.confirmed && (
            <span className="px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1"
              style={{ background: 'rgba(52,211,153,0.15)', color: '#34D399' }}>
              <Check className="w-3 h-3" /> مؤكد
            </span>
          )}
          {p.ignored && (
            <span className="px-2 py-1 rounded-md text-[10px] font-bold"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#F87171' }}>
              مرفوض
            </span>
          )}
        </div>
      </div>

      {/* Match selector */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch">
        <select
          value={p.matched_student_id || ''}
          onChange={(e) => onChange({ matched_student_id: e.target.value, confirmed: !!e.target.value })}
          data-testid={`match-select-${p.id}`}
          className="input-field flex-1 text-xs">
          <option value="">— لا مطابقة —</option>
          {roster.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        {matched && (
          <span className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center flex-shrink-0"
            style={{ background: `${confidenceColor(conf)}15`, color: confidenceColor(conf), border: `1px solid ${confidenceColor(conf)}33` }}>
            تطابق {Math.round(conf * 100)}%
          </span>
        )}
      </div>

      {p.has_evaluation && p.preview_total != null && (
        <div className="text-[11px] flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
          style={{ background: 'rgba(100,181,246,0.08)', color: '#64B5F6' }}>
          <Check className="w-3 h-3" />
          درجة معلَنة جاهزة: {p.preview_total} {p.preview_gb_score != null && `(للسجل: ${p.preview_gb_score})`}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {!p.confirmed && (
          <button onClick={() => onChange({ confirmed: true })}
            disabled={!matched}
            data-testid={`confirm-${p.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40"
            style={{ background: 'rgba(52,211,153,0.12)', color: '#34D399', border: '1px solid rgba(52,211,153,0.3)' }}>
            <UserCheck className="w-3.5 h-3.5" /> تأكيد المطابقة
          </button>
        )}
        {p.confirmed && (
          <button onClick={() => onChange({ confirmed: false })}
            data-testid={`unconfirm-${p.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
            style={{ background: 'rgba(251,191,36,0.1)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.3)' }}>
            إلغاء التأكيد
          </button>
        )}
        {!p.ignored ? (
          <button onClick={() => onChange({ ignored: true })}
            data-testid={`ignore-${p.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#F87171', border: '1px solid rgba(239,68,68,0.25)' }}>
            <UserX className="w-3.5 h-3.5" /> رفض
          </button>
        ) : (
          <button onClick={() => onChange({ ignored: false })}
            data-testid={`unignore-${p.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
            إلغاء الرفض
          </button>
        )}
        <button onClick={onRemove} data-testid={`remove-${p.id}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
          style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-hint)' }}>
          <Trash2 className="w-3.5 h-3.5" /> حذف
        </button>
      </div>
    </div>
  );
}
