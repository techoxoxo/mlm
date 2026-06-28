import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

/**
 * Encrypt a string using AES-256-GCM.
 * Returns a colon-separated string: "iv:authTag:encryptedContent"
 */
export function encrypt(text: string): string {
  const keyHex = process.env.CRYPTO_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error("CRYPTO_ENCRYPTION_KEY must be a 32-byte hex string (64 chars)");
  }
  
  const key = Buffer.from(keyHex, "hex");
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag().toString("hex");
  
  return `${iv.toString("hex")}:${authTag.toString()}:${encrypted}`;
}

/**
 * Decrypt a string encrypted with AES-256-GCM.
 */
export function decrypt(ciphertext: string): string {
  const keyHex = process.env.CRYPTO_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error("CRYPTO_ENCRYPTION_KEY must be a 32-byte hex string (64 chars)");
  }
  
  const key = Buffer.from(keyHex, "hex");
  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid ciphertext format. Expected iv:authTag:content");
  }
  
  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encryptedText = parts[2];
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}

/**
 * Hash a wallet address using SHA-256 to allow duplicate checking 
 * without exposing the plaintext wallet address.
 */
export function hashWallet(walletAddress: string): string {
  const normalized = walletAddress.trim().toLowerCase();
  return crypto.createHash("sha256").update(normalized).digest("hex");
}
