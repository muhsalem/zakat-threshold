/**
 * أنواع وحدة تقارير PDF الاحترافية.
 */

export type TemplateKind = "declaration" | "compliance" | "certified";
export type LayoutKind = "classic" | "modern" | "minimal";
export type StampPosition = "tl" | "tr" | "bl" | "br" | "center";

export interface BrandConfig {
  logo_url: string | null;
  org_name: string;
  primary_color: string;
  accent_color: string;
  font_family: "Cairo" | "Amiri" | "Tajawal";
  heading_size: number; // 14-24
}

export interface HeaderConfig {
  show_logo: boolean;
  show_org: boolean;
  show_report_no: boolean;
  custom_text: string;
}

export interface FooterConfig {
  show_page_numbers: boolean;
  show_issuer: boolean;
  custom_text: string;
}

export interface StampConfig {
  enabled: boolean;
  image_url: string | null;
  position: StampPosition;
  opacity: number; // 0.1-1
  signer_name: string;
  signer_license: string;
}

export interface SectionsConfig {
  owner_info: boolean;
  inputs: boolean;
  assets: boolean;
  calc_steps: boolean;
  deductions: boolean;
  results: boolean;
  notes: boolean;
  sharia_refs: boolean;
  sources: boolean;
  exceptions: boolean;

  legal_notice: boolean;
  verify_qr: boolean;
}

export interface TemplateConfig {
  layout: LayoutKind;
  brand: BrandConfig;
  header: HeaderConfig;
  footer: FooterConfig;
  stamp: StampConfig;
  sections: SectionsConfig;
  legal_notice_text: string;
  notes_text: string;
}

export interface PdfTemplate {
  id: string;
  user_id: string;
  organization_id: string | null;
  name: string;
  kind: TemplateKind;
  is_default: boolean;
  config: TemplateConfig;
  created_at: string;
  updated_at: string;
}

/** بيانات جاهزة للتوليد — مبنية من zakat_records + snapshot. */
export interface ReportPayload {
  report_uid: string;
  /** رمز عشوائي غير قابل للتخمين — هو مفتاح رابط/رمز QR التحقق العام، لا report_uid التسلسلي. */
  verify_token: string;
  kind: TemplateKind;
  title: string;
  issued_at: string;
  issuer_name: string;
  owner: {
    name: string;
    email?: string;
    profession?: string;
    country?: string;
  };
  meta: {
    currency: string;
    hijri_year?: string;
    gregorian_date?: string;
  };
  inputs: Array<{ label: string; value: string }>;
  assets: Array<{ label: string; value: string }>;
  calc_steps: Array<{ label: string; value: string }>;
  deductions: Array<{ label: string; value: string; included: boolean }>;
  results: Array<{ label: string; value: string; emphasize?: boolean }>;
  sharia_refs: Array<{ ref: string; note?: string }>;
  /** توثيق مصادر الأسعار وأسعار الصرف والمنهجية. */
  sources?: Array<{ label: string; value: string; origin?: string }>;
  /** الاستثناءات والبنود المستبعدة مع تعليلها. */
  exceptions?: Array<{
    code: string;
    label: string;
    reason: string;
    impact?: string;
    severity: "info" | "warning" | "excluded";
  }>;
  content_hash: string;
  version: number;
}


export const DEFAULT_CONFIG: TemplateConfig = {
  layout: "classic",
  brand: {
    logo_url: null,
    org_name: "نِصاب — منصة الزكاة",
    primary_color: "#0d766e",
    accent_color: "#f59e0b",
    font_family: "Cairo",
    heading_size: 18,
  },
  header: {
    show_logo: true,
    show_org: true,
    show_report_no: true,
    custom_text: "",
  },
  footer: {
    show_page_numbers: true,
    show_issuer: true,
    custom_text: "صدر عبر منصة نِصاب — النتائج تقديرية استرشادية.",
  },
  stamp: {
    enabled: false,
    image_url: null,
    position: "br",
    opacity: 0.85,
    signer_name: "",
    signer_license: "",
  },
  sections: {
    owner_info: true,
    inputs: true,
    assets: true,
    calc_steps: true,
    deductions: true,
    results: true,
    notes: true,
    sharia_refs: true,
    legal_notice: true,
    verify_qr: true,
  },
  legal_notice_text:
    "هذا التقرير استرشادي مبني على المدخلات المصرّح بها. تحمّل الجهة المُصدِرة مسؤولية دقة المدخلات، ولا يُعدّ فتوى فردية.",
  notes_text: "",
};
