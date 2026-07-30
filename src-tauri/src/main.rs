// نقطة الدخول لسطح المكتب فقط — المنطق الفعلي في lib.rs (مشترك مع الجوال مستقبلاً).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    nisab_desktop_lib::run();
}
