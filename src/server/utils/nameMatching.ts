/**
 * Robust bank name and donor name matching for Cambodian banking & GramJS alerts.
 * Supports:
 * - Strict payer name matching (e.g. "HO CHENHENG" matches "HO CHENHENG", "CHENHENG HO", "HO CHEN HENG")
 * - Case insensitivity (lowercase, UPPERCASE, MixedCase)
 * - Order independence (First Name Last Name vs Last Name First Name, e.g. "Sokpheak Tra" vs "TRA SOKPHEAK")
 * - Syllable spacing tolerance (e.g. "HO CHEN HENG" vs "HO CHENHENG")
 * - Punctuation stripping ("SOKPHEAK, TRA" -> "sokpheak tra")
 * - Masked card / account stripping ("HO CHENHENG (*923)" -> "ho chenheng")
 * - Title stripping ("MR SOKPHEAK TRA" -> "sokpheak tra")
 * - Prevents false positive matching from shared single tokens or unrelated amounts
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
  'transferred',
  'supporter',
  'anonymous'
]);

export function normalizeName(s?: string | null): string {
  if (!s || typeof s !== 'string') return '';
  return s
    .toLowerCase()
    .replace(/\(\*?[0-9]+\)/g, ' ')
    .replace(/[.,\-_/()#:@!&?*\"']/g, ' ')
    .replace(/\b(mr|mrs|ms|dr|miss)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isGenericBankKeyword(word: string): boolean {
  if (!word || typeof word !== 'string') return false;
  return GENERIC_BANK_KEYWORDS.has(word.toLowerCase().trim());
}

/**
 * Compare two personal or banking names.
 * Supports:
 * - exact case-insensitive match
 * - inverted First Name / Last Name (e.g. "HO CHENHENG" vs "CHENHENG HO")
 * - joined / separated syllables (e.g. "HO CHEN HENG" vs "HO CHENHENG")
 * - multi-token containment (e.g. "HO CHENHENG SOK" vs "HO CHENHENG")
 * - single token exact match (>= 4 letters only)
 * Strictly avoids false-positive matches across different individuals (e.g. "SOKHA CHEA" vs "HO CHENHENG" -> false).
 */
export function matchBankNames(incomingName?: string | null, candidateName?: string | null): boolean {
  if (!incomingName || !candidateName) return false;

  const a = normalizeName(incomingName);
  const b = normalizeName(candidateName);

  if (!a || !b) return false;
  if (isGenericBankKeyword(a) || isGenericBankKeyword(b)) return false;

  // 1. Direct exact match
  if (a === b) return true;

  // 2. Space-insensitive match (e.g. "ho chen heng" vs "ho chenheng")
  const noSpaceA = a.replace(/\s+/g, '');
  const noSpaceB = b.replace(/\s+/g, '');
  if (noSpaceA.length >= 3 && noSpaceA === noSpaceB) return true;

  // 3. Tokenize words (ignoring numbers & generic keywords)
  const tokensA = a.split(' ').filter((w) => w.length > 0 && !/^\d+$/.test(w) && !isGenericBankKeyword(w));
  const tokensB = b.split(' ').filter((w) => w.length > 0 && !/^\d+$/.test(w) && !isGenericBankKeyword(w));

  if (tokensA.length === 0 || tokensB.length === 0) return false;

  // 4. Sorted token match (handles First Name / Last Name inversion: "HO CHENHENG" vs "CHENHENG HO")
  const sortedA = [...tokensA].sort().join(' ');
  const sortedB = [...tokensB].sort().join(' ');
  if (sortedA === sortedB) return true;

  const sortedCompactA = [...tokensA].sort().join('');
  const sortedCompactB = [...tokensB].sort().join('');
  if (sortedCompactA.length >= 3 && sortedCompactA === sortedCompactB) return true;

  // 5. Multi-token containment:
  // If one name has 2+ tokens and all of its tokens exist in the other name
  // e.g. "HO CHENHENG SOK" vs "HO CHENHENG"
  if (tokensA.length >= 2 && tokensA.every((tok) => tokensB.includes(tok))) return true;
  if (tokensB.length >= 2 && tokensB.every((tok) => tokensA.includes(tok))) return true;

  // 6. Single word exact match ONLY if token has >= 4 characters and matches a unique token
  // E.g. Candidate typed "CHENHENG" and Bank is "HO CHENHENG"
  if (tokensA.length === 1 && tokensA[0].length >= 4 && tokensB.includes(tokensA[0])) return true;
  if (tokensB.length === 1 && tokensB[0].length >= 4 && tokensA.includes(tokensB[0])) return true;

  return false;
}

/**
 * Check whether a candidate bank name appears in a raw banking message text.
 * Avoids false positives on single generic keywords while allowing full match.
 */
export function matchesBankNameInText(rawText?: string | null, candidateBankName?: string | null): boolean {
  if (!rawText || !candidateBankName) return false;

  const normRaw = normalizeName(rawText);
  const normCandidate = normalizeName(candidateBankName);

  if (!normRaw || !normCandidate || isGenericBankKeyword(normCandidate)) return false;

  // 1. Direct full candidate match in raw text (e.g. "ho chenheng" in "paid by ho chenheng")
  if (normCandidate.length >= 3 && normRaw.includes(normCandidate)) {
    return true;
  }

  // 2. Check personal tokens
  const personalTokens = normCandidate
    .split(' ')
    .filter((tok) => tok.length >= 2 && !/^\d+$/.test(tok) && !isGenericBankKeyword(tok));

  if (personalTokens.length === 0) return false;

  // If every personal token (e.g. "sokpheak", "tra") appears in the message text
  if (personalTokens.length >= 2 && personalTokens.every((tok) => normRaw.includes(tok))) {
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
 * Enforces strict payer name matching and amount checking.
 * Strictly no single-candidate blind fallback or loose substring matching.
 */
export function findMatchingTemporaryDonation(
  candidates: TemporaryDonationCandidate[],
  criteria: MatchingCriteria
): TemporaryDonationCandidate | null {
  if (!candidates || candidates.length === 0) return null;

  const payer = (criteria.payerName || criteria.donorName || '').trim();
  if (!payer || isGenericBankKeyword(payer)) return null;

  // 1. Try matching incoming Payer Name against candidate.banking_name (Payer Name / Bank Name entered on form)
  for (const candidate of candidates) {
    // If criteria amount is specified, strictly require amount match within $0.01 tolerance
    if (criteria.amount !== undefined && criteria.amount !== null && criteria.amount > 0) {
      if (Math.abs(candidate.amount - criteria.amount) >= 0.01) {
        continue;
      }
    }

    const bankName = candidate.banking_name;
    if (bankName && matchBankNames(payer, bankName)) {
      return candidate;
    }
  }

  // 2. Try matching incoming Payer Name against candidate.donor_name (if user entered their real name in display name)
  for (const candidate of candidates) {
    if (criteria.amount !== undefined && criteria.amount !== null && criteria.amount > 0) {
      if (Math.abs(candidate.amount - criteria.amount) >= 0.01) {
        continue;
      }
    }

    const dName = candidate.donor_name;
    if (dName && matchBankNames(payer, dName)) {
      return candidate;
    }
  }

  // Strictly no blind fallback! Unmatched payments return null so unrelated pending sessions stay PENDING.
  return null;
}
