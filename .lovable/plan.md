# خطة تنفيذ: وحدة تقارير PDF الاحترافية

## النطاق المتفق عليه
- **الدفعة**: كل ما سبق (قالب + محرك + سجل + تدقيق) كـ MVP متكامل قابل للتوسع.
- **المحرك**: الانتقال إلى **pdfmake** (يدعم RTL/العربية أصلاً + ترقيم صفحات X/Y + ترويسة/تذييل ديناميكي + خطوط مضمّنة).
- **الختم**: صورة ختم PNG + اسم المعتمد ورقم الترخيص + QR للتحقق عبر `/verify`.
- **القوالب**: تقرير الإقرار (`zakat-case`) + Compliance + Certified.

---

## 1) قاعدة البيانات (Migration واحدة)

### جدول `pdf_templates` — قوالب قابلة للحفظ
- `id`, `user_id` (owner) أو `organization_id` للقوالب المشتركة
- `name`, `kind` (`declaration` | `compliance` | `certified`)
- `is_default boolean`
- `config jsonb` يحوي:
  - `layout`: `classic` | `modern` | `minimal`
  - `brand`: `{ logo_url, org_name, primary_color, accent_color, font_family, heading_size }`
  - `header`: `{ show_logo, show_org, show_report_no, custom_text }`
  - `footer`: `{ show_page_numbers, show_issuer, custom_text }`
  - `stamp`: `{ enabled, image_url, position: tl|tr|bl|br|center, opacity, signer_name, signer_license }`
  - `sections`: `{ owner_info, inputs, assets, calc_steps, deductions, results, notes, sharia_refs, legal_notice }` (كل واحد boolean)
  - `legal_notice_text`, `notes_text`

### جدول `pdf_reports` — سجل التقارير المُولّدة
- `id uuid`, `report_uid text unique` (معرّف فريد قابل للعرض مثل `RPT-2026-00001`)
- `user_id`, `organization_id`, `zakat_record_id`, `template_id`
- `kind` (declaration/compliance/certified)
- `title`, `content_hash text` (SHA-256 من الـsnapshot لضمان عدم العبث)
- `snapshot jsonb` (المدخلات وقت التوليد — لإعادة الإنتاج المطابقة)
- `status text` (`generated` | `downloaded` | `sent` | `approved` | `canceled`)
- `version integer` (رقم النسخة عند إعادة التوليد لنفس الإقرار)
- `storage_path text` (اختياري — تخزين النسخة في bucket خاص)
- `created_by`, `created_at`, `last_downloaded_at`, `last_downloaded_by`

### جدول `pdf_report_audit` — سجل تدقيق كل عملية
- `id`, `report_id`, `actor_id`, `action` (`created`|`downloaded`|`viewed`|`sent`|`approved`|`canceled`|`regenerated`|`template_updated`)
- `ip`, `user_agent`, `metadata jsonb`, `created_at`

### GRANT + RLS
- `SELECT/INSERT/UPDATE ON pdf_templates TO authenticated` مع سياسة `user_id = auth.uid()` أو عضو في المنظمة.
- `pdf_reports`: مالك السجل + محاسبو العميل + مراجعو المنظمة.
- `pdf_report_audit`: DENY UPDATE/DELETE، INSERT بواسطة triggers، SELECT للمالك والمُدقّق.
- Trigger `log_pdf_report_change()` يُدرج تلقائياً في `pdf_report_audit`.
- Bucket تخزين `pdf-reports` (خاص) مع سياسات مماثلة لـ `approval-attachments`.

---

## 2) محرك PDF (`src/lib/pdf/`)

- `engine.ts`: تهيئة `pdfmake` مع خط `Cairo`/`Tajawal` مضمّن (base64) لدعم العربية.
- `layouts/classic.ts`, `modern.ts`, `minimal.ts`: توليد `docDefinition` لكل قالب.
- `sections/`: مكونات معاد استخدامها — `header.ts` (شعار/رقم تقرير), `footer.ts` (X من Y + المُصدر + التاريخ), `stamp.ts` (توقيع + QR + بيانات المعتمد), `ownerInfo.ts`, `inputs.ts`, `calcSteps.ts`, `deductions.ts`, `results.ts`, `shariaRefs.ts`, `legalNotice.ts`.
- `generate.ts`: يستقبل `{ template, data }` ويُرجع `Blob`. يحسب `content_hash` ويولّد `report_uid`.

## 3) Server Functions (`src/lib/pdf/reports.functions.ts`)

- `createPdfReport({ zakatRecordId, templateId, kind })` — يُدرج في `pdf_reports`، يبني الـsnapshot، يُرجع `{ reportId, report_uid, snapshot, template }` لتوليد PDF في المتصفح ثم يرفع Blob إلى Storage.
- `listPdfReports({ filters })` — مع تصفية بالتاريخ/المستخدم/النوع/الحالة + `pagination`.
- `getPdfReport(id)` / `regeneratePdfReport(id)` / `updateReportStatus(id, status)` / `deletePdfReport(id)` (بصلاحية).
- `logPdfDownload(reportId)` — يحدّث `last_downloaded_*` ويكتب Audit.
- `savePdfTemplate` / `listPdfTemplates` / `deletePdfTemplate`.

## 4) الواجهات

### أ) `/pdf-templates` — إدارة القوالب
- قائمة القوالب + زر "قالب جديد".
- محرر بتبويبات:
  1. **الهوية**: شعار (رفع إلى bucket)، اسم الجهة، ألوان (color picker)، خط، حجم عنوان.
  2. **الأقسام**: Switches لكل قسم (بيانات الصاحب، المدخلات، الأصول، خطوات الحساب، الخصومات، النتائج، الملاحظات، المراجع الشرعية، التنويهات القانونية).
  3. **الترويسة/التذييل**: نصوص مخصصة + خيارات الترقيم والشعار.
  4. **الختم**: رفع صورة، الموضع، الشفافية، بيانات المعتمد.
  5. **معاينة مباشرة**: iframe يعرض PDF Blob يُحدَّث فورياً عند تعديل الحقول (debounce 400ms).
- زر "حفظ" + "تعيين كافتراضي" + "تكرار".

### ب) `/reports-history` — سجل التقارير
- جدول: رقم التقرير، الإقرار، النوع، اسم المستخدم، تاريخ الإنشاء، آخر تنزيل، المنزّل، الحالة، الإجراءات.
- Filters: تاريخ من/إلى، نوع، حالة، بحث نصي (رقم تقرير/اسم).
- Actions: عرض، إعادة تنزيل، نسخة جديدة (regenerate)، تغيير الحالة، مقارنة نسختين (diff مبسّط لل snapshots)، حذف.

### ج) تكامل `/zakat-case/$recordId`
- استبدال الزر الحالي بقائمة منسدلة: "تنزيل تقرير — القالب الافتراضي / اختيار قالب…".
- عند الإنشاء يُسجَّل في `pdf_reports` تلقائياً ويظهر في السجل.

### د) `/verify/$reportUid` — تحقق عام (يستخدم QR)
- يعرض: رقم التقرير، تاريخ الإصدار، المُصدر، `content_hash`، الحالة. بدون مدخلات حسّاسة.

## 5) الأمان والصلاحيات

- role gate جديد: `can_manage_templates`, `can_approve_reports` عبر `has_role`.
- ربط الأزرار بـ `useUserRole` (استخدام موجود).
- كل زر تنزيل/إنشاء/حذف يستدعي `logPdfDownload` أو Audit.
- تشفير `content_hash` (SHA-256) لضمان عدم التلاعب.

## 6) التوسع المستقبلي (بنية جاهزة، غير مُنفَّذ الآن)
- Digital signature (PAdES/PKI): حقول `signature_meta jsonb` محجوزة في `pdf_reports`.
- إرسال بالبريد: hook في `updateReportStatus('sent')` يستدعي `send-report-email` Edge Function الموجودة.
- شهادات إلكترونية / اعتماد شرعي: يستفيد من `sharia_attestations` الموجود.

---

## تفاصيل تقنية

- **Package**: `bun add pdfmake` + `@types/pdfmake`. حجم إضافي ~800KB لكن أُحمّل بـ`await import()` كسولاً.
- **الخط العربي**: `Cairo-Regular.ttf` + `Cairo-Bold.ttf` مضمّنة base64 في `src/lib/pdf/fonts.ts` لضمان ظهور صحيح دون CORS.
- **QR للتحقق**: `qrcode` (خفيف). URL: `https://<host>/verify/<report_uid>`.
- **إعادة إنتاج مطابقة**: snapshot يُحفظ كما هو، أي إعادة توليد لاحقة تنتج نفس `content_hash`.
- **اختبارات**: `pdf/engine.test.ts` للتحقق من ثبات `content_hash`؛ `reports.functions.test.ts` للتحقق من الصلاحيات؛ Playwright e2e لسير كامل (إنشاء قالب → تنزيل تقرير → ظهوره في السجل).
- **i18n**: كل نصوص القوالب تمرّ عبر `t()` مع دعم AR/EN.

## ما لن يُنفَّذ في هذه الدفعة (بوضوح)
- توقيع رقمي PKI/PAdES حقيقي.
- إرسال البريد الآلي (البنية جاهزة، لكن دون تفعيل خدمة).
- أرشفة سحابية طويلة الأمد (خارج bucket القياسي).
- شهادات إلكترونية مصدّقة من جهات خارجية.

## ترتيب التنفيذ
1. Migration + Storage bucket + RLS + Trigger التدقيق.
2. محرك pdfmake + قالب `classic` + خطوط عربية.
3. Server functions للتقارير والقوالب.
4. شاشة `/pdf-templates` مع Live Preview.
5. شاشة `/reports-history` مع الفلاتر والإجراءات.
6. ربط بشاشة `/zakat-case/$recordId` وشاشات Compliance/Certified.
7. صفحة التحقق العامة `/verify/$reportUid` + QR.
8. اختبارات + توثيق موجز في README.

**التقدير**: عمل ضخم لكن مركّز — سيصل ~15 ملف جديد + 5 تعديلات + Migration واحدة.
