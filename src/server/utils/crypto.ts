import crypto from 'crypto';

/**
 * Returns a 32-byte key derived for AES-256-GCM encryption.
 * Prioritizes TELEGRAM_SESSION_ENCRYPTION_KEY, then JWT_SECRET, or fallback.
 */
function getEncryptionKey(): Buffer {
  const secret =
    process.env.TELEGRAM_SESSION_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    'streambotkh_default_secure_tele_key_2026';

  // Derive exact 32-byte key using SHA-256
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt a sensitive string (e.g., GramJS Telegram sessionString) using AES-256-GCM.
 * Output format: enc:v1:<hex_iv>:<hex_auth_tag>:<hex_ciphertext>
 */
export function encryptTelegramSession(plainText: string): string {
  if (!plainText || typeof plainText !== 'string') return '';
  // If already encrypted, don't double-encrypt
  if (plainText.startsWith('enc:v1:')) return plainText;

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(12); // 12-byte IV standard for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return `enc:v1:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (err) {
    console.error('❌ [Crypto] Encryption failed:', err);
    throw new Error('Failed to encrypt Telegram session');
  }
}

/**
 * Decrypt an AES-256-GCM encrypted Telegram sessionString.
 * Backward compatible: if the string is legacy plaintext, returns it as-is.
 */
export function decryptTelegramSession(cipherTextOrPlain: string): string {
  if (!cipherTextOrPlain || typeof cipherTextOrPlain !== 'string') return '';
  if (!cipherTextOrPlain.startsWith('enc:v1:')) {
    // Legacy unencrypted plaintext session
    return cipherTextOrPlain;
  }

  try {
    const parts = cipherTextOrPlain.split(':');
    if (parts.length !== 5) {
      console.warn('⚠️ [Crypto] Invalid encrypted session format');
      return '';
    }

    const iv = Buffer.from(parts[2], 'hex');
    const authTag = Buffer.from(parts[3], 'hex');
    const ciphertext = parts[4];

    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('❌ [Crypto] Decryption failed (invalid key or corrupted session):', err);
    return '';
  }
}

/**
 * Mask sensitive phone number for display (e.g., +855 12 *** 789)
 */
export function maskPhoneNumber(phone?: string): string {
  if (!phone || typeof phone !== 'string') return '';
  const clean = phone.trim();
  if (clean.length <= 6) return '***';
  const start = clean.slice(0, 5);
  const end = clean.slice(-3);
  return `${start} *** ${end}`;
}

/**
 * Generate a cryptographically secure 256-bit overlay secret credential token.
 * Format: ovl_sec_<64 hex chars> (total length: 72 characters)
 * Entropy: 256 bits (CSPRNG via crypto.randomBytes)
 * 
 * Provides defense against token guessing, dictionary attacks, and overlay spamming.
 */
export function generateSecureOverlayToken(): string {
  return `ovl_sec_${crypto.randomBytes(32).toString('hex')}`;
}
