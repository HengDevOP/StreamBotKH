/**
 * TTS Currency & Symbol Voice Normalizer
 * Converts $ and ៛ symbols, as well as numerals, into natural spoken words based on voice/language context:
 * - Khmer context: $ -> ដុល្លារ, ៛ -> រៀល, 4,000 -> បួនពាន់ (never spelling individual digits "បួន សូន្យ សូន្យ សូន្យ")
 * - English context: $ -> dollar/dollars, ៛ -> riel
 */

const KHMER_DIGIT_MAP: Record<string, string> = {
  '០': '0', '១': '1', '២': '2', '៣': '3', '៤': '4',
  '៥': '5', '៦': '6', '៧': '7', '៨': '8', '៩': '9'
};

export function normalizeKhmerDigits(str: string): string {
  return str.replace(/[\u17E0-\u17E9]/g, (ch) => KHMER_DIGIT_MAP[ch] || ch);
}

const KHMER_DIGITS = ['សូន្យ', 'មួយ', 'ពីរ', 'បី', 'បួន', 'ប្រាំ', 'ប្រាំមួយ', 'ប្រាំពីរ', 'ប្រាំបី', 'ប្រាំបួន'];
const KHMER_TENS = ['', 'ដប់', 'ម្ភៃ', 'សាមសិប', 'សែសិប', 'ហាសិប', 'ហុកសិប', 'ចិតសិប', 'ប៉ែតសិប', 'កៅសិប'];

function convertUnder100(n: number): string {
  if (n < 10) return KHMER_DIGITS[n];
  const ten = Math.floor(n / 10);
  const rem = n % 10;
  if (rem === 0) return KHMER_TENS[ten];
  return KHMER_TENS[ten] + KHMER_DIGITS[rem];
}

function convertUnder1000(n: number): string {
  if (n < 100) return convertUnder100(n);
  const hundred = Math.floor(n / 100);
  const rem = n % 100;
  const res = KHMER_DIGITS[hundred] + 'រយ';
  if (rem === 0) return res;
  return res + convertUnder100(rem);
}

function convertUnder10000(n: number): string {
  if (n < 1000) return convertUnder1000(n);
  const thousand = Math.floor(n / 1000);
  const rem = n % 1000;
  const res = KHMER_DIGITS[thousand] + 'ពាន់';
  if (rem === 0) return res;
  return res + convertUnder1000(rem);
}

function convertUnder1000000(n: number): string {
  if (n < 10000) return convertUnder10000(n);
  const meun = Math.floor(n / 10000);
  const rem = n % 10000;
  let meunStr = '';
  if (meun < 10) {
    meunStr = KHMER_DIGITS[meun] + 'ម៉ឺន';
  } else if (meun < 100) {
    meunStr = convertUnder100(meun) + 'ម៉ឺន';
  }
  if (rem === 0) return meunStr;
  return meunStr + convertUnder10000(rem);
}

/**
 * Converts any numeric string or number into spoken Khmer words.
 * Examples:
 *   4000 -> "បួនពាន់"
 *   4004 -> "បួនពាន់បួន"
 *   10000 -> "មួយម៉ឺន"
 *   20000 -> "ពីរម៉ឺន"
 *   45000 -> "បួនម៉ឺនប្រាំពាន់"
 *   100000 -> "ដប់ម៉ឺន"
 *   1000000 -> "មួយលាន"
 *   404.12 -> "បួនរយបួនក្បៀសដប់ពីរ"
 */
export function khmerNumberToWords(num: number | string): string {
  if (num === null || num === undefined) return '';
  const cleanStr = normalizeKhmerDigits(String(num)).replace(/,/g, '').trim();
  const n = parseFloat(cleanStr);
  if (isNaN(n)) return String(num);
  if (n === 0) return 'សូន្យ';
  if (n < 0) return 'ដក' + khmerNumberToWords(Math.abs(n));

  const integerPart = Math.floor(n);
  const decimalStr = cleanStr.includes('.') ? cleanStr.split('.')[1] : '';

  let result = '';
  if (integerPart < 1000000) {
    result = convertUnder1000000(integerPart);
  } else {
    const million = Math.floor(integerPart / 1000000);
    const rem = integerPart % 1000000;
    const millionStr = khmerNumberToWords(million) + 'លាន';
    result = rem === 0 ? millionStr : millionStr + convertUnder1000000(rem);
  }

  if (decimalStr) {
    const decNum = parseInt(decimalStr.slice(0, 2), 10);
    if (!isNaN(decNum) && decNum > 0) {
      result += 'ក្បៀស' + convertUnder100(decNum);
    }
  }
  return result;
}

export function isKhmerText(text?: string): boolean {
  if (!text) return false;
  return /[\u1780-\u17FF]/.test(text);
}

export function normalizeCurrencyAndSymbols(text: string, isKhmer?: boolean): string {
  if (!text) return '';
  let result = text;

  // If isKhmer is not explicitly specified, auto-detect from text
  const khmerMode = isKhmer !== undefined ? isKhmer : isKhmerText(text);

  // 1. Chat symbols & SSML XML character cleanup
  result = result.replace(/<3/g, khmerMode ? 'បេះដូង' : 'love');
  result = result.replace(/&/g, khmerMode ? ' និង ' : ' and ');
  result = result.replace(/[<>]/g, ' ');

  if (khmerMode) {
    // -------------------------------------------------------------------------
    // KHMER MODE: Convert currencies & numbers to natural Khmer spoken words
    // 4,000 ៛ -> បួនពាន់រៀល (never "បួន សូន្យ សូន្យ សូន្យ")
    // -------------------------------------------------------------------------

    // 1. Khmer Riel with amount (prefix): ៛20000, ៛ 20,000, ៛២០០០០
    result = result.replace(
      /៛\s*([0-9\u17E0-\u17E9]+(?:,[0-9\u17E0-\u17E9]+)*(?:\.[0-9\u17E0-\u17E9]+)?)/g,
      (_match, num) => `${khmerNumberToWords(num)} រៀល `
    );

    // 2. Khmer Riel with amount (suffix): 20000៛, 20000 ៛, ២០០០០៛
    result = result.replace(
      /([0-9\u17E0-\u17E9]+(?:,[0-9\u17E0-\u17E9]+)*(?:\.[0-9\u17E0-\u17E9]+)?)\s*៛/g,
      (_match, num) => `${khmerNumberToWords(num)} រៀល `
    );

    // 3. Khmer Riel word: 4,000 រៀល, 4000 KHR, ៤០០០ រៀល
    result = result.replace(
      /([0-9\u17E0-\u17E9]+(?:,[0-9\u17E0-\u17E9]+)*(?:\.[0-9\u17E0-\u17E9]+)?)\s*(?:រៀល|KHR)\b/gi,
      (_match, num) => `${khmerNumberToWords(num)} រៀល `
    );
    result = result.replace(
      /\bKHR\s*([0-9\u17E0-\u17E9]+(?:,[0-9\u17E0-\u17E9]+)*(?:\.[0-9\u17E0-\u17E9]+)?)\b/gi,
      (_match, num) => `${khmerNumberToWords(num)} រៀល `
    );

    // 4. Standalone Riel symbol ៛ or KHR
    result = result.replace(/៛/g, ' រៀល ');
    result = result.replace(/\bKHR\b/gi, ' រៀល ');

    // 5. Dollar with amount (prefix): $5, $ 5.50, $៥, $0.01, $1,000
    result = result.replace(
      /\$\s*([0-9\u17E0-\u17E9]+(?:,[0-9\u17E0-\u17E9]+)*(?:\.[0-9\u17E0-\u17E9]+)?)/g,
      (_match, num) => {
        const val = parseFloat(normalizeKhmerDigits(num).replace(/,/g, ''));
        if (isNaN(val)) return `${num} ដុល្លារ `;
        if (Math.abs(val - 0.01) < 0.0001) return '1 សេន ';
        if (val > 0 && val < 1) {
          const cents = Math.round(val * 100);
          return `${cents === 1 ? '1' : khmerNumberToWords(cents)} សេន `;
        }
        const dollars = Math.floor(val);
        const cents = Math.round((val - dollars) * 100);
        if (cents > 0) {
          return `${khmerNumberToWords(dollars)} ដុល្លារ ${cents === 1 ? '1' : khmerNumberToWords(cents)} សេន `;
        }
        return `${khmerNumberToWords(dollars)} ដុល្លារ `;
      }
    );

    // 6. Dollar with amount (suffix): 5$, 5 $, ៥$, 0.01$, 5 ដុល្លារ, 5 USD
    result = result.replace(
      /([0-9\u17E0-\u17E9]+(?:,[0-9\u17E0-\u17E9]+)*(?:\.[0-9\u17E0-\u17E9]+)?)\s*(?:\$|USD\b|ដុល្លារ)/gi,
      (_match, num) => {
        const val = parseFloat(normalizeKhmerDigits(num).replace(/,/g, ''));
        if (isNaN(val)) return `${num} ដុល្លារ `;
        if (Math.abs(val - 0.01) < 0.0001) return '1 សេន ';
        if (val > 0 && val < 1) {
          const cents = Math.round(val * 100);
          return `${cents === 1 ? '1' : khmerNumberToWords(cents)} សេន `;
        }
        const dollars = Math.floor(val);
        const cents = Math.round((val - dollars) * 100);
        if (cents > 0) {
          return `${khmerNumberToWords(dollars)} ដុល្លារ ${cents === 1 ? '1' : khmerNumberToWords(cents)} សេន `;
        }
        return `${khmerNumberToWords(dollars)} ដុល្លារ `;
      }
    );
    result = result.replace(
      /\bUSD\s*([0-9\u17E0-\u17E9]+(?:,[0-9\u17E0-\u17E9]+)*(?:\.[0-9\u17E0-\u17E9]+)?)\b/gi,
      (_match, num) => {
        const val = parseFloat(normalizeKhmerDigits(num).replace(/,/g, ''));
        if (isNaN(val)) return `${num} ដុល្លារ `;
        if (Math.abs(val - 0.01) < 0.0001) return '1 សេន ';
        if (val > 0 && val < 1) {
          const cents = Math.round(val * 100);
          return `${cents === 1 ? '1' : khmerNumberToWords(cents)} សេន `;
        }
        const dollars = Math.floor(val);
        const cents = Math.round((val - dollars) * 100);
        if (cents > 0) {
          return `${khmerNumberToWords(dollars)} ដុល្លារ ${cents === 1 ? '1' : khmerNumberToWords(cents)} សេន `;
        }
        return `${khmerNumberToWords(dollars)} ដុល្លារ `;
      }
    );

    // 7. Standalone Dollar symbol $ or USD
    result = result.replace(/\$/g, ' ដុល្លារ ');
    result = result.replace(/\bUSD\b/gi, ' ដុល្លារ ');

    // 8. Standalone numbers in Khmer text: Convert remaining numbers to Khmer words
    // so Edge TTS never spells out individual digits like "បួន សូន្យ សូន្យ សូន្យ"
    result = result.replace(
      /([0-9\u17E0-\u17E9]+(?:,[0-9\u17E0-\u17E9]+)*(?:\.[0-9\u17E0-\u17E9]+)?)/g,
      (match) => khmerNumberToWords(match)
    );

    // 9. De-duplicate repeated currency words if templates duplicate them
    result = result.replace(/(?:រៀល\s*){2,}/g, 'រៀល ');
    result = result.replace(/(?:ដុល្លារ\s*){2,}/g, 'ដុល្លារ ');
  } else {
    // -------------------------------------------------------------------------
    // ENGLISH MODE: $ -> dollar/dollars, ៛ -> riel
    // -------------------------------------------------------------------------

    // 1. Khmer Riel with amount (prefix): ៛20000, ៛ 20,000
    result = result.replace(
      /៛\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)/g,
      '$1 riel '
    );

    // 2. Khmer Riel with amount (suffix): 20000៛, 20000 ៛
    result = result.replace(
      /([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)\s*៛/g,
      '$1 riel '
    );

    // 3. Standalone Riel symbol ៛
    result = result.replace(/៛/g, ' riel ');

    // 4. Dollar with amount (prefix): $1 -> 1 dollar, $5 -> 5 dollars, $0.01 -> 1 cent
    result = result.replace(/\$\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)/g, (_match, numStr) => {
      const cleanNum = parseFloat(numStr.replace(/,/g, ''));
      if (isNaN(cleanNum)) return `${numStr} dollars `;
      if (Math.abs(cleanNum - 0.01) < 0.0001) return '1 cent ';
      if (cleanNum > 0 && cleanNum < 1) {
        const cents = Math.round(cleanNum * 100);
        return cents === 1 ? '1 cent ' : `${cents} cents `;
      }
      const dollars = Math.floor(cleanNum);
      const cents = Math.round((cleanNum - dollars) * 100);
      if (cents > 0) {
        return `${dollars === 1 ? '1 dollar' : `${dollars} dollars`} and ${cents === 1 ? '1 cent' : `${cents} cents`} `;
      }
      return cleanNum === 1 ? '1 dollar ' : `${dollars} dollars `;
    });

    // 5. Dollar with amount (suffix): 1$ -> 1 dollar, 5$ -> 5 dollars, 0.01$ -> 1 cent
    result = result.replace(/([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)\s*\$/g, (_match, numStr) => {
      const cleanNum = parseFloat(numStr.replace(/,/g, ''));
      if (isNaN(cleanNum)) return `${numStr} dollars `;
      if (Math.abs(cleanNum - 0.01) < 0.0001) return '1 cent ';
      if (cleanNum > 0 && cleanNum < 1) {
        const cents = Math.round(cleanNum * 100);
        return cents === 1 ? '1 cent ' : `${cents} cents `;
      }
      const dollars = Math.floor(cleanNum);
      const cents = Math.round((cleanNum - dollars) * 100);
      if (cents > 0) {
        return `${dollars === 1 ? '1 dollar' : `${dollars} dollars`} and ${cents === 1 ? '1 cent' : `${cents} cents`} `;
      }
      return cleanNum === 1 ? '1 dollar ' : `${dollars} dollars `;
    });

    // 6. Standalone Dollar symbol $
    result = result.replace(/\$/g, ' dollars ');

    // 7. KHR / USD text tokens
    result = result.replace(/\b([0-9]+(?:,[0-9]+)*)\s*KHR\b/gi, '$1 riel ');
    result = result.replace(/\bKHR\s*([0-9]+(?:,[0-9]+)*)\b/gi, '$1 riel ');
    result = result.replace(/\b([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)\s*USD\b/gi, (_match, numStr) => {
      const cleanNum = parseFloat(numStr.replace(/,/g, ''));
      if (isNaN(cleanNum)) return `${numStr} dollars `;
      if (Math.abs(cleanNum - 0.01) < 0.0001) return '1 cent ';
      if (cleanNum > 0 && cleanNum < 1) {
        const cents = Math.round(cleanNum * 100);
        return cents === 1 ? '1 cent ' : `${cents} cents `;
      }
      const dollars = Math.floor(cleanNum);
      const cents = Math.round((cleanNum - dollars) * 100);
      if (cents > 0) {
        return `${dollars === 1 ? '1 dollar' : `${dollars} dollars`} and ${cents === 1 ? '1 cent' : `${cents} cents`} `;
      }
      return cleanNum === 1 ? '1 dollar ' : `${dollars} dollars `;
    });
    result = result.replace(/\bUSD\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)\b/gi, (_match, numStr) => {
      const cleanNum = parseFloat(numStr.replace(/,/g, ''));
      if (isNaN(cleanNum)) return `${numStr} dollars `;
      if (Math.abs(cleanNum - 0.01) < 0.0001) return '1 cent ';
      if (cleanNum > 0 && cleanNum < 1) {
        const cents = Math.round(cleanNum * 100);
        return cents === 1 ? '1 cent ' : `${cents} cents `;
      }
      const dollars = Math.floor(cleanNum);
      const cents = Math.round((cleanNum - dollars) * 100);
      if (cents > 0) {
        return `${dollars === 1 ? '1 dollar' : `${dollars} dollars`} and ${cents === 1 ? '1 cent' : `${cents} cents`} `;
      }
      return cleanNum === 1 ? '1 dollar ' : `${dollars} dollars `;
    });
    result = result.replace(/\bKHR\b/gi, 'riel');
    result = result.replace(/\bUSD\b/gi, 'dollars');
  }

  // Clean redundant whitespace
  return result.replace(/\s+/g, ' ').trim();
}
