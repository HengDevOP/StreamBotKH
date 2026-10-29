/**
 * StreamBotKH - Telegram Phrase Catcher Engine
 * Analyzes incoming Telegram group messages, bank SMS forwards, and bot commands
 * to extract donation amounts, currencies, donor names, banking providers, and messages.
 */

export interface ParsedDonationPhrase {
  matched: boolean;
  donorName: string;
  payerName?: string;
  recipient?: string;
  amount: number;
  currency: 'USD' | 'KHR';
  bankingName: string;
  donorMessage?: string;
  transactionRef?: string;
  confidence: number; // 0 to 1
  rawText: string;
}

const KNOWN_BANKS = new Set([
  'aba', 'aba bank', 'aba mobile', 'aba payway', 'payway',
  'bakong', 'bakong khqr', 'khqr',
  'acleda', 'acleda bank', 'acleda toanchet',
  'wing', 'wing bank', 'wing money',
  'canadia', 'canadia bank',
  'sathapana', 'sathapana bank',
  'j trust', 'j trust royal',
  'chip mong', 'chip mong bank',
  'prince', 'prince bank',
  'shinhan', 'shinhan bank',
  'cpbank', 'cambodia post bank',
  'bank', 'unknown'
]);

const GENERIC_EXCLUDE_WORDS = new Set([
  'payment', 'transfer', 'received', 'transferred', 'alert', 'notice',
  'notification', 'deposit', 'successful', 'success', 'pending',
  'amount', 'total', 'charge', 'fee', 'date', 'time', 'ref', 'trx', 'apv'
]);

export class PhraseCatcher {
  /**
   * Parse any message text received from a Telegram group or channel
   */
  public static parse(text: string, senderName: string = 'Anonymous'): ParsedDonationPhrase {
    const cleanText = text.trim();
    if (!cleanText) {
      return this.emptyResult(cleanText, senderName);
    }

    // 1. Try Streamer Bot Commands (/tip, !tip, /alert)
    if (/^[/!](\w+)/.test(cleanText)) {
      const commandResult = this.parseCommandMessage(cleanText, senderName);
      if (commandResult.matched) return commandResult;
    }

    // 2. Specific Bank checks based on provider brand presence
    const lower = cleanText.toLowerCase();

    if (lower.includes('bakong')) {
      const bakongResult = this.parseBakongMessage(cleanText, senderName);
      if (bakongResult.matched) return bakongResult;
    }

    if (lower.includes('acleda')) {
      const acledaResult = this.parseAcledaMessage(cleanText, senderName);
      if (acledaResult.matched) return acledaResult;
    }

    if (lower.includes('wing')) {
      const wingResult = this.parseWingMessage(cleanText, senderName);
      if (wingResult.matched) return wingResult;
    }

    if (lower.includes('canadia')) {
      const canadiaResult = this.parseCanadiaMessage(cleanText, senderName);
      if (canadiaResult.matched) return canadiaResult;
    }

    if (lower.includes('aba')) {
      const abaResult = this.parseAbaMessage(cleanText, senderName);
      if (abaResult.matched) return abaResult;
    }

    // 3. Generic Payment Catch-all (e.g. "Received $5 from John: Great stream")
    const genericResult = this.parseGenericPayment(cleanText, senderName);
    if (genericResult.matched) return genericResult;

    return this.emptyResult(cleanText, senderName);
  }

  private static emptyResult(rawText: string, donorName: string): ParsedDonationPhrase {
    return {
      matched: false,
      donorName,
      amount: 0,
      currency: 'USD',
      bankingName: 'Unknown',
      confidence: 0,
      rawText
    };
  }

  /**
   * Pattern: ABA Mobile / PayWay Push Notifications
   */
  private static parseAbaMessage(text: string, fallbackName: string): ParsedDonationPhrase {
    const { amount, currency } = this.extractAmountAndCurrency(text);
    if (amount <= 0) return this.emptyResult(text, fallbackName);

    const donorName = this.extractDonorName(text, fallbackName);
    const donorMessage = this.extractDonorMessage(text);
    const transactionRef = this.extractRef(text);
    const recipient = this.extractRecipient(text);

    return {
      matched: true,
      donorName,
      payerName: donorName,
      recipient,
      amount,
      currency,
      bankingName: 'ABA Bank',
      donorMessage,
      transactionRef,
      confidence: 0.95,
      rawText: text
    };
  }

  /**
   * Pattern: Bakong KHQR Transfer Notifications
   */
  private static parseBakongMessage(text: string, fallbackName: string): ParsedDonationPhrase {
    const { amount, currency } = this.extractAmountAndCurrency(text);
    if (amount <= 0) return this.emptyResult(text, fallbackName);

    const donorName = this.extractDonorName(text, fallbackName);
    const donorMessage = this.extractDonorMessage(text);
    const transactionRef = this.extractRef(text);
    const recipient = this.extractRecipient(text);

    return {
      matched: true,
      donorName,
      payerName: donorName,
      recipient,
      amount,
      currency,
      bankingName: 'Bakong KHQR',
      donorMessage,
      transactionRef,
      confidence: 0.95,
      rawText: text
    };
  }

  /**
   * Pattern: ACLEDA Bank Notifications
   */
  private static parseAcledaMessage(text: string, fallbackName: string): ParsedDonationPhrase {
    const { amount, currency } = this.extractAmountAndCurrency(text);
    if (amount <= 0) return this.emptyResult(text, fallbackName);

    const donorName = this.extractDonorName(text, fallbackName);
    const donorMessage = this.extractDonorMessage(text);
    const transactionRef = this.extractRef(text);
    const recipient = this.extractRecipient(text);

    return {
      matched: true,
      donorName,
      payerName: donorName,
      recipient,
      amount,
      currency,
      bankingName: 'ACLEDA Bank',
      donorMessage,
      transactionRef,
      confidence: 0.95,
      rawText: text
    };
  }

  /**
   * Pattern: Wing Bank Notifications
   */
  private static parseWingMessage(text: string, fallbackName: string): ParsedDonationPhrase {
    const { amount, currency } = this.extractAmountAndCurrency(text);
    if (amount <= 0) return this.emptyResult(text, fallbackName);

    const donorName = this.extractDonorName(text, fallbackName);
    const donorMessage = this.extractDonorMessage(text);
    const transactionRef = this.extractRef(text);
    const recipient = this.extractRecipient(text);

    return {
      matched: true,
      donorName,
      payerName: donorName,
      recipient,
      amount,
      currency,
      bankingName: 'Wing Bank',
      donorMessage,
      transactionRef,
      confidence: 0.95,
      rawText: text
    };
  }

  /**
   * Pattern: Canadia Bank Notifications
   */
  private static parseCanadiaMessage(text: string, fallbackName: string): ParsedDonationPhrase {
    const { amount, currency } = this.extractAmountAndCurrency(text);
    if (amount <= 0) return this.emptyResult(text, fallbackName);

    const donorName = this.extractDonorName(text, fallbackName);
    const donorMessage = this.extractDonorMessage(text);
    const transactionRef = this.extractRef(text);
    const recipient = this.extractRecipient(text);

    return {
      matched: true,
      donorName,
      payerName: donorName,
      recipient,
      amount,
      currency,
      bankingName: 'Canadia Bank',
      donorMessage,
      transactionRef,
      confidence: 0.95,
      rawText: text
    };
  }

  /**
   * Pattern: Bot Commands in Telegram Group
   * e.g. "/tip $5 Great stream"
   * e.g. "!tip 10 from David: Awesome gameplay"
   * e.g. "/alert 40000 KHR from Chanthy: Keep it up bro!"
   */
  private static parseCommandMessage(text: string, fallbackName: string): ParsedDonationPhrase {
    const cmdMatch = text.match(/^[/!](\w+)\s+(.+)$/i);
    if (!cmdMatch) return this.emptyResult(text, fallbackName);

    const cmd = cmdMatch[1].toLowerCase();
    if (!['tip', 'alert', 'donate', 'cheer'].includes(cmd)) {
      return this.emptyResult(text, fallbackName);
    }

    const rest = cmdMatch[2].trim();
    const { amount, currency } = this.extractAmountAndCurrency(rest);
    if (amount <= 0) return this.emptyResult(text, fallbackName);

    // Remove the matched amount part to analyze name & message
    let remaining = rest
      .replace(/\$?\s*(\d+(?:\.\d{1,2})?)\s*(?:USD|\$)?/i, '')
      .replace(/(\d{1,3}(?:,\d{3})+|\d+)\s*(?:KHR|៛|Riel)/i, '')
      .trim();

    let donorName = fallbackName;
    let donorMessage = remaining;

    const fromMatch = remaining.match(/from\s+([A-Za-z0-9_\s\u1780-\u17FF]+?)(?:\s*[:\-–]\s*|\s+message:\s*|\s+msg:\s*|\s+)(.*)$/i);
    if (fromMatch) {
      donorName = fromMatch[1].trim();
      donorMessage = fromMatch[2].trim();
    } else {
      const splitMatch = remaining.match(/^([A-Za-z0-9_\u1780-\u17FF]+)\s*[:\-–]\s*(.+)$/);
      if (splitMatch) {
        donorName = splitMatch[1].trim();
        donorMessage = splitMatch[2].trim();
      }
    }

    return {
      matched: true,
      donorName: donorName || fallbackName,
      payerName: donorName || fallbackName,
      amount,
      currency,
      bankingName: 'Telegram Group',
      donorMessage: donorMessage || undefined,
      confidence: 0.95,
      rawText: text
    };
  }

  /**
   * Generic Payment Catch-all
   */
  private static parseGenericPayment(text: string, fallbackName: string): ParsedDonationPhrase {
    const paymentKeywords = /received|transferred|tip|donation|paid|sent|forwarded/i;
    if (!paymentKeywords.test(text)) {
      return this.emptyResult(text, fallbackName);
    }

    const { amount, currency } = this.extractAmountAndCurrency(text);
    if (amount <= 0) return this.emptyResult(text, fallbackName);

    const donorName = this.extractDonorName(text, fallbackName);
    const donorMessage = this.extractDonorMessage(text);
    const transactionRef = this.extractRef(text);
    const recipient = this.extractRecipient(text);

    return {
      matched: true,
      donorName,
      payerName: donorName,
      recipient,
      amount,
      currency,
      bankingName: 'Bakong KHQR',
      donorMessage,
      transactionRef,
      confidence: 0.85,
      rawText: text
    };
  }

  // --- Helper extraction utilities ---

  private static extractAmountAndCurrency(text: string): { amount: number; currency: 'USD' | 'KHR' } {
    // 1. Check Khmer Riel (e.g. 40,000 KHR, 40000 ៛)
    const khrMatch = text.match(/(\d{1,3}(?:,\d{3})+|\d+)\s*(?:KHR|៛|Riel)/i);
    if (khrMatch) {
      const val = parseFloat(khrMatch[1].replace(/,/g, ''));
      if (val > 0) return { amount: val, currency: 'KHR' };
    }

    // 2. Check USD (e.g. $5.00, 5.00 USD, $10, 10$)
    const usdMatch = text.match(/(?:\$|\bUSD\s*)\s*(\d+(?:\.\d{1,2})?)/i) ||
                     text.match(/(\d+(?:\.\d{1,2})?)\s*(?:\$|\bUSD\b)/i) ||
                     text.match(/(?:received|transferred|\+)\s*\$?\s*(\d+(?:\.\d{1,2})?)/i);

    if (usdMatch) {
      const val = parseFloat(usdMatch[1]);
      if (val > 0) return { amount: val, currency: 'USD' };
    }

    return { amount: 0, currency: 'USD' };
  }

  private static cleanCandidate(s: string): string {
    if (!s) return '';
    return s
      .replace(/\s*\([^\)]*\)\s*$/, '')
      .replace(/^[:\-–\s]+/, '')
      .replace(/[:\-–\s]+$/, '')
      .replace(/\s+\bto\b\s+.*$/i, '')
      .replace(/\s+\bat\b\s+.*$/i, '')
      .replace(/\s+\bon\b\s+.*$/i, '')
      .trim();
  }

  private static isBankBrand(name: string): boolean {
    if (!name) return false;
    const clean = name.toLowerCase().replace(/[.,\-_/()#:@!&?"]/g, ' ').replace(/\s+/g, ' ').trim();
    if (KNOWN_BANKS.has(clean)) return true;
    const banks = Array.from(KNOWN_BANKS);
    for (let i = 0; i < banks.length; i++) {
      const b = banks[i];
      if (clean === b || clean.startsWith(b + ' ') || clean.endsWith(' ' + b)) return true;
    }
    return false;
  }

  private static isValidPersonName(name: string): boolean {
    if (!name || typeof name !== 'string') return false;
    const clean = name.trim();
    if (clean.length < 2) return false;
    if (/^\d+$/.test(clean)) return false;
    const lower = clean.toLowerCase();
    if (this.isBankBrand(lower)) return false;
    if (GENERIC_EXCLUDE_WORDS.has(lower)) return false;
    return true;
  }

  private static extractDonorName(text: string, fallbackName: string): string {
    if (!text) return fallbackName;

    // 1. Explicit Payer / Payer Name label (Highest priority in ABA & Bot receipts)
    // Matches e.g. "Payer: SOKHA CHHIM", "Payer Name: SOKHA CHHIM", "Payer / Sender: SOKHA CHHIM", "អ្នកទូទាត់: សុខា"
    const payerMatch = text.match(
      /(?:payer\s*(?:name|account)?|payer\s*\/\s*sender|អ្នកទូទាត់|ឈ្មោះអ្នកទូទាត់|ឈ្មោះអ្នកផ្ញើ|អ្នកផ្ញើ)\s*[:\-–]\s*([A-Za-z0-9_\s\u1780-\u17FF]+?)(?:\s*(?:\(\*[0-9]+\)|\([^\)]+\)|\bvia\b|\bon\b|\bto\b|\bat\b|Ref|Trx|Trans|Bank|Account|Remark|Message|Note|amount|\s+ចំនួន|ទៅ|[:\-–]|\.|\n|$))/i
    );
    if (payerMatch) {
      const candidate = this.cleanCandidate(payerMatch[1]);
      if (this.isValidPersonName(candidate)) {
        return candidate;
      }
    }

    // 2. Paid by pattern: checking the phrase after "paid by {payer}"
    // Supported following delimiters: (*1234), to <recipient>, at <time/merchant>, on <date>, via <channel>, for <reason>, Trx/Ref/APV, Message/Note, punctuation [.:-], \n, $
    const paidByMatch = text.match(
      /paid\s+by\s+([A-Za-z0-9_\s\u1780-\u17FF]+?)(?:\s*(?:\(\*[0-9]+\)|\([^\)]+\)|\bto\b|\bat\b|\bon\b|\bvia\b|\bfor\b|Trx|Trans|Ref|APV|Remark|Message|Note|[:\-–]|\.|\n|$))/i
    );
    if (paidByMatch) {
      const candidate = this.cleanCandidate(paidByMatch[1]);
      if (this.isValidPersonName(candidate)) {
        return candidate;
      }
    }

    // 3. Sender / From patterns:
    // e.g. "from SOKHA CHHIM (ABA Bank)", "received from SOKHA CHHIM", "From: SOKHA CHHIM"
    const fromRegex = /(?:from|received\s+from|sender(?:\s*name)?|sent\s+by|customer(?:\s*name)?|account\s+name|ពី|ពីឈ្មោះ)\s*[:\-–]?\s*([A-Za-z0-9_\s\u1780-\u17FF]+?)(?:\s*(?:\(\*[0-9]+\)|\([^\)]+\)|\bvia\b|\bon\b|\bto\b|\bat\b|Ref|Trx|Trans|Bank|Account|Remark|Message|Note|amount|\s+ចំនួន|ទៅ|[:\-–]|\.|\n|$))/gi;
    let match: RegExpExecArray | null;
    while ((match = fromRegex.exec(text)) !== null) {
      const candidate = this.cleanCandidate(match[1]);
      if (this.isValidPersonName(candidate)) {
        return candidate;
      }
    }

    // 4. Natural language receipt: 'received a payment of $X from <Payer>'
    const naturalMatch = text.match(
      /(?:received(?:\s+a\s+payment)?(?:\s+of)?\s*(?:\$|KHR|៛)?\s*\d+(?:\.\d{1,2})?\s*(?:USD|KHR|៛|\$)?)\s+from\s+([A-Za-z0-9_\s\u1780-\u17FF]+?)(?:\s*(?:\([^\)]+\)|\bvia\b|\bon\b|\bto\b|\bat\b|Ref|Trx|Trans|Bank|[:\-–]|\.|\n|$))/i
    );
    if (naturalMatch) {
      const candidate = this.cleanCandidate(naturalMatch[1]);
      if (this.isValidPersonName(candidate)) {
        return candidate;
      }
    }

    return this.isValidPersonName(fallbackName) ? fallbackName : 'Generous Supporter';
  }

  private static extractRecipient(text: string): string | undefined {
    // Looks for "to <Recipient>" or "at <Merchant>"
    // Avoids matching "at 14:30" (time)
    const match =
      text.match(/\bto\s+(?!\bon\b|\bat\b|\bvia\b|\bfor\b)([A-Za-z0-9_@\u1780-\u17FF]+(?:\s+(?!\bon\b|\bat\b|\bvia\b|\bfor\b)[A-Za-z0-9_@\u1780-\u17FF]+)?)(?:\s*(?:\bon\b|\bat\b|\bvia\b|Trx|Trans|Ref|APV|Remark|Message|Note|[:\-–]|\.|\n|$))/i) ||
      text.match(/\bat\s+(?!\d{1,2}:\d{2})([A-Za-z0-9_@\u1780-\u17FF]+(?:\s+[A-Za-z0-9_@\u1780-\u17FF]+)?)(?:\s*(?:\bon\b|\bvia\b|Trx|Trans|Ref|APV|Remark|Message|Note|[:\-–]|\.|\n|$))/i);

    if (match && match[1].trim()) {
      const rec = match[1].trim();
      if (!this.isBankBrand(rec) && !/^\d+$/.test(rec) && rec.length >= 2) {
        return rec;
      }
    }
    return undefined;
  }

  private static extractDonorMessage(text: string): string | undefined {
    // 1. Explicit message keywords (e.g. "Remark: Great stream!", "Message: Keep it up", "Note: Ace that")
    const labelMatch = text.match(/(?:message|remark|note|msg|description|comment|context|memo|reason)\s*[:\-–]\s*([^\n\r]+)/i);
    if (labelMatch && labelMatch[1].trim()) {
      const clean = labelMatch[1].trim();
      if (!/^(trx|apv|ref|bank|date|\d{1,2}:\d{2})/i.test(clean)) {
        return clean;
      }
    }

    // 2. Extra phrase after "paid by {payer}"
    // e.g. "$5.00 paid by SOKHA CHHIM on 26-Oct-2026 at 14:30. Trx. ID: 179301304085823, APV: 538813. Great stream bro!"
    // e.g. "$5 paid by VANDY RATH: Ace that round!"
    // e.g. "Paid by HO CHENHENG (*1234) to NEON on 27-Oct-2026. Keep it up!"
    const paidByMatch = text.match(/paid\s+by\s+([A-Za-z0-9_\s\u1780-\u17FF]+?)(?:\s*(?:\(\*[0-9]+\)|\([^\)]+\)|\bto\b|\bat\b|\bon\b|\bvia\b|\bfor\b|Trx|Trans|Ref|APV|Remark|Message|Note|[:\-–]|\.|\n|$))/i);
    if (paidByMatch) {
      const payer = paidByMatch[1].trim();
      const idx = paidByMatch.index! + paidByMatch[0].indexOf(payer) + payer.length;
      const afterPhrase = text.slice(idx);

      let clean = afterPhrase
        .replace(/^\s*\(\*[0-9]+\)\s*/i, '')
        .replace(/^\s*\([^\)]+\)\s*/i, '')
        .replace(/\bon\s+(?:[A-Za-z]+\s+\d{1,2}|\d{1,2}[-/][A-Za-z0-9]+(?:[-/]\d{2,4})?)(?:,?\s*\d{1,2}:\d{2}(?:\s*(?:AM|PM))?)?/gi, '')
        .replace(/\bat\s+\d{1,2}:\d{2}(?:\s*(?:AM|PM))?/gi, '')
        .replace(/\bvia\s+[A-Za-z0-9_\s]+?(?=\s+at\b|\s+to\b|\s+on\b|\s+Trx|\s+Ref|\s+APV|[.:\n]|$)/gi, '')
        .replace(/\bat\s+(?!\d{1,2}:\d{2})[A-Za-z0-9_@\s\u1780-\u17FF]+?(?=\s+on\b|\s+via\b|\s+to\b|\s+Trx|\s+Ref|\s+APV|[.:\n]|$)/gi, '')
        .replace(/\bto\s+[A-Za-z0-9_@\s\u1780-\u17FF]+?(?=\s+on\b|\s+via\b|\s+at\b|\s+Trx|\s+Ref|\s+APV|[.:\n]|$)/gi, '')
        .replace(/(?:trx\.?\s*id|tran\s*id|trans\s*id|txid|ref(?:erence)?(?:\s*no|\s*id)?|hash)\s*[:\-–]?\s*[A-Za-z0-9_-]+/gi, '')
        .replace(/apv\s*[:\-–]?\s*[A-Za-z0-9_-]+/gi, '')
        .replace(/(?:remark|message|note|msg|memo|context)\s*[:\-–]?\s*/gi, '')
        .replace(/^[.\s,–:;-]+/, '')
        .replace(/[.\s,–:;-]+$/, '')
        .trim();

      if (clean && clean.length > 1 && !/^(trx|apv|ref|bank|\d{1,2}:\d{2}|via|aba|khqr)/i.test(clean)) {
        return clean;
      }
    }

    // 3. Fallback for line-based messages where the last line is a message without labels
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length > 1) {
      const lastLine = lines[lines.length - 1];
      const isBankHeader = /paid\s+by|received|transferred|via\s+aba|trx|apv|ref|\$\d/i.test(lastLine);
      if (!isBankHeader && lastLine.length > 1) {
        return lastLine;
      }
    }

    return undefined;
  }

  private static extractRef(text: string): string | undefined {
    const refMatch =
      text.match(/(?:trx\.?\s*id|tran\s*id|txid|transaction\s*id|ref(?:erence)?(?:\s*no|\s*id)?|hash|\bid)\s*[:\-–]\s*([A-Za-z0-9_-]+)/i) ||
      text.match(/apv\s*[:\-–]\s*([A-Za-z0-9_-]+)/i);
    if (refMatch && refMatch[1].trim()) {
      return refMatch[1].trim();
    }
    return undefined;
  }
}
