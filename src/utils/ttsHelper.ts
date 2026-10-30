/**
 * TTS Currency & Symbol Voice Normalizer
 * Converts $ and ៛ symbols into natural spoken words based on voice/language context:
 * - Khmer context: $ -> ដុល្លារ, ៛ -> រៀល
 * - English context: $ -> dollar/dollars, ៛ -> riel
 */

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
    // KHMER MODE: $ -> ដុល្លារ, ៛ -> រៀល
    // -------------------------------------------------------------------------

    // 1. Khmer Riel with amount (prefix): ៛20000, ៛ 20,000, ៛២០០០០
    result = result.replace(
      /៛\s*([0-9\u17E0-\u17E9]+(?:,[0-9\u17E0-\u17E9]+)*(?:\.[0-9\u17E0-\u17E9]+)?)/g,
      '$1 រៀល'
    );

    // 2. Khmer Riel with amount (suffix): 20000៛, 20000 ៛, ២០០០០៛
    result = result.replace(
      /([0-9\u17E0-\u17E9]+(?:,[0-9\u17E0-\u17E9]+)*(?:\.[0-9\u17E0-\u17E9]+)?)\s*៛/g,
      '$1 រៀល'
    );

    // 3. Standalone Riel symbol ៛
    result = result.replace(/៛/g, ' រៀល ');

    // 4. Dollar with amount (prefix): $5, $ 5.50, $៥, $0.01, $1,000
    result = result.replace(
      /\$\s*([0-9\u17E0-\u17E9]+(?:,[0-9\u17E0-\u17E9]+)*(?:\.[0-9\u17E0-\u17E9]+)?)/g,
      '$1 ដុល្លារ'
    );

    // 5. Dollar with amount (suffix): 5$, 5 $, ៥$
    result = result.replace(
      /([0-9\u17E0-\u17E9]+(?:,[0-9\u17E0-\u17E9]+)*(?:\.[0-9\u17E0-\u17E9]+)?)\s*\$/g,
      '$1 ដុល្លារ'
    );

    // 6. Standalone Dollar symbol $
    result = result.replace(/\$/g, ' ដុល្លារ ');

    // 7. KHR / USD text tokens
    result = result.replace(/\b([0-9\u17E0-\u17E9]+(?:,[0-9\u17E0-\u17E9]+)*)\s*KHR\b/gi, '$1 រៀល');
    result = result.replace(/\bKHR\s*([0-9\u17E0-\u17E9]+(?:,[0-9\u17E0-\u17E9]+)*)\b/gi, '$1 រៀល');
    result = result.replace(
      /\b([0-9\u17E0-\u17E9]+(?:,[0-9\u17E0-\u17E9]+)*(?:\.[0-9\u17E0-\u17E9]+)?)\s*USD\b/gi,
      '$1 ដុល្លារ'
    );
    result = result.replace(
      /\bUSD\s*([0-9\u17E0-\u17E9]+(?:,[0-9\u17E0-\u17E9]+)*(?:\.[0-9\u17E0-\u17E9]+)?)\b/gi,
      '$1 ដុល្លារ'
    );
    result = result.replace(/\bKHR\b/gi, 'រៀល');
    result = result.replace(/\bUSD\b/gi, 'ដុល្លារ');
  } else {
    // -------------------------------------------------------------------------
    // ENGLISH MODE: $ -> dollar/dollars, ៛ -> riel
    // -------------------------------------------------------------------------

    // 1. Khmer Riel with amount (prefix): ៛20000, ៛ 20,000
    result = result.replace(
      /៛\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)/g,
      '$1 riel'
    );

    // 2. Khmer Riel with amount (suffix): 20000៛, 20000 ៛
    result = result.replace(
      /([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)\s*៛/g,
      '$1 riel'
    );

    // 3. Standalone Riel symbol ៛
    result = result.replace(/៛/g, ' riel ');

    // 4. Dollar with amount (prefix): $1 -> 1 dollar, $5 -> 5 dollars, $0.01 -> 0.01 dollars
    result = result.replace(/\$\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)/g, (_match, numStr) => {
      const cleanNum = parseFloat(numStr.replace(/,/g, ''));
      return cleanNum === 1 ? '1 dollar' : `${numStr} dollars`;
    });

    // 5. Dollar with amount (suffix): 1$ -> 1 dollar, 5$ -> 5 dollars
    result = result.replace(/([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)\s*\$/g, (_match, numStr) => {
      const cleanNum = parseFloat(numStr.replace(/,/g, ''));
      return cleanNum === 1 ? '1 dollar' : `${numStr} dollars`;
    });

    // 6. Standalone Dollar symbol $
    result = result.replace(/\$/g, ' dollars ');

    // 7. KHR / USD text tokens
    result = result.replace(/\b([0-9]+(?:,[0-9]+)*)\s*KHR\b/gi, '$1 riel');
    result = result.replace(/\bKHR\s*([0-9]+(?:,[0-9]+)*)\b/gi, '$1 riel');
    result = result.replace(/\b([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)\s*USD\b/gi, (_match, numStr) => {
      const cleanNum = parseFloat(numStr.replace(/,/g, ''));
      return cleanNum === 1 ? '1 dollar' : `${numStr} dollars`;
    });
    result = result.replace(/\bUSD\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)\b/gi, (_match, numStr) => {
      const cleanNum = parseFloat(numStr.replace(/,/g, ''));
      return cleanNum === 1 ? '1 dollar' : `${numStr} dollars`;
    });
    result = result.replace(/\bKHR\b/gi, 'riel');
    result = result.replace(/\bUSD\b/gi, 'dollars');
  }

  // Clean redundant whitespace
  return result.replace(/\s+/g, ' ').trim();
}
