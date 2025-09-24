import bcrypt from "bcryptjs";
import { createHmac } from "crypto";
import {
  decryptApiSecret,
  encryptApiSecret,
  hashApiKey,
  verifyHmacSignature,
  generateSecureApiCredentials,
} from "./webhookCrypto";

interface WebhookPayload {
  action: string;
  symbol: string;
  quantity: number;
  price?: number;
  apiKey: string;
  signature: string;
  timestamp: number;
  [key: string]: any;
}

interface WebhookConfig {
  id: string;
  userId: string;
  apiKey: string;
  apiSecretHash: string; // DEPRECATED: This should be encryptedSecret
  encryptedSecret?: string; // NEW: Encrypted secret that can be decrypted
  enabled: boolean;
  allowedSymbols?: string[];
  maxOrderSize?: number;
  dailyLimit?: number;
  requireStopLoss?: boolean;
}

/**
 * Verify webhook signature using HMAC-SHA256
 *
 * SECURITY: This properly decrypts the stored secret to verify HMAC
 */
export async function verifyWebhookSignature(
  payload: WebhookPayload,
): Promise<boolean> {
  try {
    // Get webhook configuration from database
    const { getWebhookByApiKey } = await import(
      "@/lib/supabase/webhookDatabase"
    );
    const webhookConfig = await getWebhookByApiKey(payload.apiKey);

    if (!webhookConfig) {
      console.error("Webhook config not found for API key:", payload.apiKey);
      return false;
    }

    // Check if we have an encrypted secret (proper approach)
    if (webhookConfig.encryptedSecret) {
      try {
        // Decrypt the secret
        const plainSecret = decryptApiSecret(webhookConfig.encryptedSecret);

        // Verify the HMAC signature
        return verifyHmacSignature(payload, payload.signature, plainSecret);
      } catch (error) {
        console.error("Failed to decrypt secret or verify signature:", error);
        return false;
      }
    }

    // Webhooks without encrypted secrets cannot be verified
    console.error("Webhook missing encrypted secret - cannot verify signature");
    console.error("Please regenerate this webhook's credentials");

    return false;
  } catch (error) {
    console.error("Error verifying webhook signature:", error);
    return false;
  }
}

/**
 * Create a consistent message string for signing
 */
function createSignatureMessage(data: any): string {
  // Sort keys to ensure consistent ordering
  const sortedKeys = Object.keys(data).sort();
  const values = sortedKeys.map((key) => `${key}=${data[key]}`);
  return values.join("&");
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Generate a new API key and secret for webhook configuration
 *
 * DEPRECATED: Use generateSecureApiCredentials from webhookCrypto instead
 */
export function generateApiCredentials(): {
  apiKey: string;
  apiSecret: string;
  apiSecretHash: string;
  encryptedSecret?: string;
} {
  // Use the new secure generation method
  const credentials = generateSecureApiCredentials();

  return {
    apiKey: credentials.apiKey,
    apiSecret: credentials.apiSecret,
    apiSecretHash: credentials.apiKeyHash, // Using hash for backwards compatibility
    encryptedSecret: credentials.encryptedSecret, // NEW: Properly encrypted secret
  };
}

/**
 * Generate a random string for API keys/secrets
 */
function generateRandomString(length: number): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const randomBytes = require("crypto").randomBytes(length);

  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % chars.length];
  }

  return result;
}

/**
 * Validate webhook payload format
 */
export function validateWebhookPayload(payload: any): {
  valid: boolean;
  error?: string;
} {
  // Check required fields
  if (!payload.action) {
    return { valid: false, error: "Missing required field: action" };
  }

  if (!["buy", "sell", "close"].includes(payload.action)) {
    return {
      valid: false,
      error: "Invalid action. Must be 'buy', 'sell', or 'close'",
    };
  }

  if (!payload.symbol) {
    return { valid: false, error: "Missing required field: symbol" };
  }

  if (typeof payload.quantity !== "number" || payload.quantity <= 0) {
    return {
      valid: false,
      error: "Invalid quantity. Must be a positive number",
    };
  }

  if (!payload.apiKey) {
    return { valid: false, error: "Missing required field: apiKey" };
  }

  if (!payload.signature) {
    return { valid: false, error: "Missing required field: signature" };
  }

  if (!payload.timestamp) {
    return { valid: false, error: "Missing required field: timestamp" };
  }

  // Validate optional fields
  if (
    payload.orderType &&
    !["market", "limit", "stop"].includes(payload.orderType)
  ) {
    return {
      valid: false,
      error: "Invalid orderType. Must be 'market', 'limit', or 'stop'",
    };
  }

  if (payload.orderType === "limit" && !payload.price) {
    return { valid: false, error: "Limit orders require a price" };
  }

  if (payload.stopLoss && typeof payload.stopLoss !== "number") {
    return { valid: false, error: "Invalid stopLoss. Must be a number" };
  }

  if (payload.takeProfit && typeof payload.takeProfit !== "number") {
    return { valid: false, error: "Invalid takeProfit. Must be a number" };
  }

  return { valid: true };
}

/**
 * Check if API key has required permissions
 */
export async function checkApiKeyPermissions(
  apiKey: string,
  requiredPermissions: string[],
): Promise<boolean> {
  try {
    const { getWebhookByApiKey } = await import(
      "@/lib/supabase/webhookDatabase"
    );
    const webhookConfig = await getWebhookByApiKey(apiKey);

    if (!webhookConfig || !webhookConfig.enabled) {
      return false;
    }

    // Add permission checking logic here if needed
    // For now, we just check if the webhook is enabled
    return true;
  } catch (error) {
    console.error("Error checking API key permissions:", error);
    return false;
  }
}
