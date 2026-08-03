/**
 * فحص توفّر إعدادات الاتصال بالخلفية قبل استخدام العميل.
 * عميل Supabase يرمي استثناءً عند غياب المتغيرات، وهو ما يُسقط الشجرة بالكامل
 * إذا استُدعي داخل مكوّن في الجذر. استخدم هذا الفحص للحماية.
 */
export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL ?? import.meta.env.SUPABASE_URL;
  const key =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    import.meta.env.VITE_SUPABASE_ANON_KEY ??
    import.meta.env.SUPABASE_PUBLISHABLE_KEY;
  return Boolean(url && key);
}
