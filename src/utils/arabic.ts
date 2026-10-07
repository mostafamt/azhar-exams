const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/** Converts Western digits to Eastern Arabic digits: 12 → ١٢ */
export function toArabicDigits(value: number | string) {
  return String(value).replace(/\d/g, (digit) => ARABIC_DIGITS[Number(digit)]);
}
