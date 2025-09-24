/**
 * Secure encryption/decryption for webhook secrets
 *
 * SECURITY NOTES:
 * - API secrets must be encrypted at rest, not hashed
 * - Bcrypt/Argon2 are for passwords (one-way), not API secrets
 * - We need to decrypt secrets to verify HMAC signatures
 */
import crypto from "crypto";

// Get encryption key from environment
// This should be a 32-byte hex string (64 characters)
const getEncryptionKey = (): Buffer => {
  const key = process.env.WEBHOOK_ENCRYPTION_KEY;

  if (!key) {
    throw new Error("WEBHOOK_ENCRYPTION_KEY environment variable is required");
  }

  // Validate key length
  const keyBuffer = Buffer.from(key, "hex");
  if (keyBuffer.length !== 32) {
    throw new Error(
      "WEBHOOK_ENCRYPTION_KEY must be 32 bytes (64 hex characters)",
    );
  }

  return keyBuffer;
};

/**
 * Encrypt an API secret for storage
 * Returns format: "iv:encryptedData:authTag"
 */
export function encryptApiSecret(plainSecret: string): string {
  const key = getEncryptionKey();

  // Generate random IV
  const iv = crypto.randomBytes(16);

  // Use AES-256-GCM for authenticated encryption
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  // Encrypt the secret
  let encrypted = cipher.update(plainSecret, "utf8", "hex");
  encrypted += cipher.final("hex");

  // Get the authentication tag
  const authTag = cipher.getAuthTag();

  // Combine IV, encrypted data, and auth tag
  return `${iv.toString("hex")}:${encrypted}:${authTag.toString("hex")}`;
}

/**
 * Decrypt an API secret from storage
 */
export function decryptApiSecret(encryptedData: string): string {
  const key = getEncryptionKey();

  // Parse the stored format
  const parts = encryptedData.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }

  const [ivHex, encrypted, authTagHex] = parts;

  // Convert from hex
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  // Create decipher
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  // Decrypt
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Generate a new encryption key for initial setup
 * Run this once and save the output to your .env file
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Hash an API key for indexing (one-way)
 * Used to look up webhooks without exposing the actual API key
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

/**
 * Verify webhook signature using the decrypted secret
 */
export function verifyHmacSignature(
  payload: any,
  signature: string,
  secret: string,
): boolean {
  // Create the message to sign (exclude signature from payload)
  const { signature: _, ...dataToSign } = payload;

  // Sort keys for consistent message
  const sortedKeys = Object.keys(dataToSign).sort();
  const message = sortedKeys
    .map((key) => `${key}=${dataToSign[key]}`)
    .join("&");

  // Generate expected signature
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(message)
    .digest("hex");

  // Timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature),
  );
}

/**
 * Generate API credentials with proper encryption
 */
export function generateSecureApiCredentials(): {
  apiKey: string;
  apiSecret: string;
  apiKeyHash: string;
  encryptedSecret: string;
} {
  // Generate random API key
  const apiKey = `wh_${crypto.randomBytes(24).toString("base64url")}`;

  // Generate random API secret
  const apiSecret = `whs_${crypto.randomBytes(32).toString("base64url")}`;

  // Hash the API key for indexing
  const apiKeyHash = hashApiKey(apiKey);

  // Encrypt the secret for storage
  const encryptedSecret = encryptApiSecret(apiSecret);

  return {
    apiKey,
    apiSecret,
    apiKeyHash,
    encryptedSecret,
  };
}
