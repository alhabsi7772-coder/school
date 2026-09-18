# ui-ux-pro-max (مرجع تصميم محلي)

مصدر: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill (نسخة src/ui-ux-pro-max فقط، بدون تثبيت حزم).

هذا ليس "Skill" مسجّلاً في نظام Emergent (search_skills/load_skill) — إنه سكربت بحث بايثون (مكتبة قياسية فقط،
بلا اتصال إنترنت) يُستخدم يدوياً كمرجع عند تصميم أي واجهة جديدة في هذا المشروع.

## طريقة الاستخدام
```
cd /app/memory/skills/ui-ux-pro-max/scripts
python3 search.py "وصف قصير للواجهة/القطاع" --design-system -p "اسم المشروع"
python3 search.py "glassmorphism" --domain style
python3 search.py "elegant arabic serif" --domain typography
```
يُرجع: نمط تخطيط الصفحة، الأنماط البصرية، لوحة ألوان (hex)، أزواج خطوط (بما فيها خطوط عربية RTL)، تأثيرات، وقائمة تحقق قبل التسليم.

استُخدم أول مرة بتاريخ سبتمبر 2026 كمرجع اختياري بجانب `design_agent` الأساسي في المنصة.
