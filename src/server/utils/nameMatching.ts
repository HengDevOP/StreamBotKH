/**
 * Robust bank name and donor name matching for Cambodian banking & GramJS alerts.
 * Supports:
 * - Case insensitivity (lowercase, UPPERCASE, MixedCase)
 * - Order independence (First Name Last Name vs Last Name First Name, e.g. "Sokpheak Tra" vs "TRA SOKPHEAK")
 * - Substring matching ("Sokpheak" matches "SOKPHEAK TRA", "TRA" matches "SOKPHEAK TRA")
 * - Punctuation stripping ("SOKPHEAK, TRA" -> "sokpheak tra")
 * - Title stripping ("MR SOKPHEAK TRA" -> "sokpheak tra")
 * - Raw Telegram bank message text matching
 */

const GENERIC_BANK_KEYWORDS = new Set([
  'aba',
  'bakong',
  'acleda',
  'wing',
  'canadia',
  'khqr',
  'bank',
  'unknown',
  'mobile',
  'payway',
  'app',
  'pay',
  'payment',
  'transfer',
  'received',
  'transferred'
]);

export function normalizeName(s?: string | null): string {
  if (!s || typeof s !== 'string') return '';
  return s
    .toLowerCase()
    .replace(/[.,\-_/()#:@!&?"]/g, ' ')
    .replace(/\b(mr|mrs|ms|dr|miss)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isGenericBankKeyword(word: string): boolean {
  return GENERIC_BANK_KEYWORDS.has(word.toLowerCase().trim());
}

/**
 * Compare two personal or banking names.
 * Supports:
 * - exact and substring
 * - reversed words (e.g. "Sokpheak Tra" vs "TRA SOKPHEAK")
 * - token subsets (e.g. "Sokpheak" in "SOKPHEAK TRA")
 * - significant token matching (length >= 3)
 */
export function matchBankNames(incomingName?: string | null, candidateName?: string | null): boolean {
  if (!incomingName || !candidateName) return false;

  const a = normalizeName(incomingName);
  const b = normalizeName(candidateName);

  if (!a || !b) return false;

  // 1. Direct exact or substring match
  if (a === b || a.includes(b) || b.includes(a)) {
    return true;
  }

  // 2. Tokenize words (e.g. ["sokpheak", "tra"])
  const tokensA = a.split(' ').filter((w) => w.length > 0);
  const tokensB = b.split(' ').filter((w) => w.length > 0);

  if (tokensA.length === 0 || tokensB.length === 0) return false;

  // 3. Exact match with sorted tokens (handles inverted First Name / Last Name)
  // e.g. "Sokpheak Tra" vs "Tra Sokpheak"
  const sortedA = [...tokensA].sort().join(' ');
  const sortedB = [...tokensB].sort().join(' ');
  if (sortedA === sortedB) {
    return true;
  }

  // 4. Subset matching: all tokens of one are present in the other
  // e.g. donor wrote "Tra" and bank notification is "SOKPHEAK TRA"
  // or donor wrote "Sokpheak" and bank notification is "TRA SOKPHEAK"
  const allAInB = tokensA.every((tok) => tokensB.includes(tok));
  const allBInA = tokensB.every((tok) => tokensA.includes(tok));
  if (allAInB || allBInA) {
    return true;
  }

  // 5. Significant word match: any word of 3+ letters matches
  // e.g. "Sokpheak" matches "MR SOKPHEAK TRA"
  const hasSignificantMatch = tokensA.some(
    (tokA) => tokA.length >= 3 && tokensB.some((tokB) => tokB.includes(tokA) || tokA.includes(tokB))
  );

  return hasSignificantMatch;
}

/**
 * Check whether a candidate bank name appears in a raw banking message text.
 * Avoids false positives on single generic keywords while allowing full match.
 */
export function matchesBankNameInText(rawText?: string | null, candidateBankName?: string | null): boolean {
  if (!rawText || !candidateBankName) return false;

  const normRaw = normalizeName(rawText);
  const normCandidate = normalizeName(candidateBankName);

  if (!normRaw || !normCandidate) return false;

  // 1. Direct substring check (e.g. "ho chenheng" in "received $5 from ho chenheng at ho chenheng")
  if (normCandidate.length >= 2 && normRaw.includes(normCandidate)) {
    return true;
  }

  // 2. Check personal tokens (ignoring generic terms like "bank", "khqr", "aba", "payway")
  const personalTokens = normCandidate
    .split(' ')
    .filter((tok) => tok.length >= 2 && !isGenericBankKeyword(tok));

  if (personalTokens.length === 0) return false;

  // If every personal token (e.g. "sokpheak", "tra") appears in the message text
  if (personalTokens.every((tok) => normRaw.includes(tok))) {
    return true;
  }

  // If candidate has at least one strong personal token (>= 3 chars) that appears in text
  if (personalTokens.some((tok) => tok.length >= 3 && normRaw.includes(tok))) {
    return true;
  }

  return false;
}

export interface TemporaryDonationCandidate {
  id: string;
  streamer_id: string;
  donor_name: string;
  donor_message?: string | null;
  amount: number;
  currency: string;
  banking_name?: string | null;
  video_url?: string | null;
  video_title?: string | null;
  video_start_time?: number | null;
  video_end_time?: number | null;
  created_at?: string | null;
}

export interface MatchingCriteria {
  donorName?: string | null;
  payerName?: string | null;
  bankingName?: string | null;
  rawText?: string | null;
  senderName?: string | null;
  amount?: number | null;
}

/**
 * Finds the matching active temporary donation session given incoming GramJS / Bank notification criteria.
 */
export function findMatchingTemporaryDonation(
  candidates: TemporaryDonationCandidate[],
  criteria: MatchingCriteria
): TemporaryDonationCandidate | null {
  if (!candidates || candidates.length === 0) return null;

  const payer = (criteria.payerName || criteria.donorName || '').trim();

  // 1. Try matching incoming Payer Name against candidate.banking_name (Payer Name / Bank Name on form)
  for (const candidate of candidates) {
    const bankName = candidate.banking_name;
    if (!bankName) continue;

    // A. Match against incoming payer name (e.g. "HO CHENHENG" vs "HO", "SOKPHEAK TRA" vs "Tra Sokpheak")
    if (payer && matchBankNames(payer, bankName)) {
      return candidate;
    }

    // B. Match against raw message text (e.g. "from HO CHENHENG via ABA" or "Payer: HO CHENHENG")
    if (criteria.rawText && matchesBankNameInText(criteria.rawText, bankName)) {
      return candidate;
    }

    // C. Match against Telegram sender name
    if (criteria.senderName && matchBankNames(criteria.senderName, bankName)) {
      return candidate;
    }

    // D. Match against parsed banking name if candidate entered bank name like "ABA"
    if (criteria.bankingName && matchBankNames(criteria.bankingName, bankName)) {
      if (criteria.amount && Math.abs(criteria.amount - candidate.amount) < 0.01) {
        return candidate;
      }
    }
  }

  // 2. Try matching incoming Payer Name against candidate.donor_name (Username/display name entered by user)
  for (const candidate of candidates) {
    const dName = candidate.donor_name;
    if (!dName) continue;

    if (payer && matchBankNames(payer, dName)) {
      return candidate;
    }

    if (criteria.rawText && matchesBankNameInText(criteria.rawText, dName)) {
      return candidate;
    }

    if (criteria.senderName && matchBankNames(criteria.senderName, dName)) {
      return candidate;
    }
  }

  // 3. Amount-based matching: if candidate amount matches criteria.amount exactly
  if (criteria.amount && criteria.amount > 0) {
    for (const candidate of candidates) {
      if (Math.abs(candidate.amount - criteria.amount) < 0.01) {
        // If there is any token match or this is the only active pending session
        if (
          candidates.length === 1 ||
          (candidate.banking_name && matchesBankNameInText(criteria.rawText, candidate.banking_name)) ||
          (candidate.donor_name && matchesBankNameInText(criteria.rawText, candidate.donor_name)) ||
          (payer && matchBankNames(payer, candidate.banking_name)) ||
          (payer && matchBankNames(payer, candidate.donor_name)) ||
          matchBankNames(criteria.senderName, candidate.banking_name)
        ) {
          return candidate;
        }
      }
    }
  }

  // 4. Single pending session fallback: if only 1 pending session exists, match it
  if (candidates.length === 1) {
    return candidates[0];
  }

  return null;
}
