// نِصاب — سطح المكتب
// غلاف Tauri رفيع حول نفس واجهة الويب المستضافة — لا منطق أعمال هنا.
// كل حساب الزكاة والفتاوى وربط ERP يبقى كما هو في src/ (كود الويب) دون تكرار.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("خطأ أثناء تشغيل تطبيق نِصاب لسطح المكتب");
}
