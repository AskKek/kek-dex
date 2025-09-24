# Production Deployment Checklist for TradingView Webhooks

## Environment Variables Required

### 1. Security Keys
```bash
# Generate a new encryption key (DO NOT use the test one)
WEBHOOK_ENCRYPTION_KEY=  # 64 hex characters (32 bytes)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Supabase Configuration
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # Required for webhook operations
```

### 3. Orderly Configuration
```bash
NEXT_PUBLIC_BROKER_ID=your_broker_id
NEXT_PUBLIC_NETWORK_ID=mainnet  # or testnet
```

## Database Setup

### Step 1: Run Migrations
```sql
-- Run these in order:
-- 1. 001_create_webhook_tables.sql
-- 2. 002_fix_rls_policies.sql
-- 3. 003_add_encrypted_secret.sql
```

### Step 2: Verify Tables
```sql
-- Check if tables exist with correct columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'webhooks'
ORDER BY ordinal_position;

-- Should include: encrypted_secret, api_key_hash
```

## Code Deployment Steps

### 1. Remove Test Files
- [x] Delete `mockWebhookOrderService.ts`
- [ ] Remove test webhook credentials from `.env.local`
- [ ] Delete `scripts/testWebhook.js` (or move to dev-only)

### 2. Update Environment Files
```bash
# .env.production
WEBHOOK_ENCRYPTION_KEY=<new_production_key>
NODE_ENV=production
# Remove any WEBHOOK_TEST_* variables
```

### 3. Server-Side Order Execution

**CRITICAL**: The current `WebhookOrderService` won't work in production. You need to implement one of these approaches:

#### Option A: User Key Storage (Recommended for Individual Trading)
```typescript
// Store user's Orderly trading keys (encrypted) when they grant permission
// Decrypt and use for webhook orders
```

#### Option B: Master Account (For Market Making/Liquidity)
```typescript
// Single account that executes all webhook orders
// Requires careful risk management
```

#### Option C: Delegation System
```typescript
// Users delegate trading permissions to webhook system
// Check if Orderly supports this
```

## Security Verification

### 1. Test Authentication
```bash
# Create a webhook through the API
curl -X POST https://your-domain/api/webhooks \
  -H "Content-Type: application/json" \
  -H "x-user-id: test_user" \
  -d '{"name": "Production Test"}'

# Should return encrypted credentials
```

### 2. Verify Signature Validation
```bash
# Try with invalid signature - should fail
curl -X POST https://your-domain/api/webhooks/tradingview \
  -H "Content-Type: application/json" \
  -d '{"action": "buy", "symbol": "BTC-PERP", "signature": "invalid"}'

# Should return 401 Unauthorized
```

### 3. Check Rate Limiting
```bash
# Send multiple requests rapidly
# Should get 429 Too Many Requests after limit
```

## Monitoring Setup

### 1. Error Tracking
- [ ] Set up Sentry or similar for error monitoring
- [ ] Monitor webhook failures
- [ ] Track authentication errors

### 2. Metrics
- [ ] Webhook execution count
- [ ] Success/failure rates
- [ ] Response times
- [ ] Rate limit hits

### 3. Alerts
- [ ] Failed authentications
- [ ] High error rates
- [ ] Unusual trading patterns

## Legal & Compliance

### 1. User Agreements
- [ ] Terms of Service update for automated trading
- [ ] Risk disclaimers for webhook trading
- [ ] Data privacy policy for storing keys

### 2. Audit Trail
- [ ] All webhook executions logged
- [ ] Order history maintained
- [ ] User actions tracked

## Testing in Production

### 1. Gradual Rollout
- [ ] Start with internal testing accounts
- [ ] Limited beta with trusted users
- [ ] Monitor closely for issues

### 2. Fallback Plan
- [ ] Ability to disable all webhooks quickly
- [ ] Manual override for stuck orders
- [ ] Support contact for issues

## Final Pre-Launch

- [ ] All environment variables set
- [ ] Database migrations complete
- [ ] Remove all test/mock code
- [ ] Security audit passed
- [ ] Legal review complete
- [ ] Monitoring active
- [ ] Documentation updated
- [ ] Support team trained

## Post-Launch

- [ ] Monitor first 24 hours closely
- [ ] Review all webhook logs
- [ ] Check for any security alerts
- [ ] Gather user feedback
- [ ] Plan improvements based on usage