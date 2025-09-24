# Webhook Security Implementation Guide

## Overview

This document explains the security approach for TradingView webhook authentication.

## The Problem with Bcrypt

**❌ INCORRECT APPROACH (Old Implementation):**
- Store bcrypt hash of API secret in database
- Problem: Bcrypt is **one-way** - you cannot decrypt it
- HMAC signature verification requires the **plain secret**
- Result: Cannot verify webhook signatures!

## The Solution: Reversible Encryption

**✅ CORRECT APPROACH (New Implementation):**
- Use AES-256-GCM encryption for API secrets
- Secrets can be decrypted when needed for HMAC verification
- Maintains security at rest while allowing signature verification

## Security Architecture

### 1. API Key Generation
```javascript
// Generate secure random credentials
apiKey = "wh_" + randomBytes(24).base64url
apiSecret = "whs_" + randomBytes(32).base64url
```

### 2. Storage Strategy

```sql
-- Database Schema
webhooks table:
  api_key: Plain API key (for lookup)
  api_key_hash: SHA-256 hash (for indexing)
  encrypted_secret: AES-256-GCM encrypted secret
  api_secret_hash: DEPRECATED (bcrypt hash - do not use)
```

### 3. Encryption Details

- **Algorithm**: AES-256-GCM (authenticated encryption)
- **Key**: 32-byte key from `WEBHOOK_ENCRYPTION_KEY` env variable
- **Format**: `iv:ciphertext:authTag`
- **Benefits**:
  - Authenticated encryption prevents tampering
  - Random IV ensures unique ciphertexts
  - Can decrypt when needed for HMAC

### 4. HMAC Signature Verification

```javascript
// 1. Decrypt the stored secret
const plainSecret = decryptApiSecret(webhook.encrypted_secret);

// 2. Generate expected signature
const signature = HMAC-SHA256(plainSecret, message);

// 3. Timing-safe comparison
return timingSafeEqual(received, expected);
```

## Security Best Practices

### ✅ DO's
- Store API secrets encrypted (AES-256-GCM)
- Use timing-safe comparison for signatures
- Rotate encryption keys periodically
- Use environment variables for master keys
- Generate cryptographically secure random values

### ❌ DON'Ts
- Never store plain secrets in database
- Don't use bcrypt/argon2 for API secrets (they're for passwords)
- Don't log or expose secrets in error messages
- Don't use weak encryption algorithms
- Never commit encryption keys to version control

## Environment Setup

1. **Generate Encryption Key** (one-time):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

2. **Add to `.env.local`**:
```bash
WEBHOOK_ENCRYPTION_KEY=your_64_character_hex_key_here
```

3. **Run Database Migration**:
```sql
-- Apply migration 003_add_encrypted_secret.sql
```

## Migration Path

For existing webhooks with bcrypt hashes:
1. They will continue working in development mode with warnings
2. In production, they need to regenerate credentials
3. New webhooks automatically use encrypted storage

## Security Comparison

| Aspect | Bcrypt (Wrong) | AES-256-GCM (Correct) |
|--------|---------------|----------------------|
| Reversible | ❌ No | ✅ Yes |
| HMAC Compatible | ❌ No | ✅ Yes |
| Secure at Rest | ✅ Yes | ✅ Yes |
| Purpose | Passwords | API Secrets |
| Performance | Slow (by design) | Fast |

## Testing

Test webhook security:
```bash
# With proper credentials
node scripts/testWebhook.js

# Verify signature validation
# Try with wrong signature - should fail
```

## Production Checklist

- [ ] Set strong `WEBHOOK_ENCRYPTION_KEY` (64 hex chars)
- [ ] Enable signature verification (remove dev bypasses)
- [ ] Run database migration for encrypted_secret column
- [ ] Monitor failed authentication attempts
- [ ] Implement key rotation strategy
- [ ] Set up secure key management (e.g., AWS KMS, HashiCorp Vault)

## Summary

The key insight: **Bcrypt is for passwords (one-way), not API secrets**. API secrets need reversible encryption because you must decrypt them to verify HMAC signatures. Using AES-256-GCM provides security at rest while maintaining the ability to verify webhook authenticity.