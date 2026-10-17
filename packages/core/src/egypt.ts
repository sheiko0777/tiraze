// Egypt-first market data. Governorate codes follow ISO 3166-2:EG.

export interface Governorate {
  code: string;
  ar: string;
  en: string;
}

export const GOVERNORATES: readonly Governorate[] = [
  { code: 'C', ar: 'القاهرة', en: 'Cairo' },
  { code: 'GZ', ar: 'الجيزة', en: 'Giza' },
  { code: 'ALX', ar: 'الإسكندرية', en: 'Alexandria' },
  { code: 'KB', ar: 'القليوبية', en: 'Qalyubia' },
  { code: 'SHR', ar: 'الشرقية', en: 'Sharqia' },
  { code: 'DK', ar: 'الدقهلية', en: 'Dakahlia' },
  { code: 'GH', ar: 'الغربية', en: 'Gharbia' },
  { code: 'MNF', ar: 'المنوفية', en: 'Monufia' },
  { code: 'BH', ar: 'البحيرة', en: 'Beheira' },
  { code: 'KFS', ar: 'كفر الشيخ', en: 'Kafr El Sheikh' },
  { code: 'DT', ar: 'دمياط', en: 'Damietta' },
  { code: 'PTS', ar: 'بورسعيد', en: 'Port Said' },
  { code: 'IS', ar: 'الإسماعيلية', en: 'Ismailia' },
  { code: 'SUZ', ar: 'السويس', en: 'Suez' },
  { code: 'FYM', ar: 'الفيوم', en: 'Faiyum' },
  { code: 'BNS', ar: 'بني سويف', en: 'Beni Suef' },
  { code: 'MN', ar: 'المنيا', en: 'Minya' },
  { code: 'AST', ar: 'أسيوط', en: 'Asyut' },
  { code: 'SHG', ar: 'سوهاج', en: 'Sohag' },
  { code: 'KN', ar: 'قنا', en: 'Qena' },
  { code: 'LX', ar: 'الأقصر', en: 'Luxor' },
  { code: 'ASN', ar: 'أسوان', en: 'Aswan' },
  { code: 'BA', ar: 'البحر الأحمر', en: 'Red Sea' },
  { code: 'WAD', ar: 'الوادي الجديد', en: 'New Valley' },
  { code: 'MT', ar: 'مطروح', en: 'Matrouh' },
  { code: 'SIN', ar: 'شمال سيناء', en: 'North Sinai' },
  { code: 'JS', ar: 'جنوب سيناء', en: 'South Sinai' },
] as const;

const CODES = new Set(GOVERNORATES.map((g) => g.code));

export function isGovernorateCode(code: string): boolean {
  return CODES.has(code);
}

export function governorateName(code: string, locale: 'ar' | 'en'): string {
  const g = GOVERNORATES.find((x) => x.code === code);
  return g ? g[locale] : code;
}

// Egyptian mobile numbers: 010, 011, 012, 015 followed by 8 digits.
const MOBILE = /^(?:\+?20|0)?(1[0125]\d{8})$/;

/** Normalises an Egyptian mobile number to E.164 (+201XXXXXXXXX) or returns null. */
export function normalizeEgyptMobile(input: string): string | null {
  const digits = input.replace(/[\s\-()]/g, '').replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  const m = MOBILE.exec(digits);
  return m ? `+20${m[1]}` : null;
}
