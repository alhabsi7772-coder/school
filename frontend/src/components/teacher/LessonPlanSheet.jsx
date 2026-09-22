import { useState } from 'react';
import { Check, X, Pencil, RotateCcw, FileDown, Save, Trash2, Palette, FileText } from 'lucide-react';

const linesToArr = (s) => s.split('\n').map(x => x.trim()).filter(Boolean);

const Area = ({ value, onChange, rows = 4, testid }) => (
  <textarea data-testid={testid} value={value} onChange={e => onChange(e.target.value)} rows={rows}
    className="lp-edit" dir="rtl" />
);

const Lines = ({ items, prefix = '' }) => (
  <div className="space-y-1.5">
    {items.map((x, i) => <p key={i} className="lp-line">{prefix}{x}</p>)}
  </div>
);

export const LessonPlanSheet = ({ lesson, plan, header, editing, onChange, themed = false }) => {
  const set = (k) => (v) => onChange({ ...plan, [k]: v });
  const setList = (k) => (v) => onChange({ ...plan, [k]: linesToArr(v) });
  const stratText = plan.strategies.map(s => `${s.name} | ${s.objectives}`).join('\n');
  const setStrats = (v) => onChange({
    ...plan, strategies: linesToArr(v).map(l => {
      const [name, objectives = ''] = l.split('|').map(x => x.trim());
      return { name, objectives };
    })
  });

  return (
    <div className={`lp-sheet ${themed ? 'lp-themed' : ''}`} dir="rtl" data-testid="lesson-plan-sheet" data-style={themed ? 'themed' : 'paper'}>
      <div className="text-center space-y-0.5 mb-3">
        <p className="font-black text-[15px]">{header.directorate}</p>
        <p className="font-bold">مدرسة: {header.school}</p>
        <p className="font-bold">تحضير مادة تقنية المعلومات &nbsp;&nbsp; العام الدراسي {header.year} م</p>
        <p className="text-sm">اسم المعلم/ {header.teacher}</p>
      </div>

      <table className="lp-table mb-3">
        <tbody>
          <tr className="lp-head">
            <td>الصف: {lesson.grade_name}</td>
            <td>الوحدة: {lesson.unit}</td>
            <td>عنوان الدرس/ الموضوع: {lesson.lesson} <span className="opacity-60 text-xs">(ص {lesson.pages})</span></td>
          </tr>
        </tbody>
      </table>

      <table className="lp-table mb-3">
        <tbody>
          <tr>
            <td className="lp-head w-[15%]">التعلم القبلي/التمهيد/ المفاهيم</td>
            <td colSpan={3}>{editing ? <Area value={plan.prior} onChange={set('prior')} rows={2} testid="lp-edit-prior" /> : <p className="lp-line">{plan.prior}</p>}</td>
          </tr>
          <tr className="lp-head lp-blue">
            <td className="w-[23%]">الأهداف/ المخرجات التعليمية</td>
            <td className="w-[17%]">الاستراتيجيات/طرق التدريس</td>
            <td className="w-[42%]">آلية التنفيذ/ الأنشطة التدريبية/التعليمية</td>
            <td className="w-[18%]">الوسائل ومصادر التعلم</td>
          </tr>
          <tr className="align-top">
            <td>
              <p className="lp-line font-bold mb-1">يتوقع من الطالب بعد انتهاء الدرس أن :</p>
              {editing ? <Area value={plan.objectives.join('\n')} onChange={setList('objectives')} rows={8} testid="lp-edit-objectives" />
                : <Lines items={plan.objectives.map((o, i) => `${i + 1}. ${o}`)} />}
            </td>
            <td>
              {editing ? <Area value={stratText} onChange={setStrats} rows={8} testid="lp-edit-strategies" />
                : <Lines items={plan.strategies.map(s => `(  ${s.objectives}  ) ${s.name}.`)} />}
              {editing && <p className="text-[10px] opacity-60 mt-1">كل سطر: اسم الاستراتيجية | أرقام الأهداف</p>}
            </td>
            <td>{editing ? <Area value={plan.execution.join('\n')} onChange={setList('execution')} rows={12} testid="lp-edit-execution" /> : <Lines items={plan.execution} />}</td>
            <td>{editing ? <Area value={plan.resources.join('\n')} onChange={setList('resources')} rows={8} testid="lp-edit-resources" /> : <Lines items={plan.resources} prefix="• " />}</td>
          </tr>
        </tbody>
      </table>

      <table className="lp-table">
        <tbody>
          <tr className="lp-head lp-blue">
            <td className="w-[27%]">التقويم التكويني</td>
            <td className="w-[27%]">نشاط إثرائي/ علاجي / تفريد التعليم</td>
            <td className="w-[26%]">التقويم الختامي</td>
            <td className="w-[20%]">الواجب المنزلي</td>
          </tr>
          <tr className="align-top">
            <td>{editing ? <Area value={plan.formative.join('\n')} onChange={setList('formative')} rows={6} testid="lp-edit-formative" /> : <Lines items={plan.formative} prefix="- " />}</td>
            <td>
              <p className="lp-line font-bold">نشاط إثرائي:</p>
              {editing ? <Area value={plan.enrichment} onChange={set('enrichment')} rows={3} testid="lp-edit-enrichment" /> : <p className="lp-line">{plan.enrichment}</p>}
              <p className="lp-line font-bold mt-2">نشاط علاجي:</p>
              {editing ? <Area value={plan.remedial} onChange={set('remedial')} rows={3} testid="lp-edit-remedial" /> : <p className="lp-line">{plan.remedial}</p>}
            </td>
            <td>{editing ? <Area value={plan.summative.join('\n')} onChange={setList('summative')} rows={6} testid="lp-edit-summative" /> : <Lines items={plan.summative} prefix="- " />}</td>
            <td>{editing ? <Area value={plan.homework} onChange={set('homework')} rows={6} testid="lp-edit-homework" /> : <p className="lp-line">{plan.homework}</p>}</td>
          </tr>
          <tr>
            <td className="lp-head">ملاحظات المعلم</td>
            <td colSpan={3}>{editing ? <Area value={plan.notes} onChange={set('notes')} rows={2} testid="lp-edit-notes" /> : <p className="lp-line min-h-[1.5rem]">{plan.notes}</p>}</td>
          </tr>
        </tbody>
      </table>

      <div className="flex justify-between px-10 mt-4 font-bold text-sm">
        <span>يعتمد،، المعلم الأول</span>
        <span>يعتمد،،، المشرف التربوي</span>
      </div>
    </div>
  );
};

export const PlanToolbar = ({ editing, dirty, saving, exporting, edited, custom, sheetStyle, onToggleStyle, onEdit, onCancel, onSave, onReset, onExport }) => (
  <div className="flex flex-wrap items-center gap-2" data-testid="lp-toolbar">
    {!editing ? (
      <>
        <button data-testid="lp-edit-btn" onClick={onEdit} className="btn-secondary rounded-2xl flex items-center gap-1.5 px-3 py-2 text-sm"><Pencil className="w-4 h-4" />تعديل</button>
        {edited && !custom && <button data-testid="lp-reset-btn" onClick={onReset} className="btn-ghost rounded-2xl flex items-center gap-1.5 px-3 py-2 text-sm"><RotateCcw className="w-4 h-4" />استعادة الأصل</button>}
        {custom && <button data-testid="lp-delete-custom-btn" onClick={onReset} className="btn-ghost rounded-2xl flex items-center gap-1.5 px-3 py-2 text-sm text-red-300"><Trash2 className="w-4 h-4" />حذف التحضير</button>}
      </>
    ) : (
      <>
        <button data-testid="lp-save-btn" onClick={onSave} disabled={saving} className="btn-primary rounded-2xl flex items-center gap-1.5 px-3 py-2 text-sm font-bold">
          {saving ? <Save className="w-4 h-4 animate-pulse" /> : <Check className="w-4 h-4" />}حفظ التعديلات
        </button>
        <button data-testid="lp-cancel-btn" onClick={onCancel} className="btn-ghost rounded-2xl flex items-center gap-1.5 px-3 py-2 text-sm"><X className="w-4 h-4" />إلغاء</button>
        {dirty && <span className="text-xs text-amber-300">تغييرات غير محفوظة</span>}
      </>
    )}
    <button data-testid="lp-style-toggle" onClick={onToggleStyle} className="btn-ghost rounded-2xl flex items-center gap-1.5 px-3 py-2 text-sm mr-auto" title="تبديل نمط الورقة">
      {sheetStyle === 'paper' ? <Palette className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
      {sheetStyle === 'paper' ? 'نمط متناسق مع الثيم' : 'نمط ورقة Word'}
    </button>
    <button data-testid="lp-export-btn" onClick={onExport} disabled={exporting}
      className="rounded-2xl flex items-center gap-1.5 px-4 py-2 text-sm font-bold transition-all hover:scale-105"
      style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.35), rgba(37,99,235,0.15))', color: '#93C5FD', border: '1px solid rgba(96,165,250,0.45)' }}>
      <FileDown className="w-4 h-4" />{exporting ? 'جارٍ التصدير…' : 'تصدير Word'}
    </button>
  </div>
);
