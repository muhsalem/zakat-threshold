// نِصاب — سطح المكتب
// غلاف Tauri رفيع حول نفس واجهة الويب المستضافة — لا منطق أعمال هنا.
// كل حساب الزكاة والفتاوى وربط ERP يبقى كما هو في src/ (كود الويب) دون تكرار.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("خطأ أثناء تشغيل تطبيق نِصاب لسطح المكتب");
}
