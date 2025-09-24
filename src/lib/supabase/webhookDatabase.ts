/**
 * Supabase database service for webhook configurations and logs
 */
import {
  supabase,
  getServiceSupabase,
  type WebhookDB,
  type WebhookLogDB,
} from "./client";

export interface WebhookConfig {
  id: string;
  userId: string;
  name: string;
  apiKey: string;
  apiSecretHash: string;
  encryptedSecret?: string;
  enabled: boolean;
  allowedSymbols: string[];
  maxOrderSize: number;
  dailyLimit: number;
  requireStopLoss: boolean;
  executionCount: number;
  lastExecutionAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookLog {
  id: string;
  webhookId: string;
  requestPayload: any;
  responsePayload: any;
  orderId?: string;
  status: "success" | "failed";
  errorMessage?: string;
  executionTimeMs?: number;
  createdAt: Date;
}

// Convert database record to domain model
function toWebhookConfig(db: WebhookDB): WebhookConfig {
  return {
    id: db.id,
    userId: db.user_id,
    name: db.name,
    apiKey: db.api_key,
    apiSecretHash: db.api_secret_hash,
    encryptedSecret: db.encrypted_secret || undefined,
    enabled: db.enabled,
    allowedSymbols: db.allowed_symbols || [],
    maxOrderSize: Number(db.max_order_size),
    dailyLimit: Number(db.daily_limit),
    requireStopLoss: db.require_stop_loss,
    executionCount: db.execution_count,
    lastExecutionAt: db.last_execution_at
      ? new Date(db.last_execution_at)
      : undefined,
    createdAt: new Date(db.created_at),
    updatedAt: new Date(db.updated_at),
  };
}

// Convert database log to domain model
function toWebhookLog(db: WebhookLogDB): WebhookLog {
  return {
    id: db.id,
    webhookId: db.webhook_id,
    requestPayload: db.request_payload,
    responsePayload: db.response_payload,
    orderId: db.order_id || undefined,
    status: db.status,
    errorMessage: db.error_message || undefined,
    executionTimeMs: db.execution_time_ms || undefined,
    createdAt: new Date(db.created_at),
  };
}

/**
 * Create a new webhook configuration
 */
export async function createWebhook(
  userId: string,
  config: Omit<WebhookConfig, "id" | "userId" | "createdAt" | "updatedAt">,
): Promise<WebhookConfig> {
  // Use service role client to bypass RLS for now
  // In production, you'd want proper authentication
  const serviceSupabase = getServiceSupabase();

  const { data, error } = await serviceSupabase
    .from("webhooks")
    .insert({
      user_id: userId,
      name: config.name,
      api_key: config.apiKey,
      api_secret_hash: config.apiSecretHash,
      encrypted_secret: config.encryptedSecret,
      enabled: config.enabled,
      allowed_symbols: config.allowedSymbols,
      max_order_size: config.maxOrderSize,
      daily_limit: config.dailyLimit,
      require_stop_loss: config.requireStopLoss,
      execution_count: config.executionCount || 0,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating webhook:", error);
    throw new Error(`Failed to create webhook: ${error.message}`);
  }

  return toWebhookConfig(data);
}

/**
 * Get webhook by API key (use service client for auth bypass)
 */
export async function getWebhookByApiKey(
  apiKey: string,
): Promise<WebhookConfig | null> {
  // Use service client to bypass RLS for API key lookup
  const serviceSupabase = getServiceSupabase();

  const { data, error } = await serviceSupabase
    .from("webhooks")
    .select("*")
    .eq("api_key", apiKey)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Not found
    }
    console.error("Error fetching webhook by API key:", error);
    return null;
  }

  return data ? toWebhookConfig(data) : null;
}

/**
 * Get user from API key (alias for getWebhookByApiKey)
 */
export async function getUserFromApiKey(
  apiKey: string,
): Promise<WebhookConfig | null> {
  return getWebhookByApiKey(apiKey);
}

/**
 * Get all webhooks for a user
 */
export async function getUserWebhooks(
  userId: string,
): Promise<WebhookConfig[]> {
  // Use service client to bypass RLS
  const serviceSupabase = getServiceSupabase();

  const { data, error } = await serviceSupabase
    .from("webhooks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user webhooks:", error);
    return [];
  }

  return data.map(toWebhookConfig);
}

/**
 * Update webhook configuration
 */
export async function updateWebhook(
  webhookId: string,
  updates: Partial<
    Omit<WebhookConfig, "id" | "userId" | "apiKey" | "createdAt">
  >,
): Promise<WebhookConfig | null> {
  const serviceSupabase = getServiceSupabase();

  const updateData: any = {};

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.enabled !== undefined) updateData.enabled = updates.enabled;
  if (updates.allowedSymbols !== undefined)
    updateData.allowed_symbols = updates.allowedSymbols;
  if (updates.maxOrderSize !== undefined)
    updateData.max_order_size = updates.maxOrderSize;
  if (updates.dailyLimit !== undefined)
    updateData.daily_limit = updates.dailyLimit;
  if (updates.requireStopLoss !== undefined)
    updateData.require_stop_loss = updates.requireStopLoss;
  if (updates.executionCount !== undefined)
    updateData.execution_count = updates.executionCount;

  const { data, error } = await serviceSupabase
    .from("webhooks")
    .update(updateData)
    .eq("id", webhookId)
    .select()
    .single();

  if (error) {
    console.error("Error updating webhook:", error);
    return null;
  }

  return data ? toWebhookConfig(data) : null;
}

/**
 * Delete webhook configuration
 */
export async function deleteWebhook(webhookId: string): Promise<boolean> {
  const serviceSupabase = getServiceSupabase();

  const { error } = await serviceSupabase
    .from("webhooks")
    .delete()
    .eq("id", webhookId);

  if (error) {
    console.error("Error deleting webhook:", error);
    return false;
  }

  return true;
}

/**
 * Log webhook execution
 */
export async function logWebhookExecution(params: {
  webhookId: string;
  requestPayload: any;
  responsePayload: any;
  status: "success" | "failed";
  orderId?: string;
  errorMessage?: string;
  executionTimeMs?: number;
}): Promise<void> {
  // Use service client to bypass RLS for logging
  const serviceSupabase = getServiceSupabase();

  const { error } = await serviceSupabase.from("webhook_logs").insert({
    webhook_id: params.webhookId,
    request_payload: params.requestPayload,
    response_payload: params.responsePayload,
    order_id: params.orderId,
    status: params.status,
    error_message: params.errorMessage,
    execution_time_ms: params.executionTimeMs,
  });

  if (error) {
    console.error("Error logging webhook execution:", error);
  }

  // Update webhook execution count and last execution time
  await serviceSupabase
    .from("webhooks")
    .update({
      execution_count:
        params.status === "success"
          ? supabase.sql`execution_count + 1`
          : supabase.sql`execution_count`,
      last_execution_at: new Date().toISOString(),
    })
    .eq("id", params.webhookId);
}

/**
 * Get webhook logs
 */
export async function getWebhookLogs(
  webhookId: string,
  limit: number = 100,
): Promise<WebhookLog[]> {
  const serviceSupabase = getServiceSupabase();

  const { data, error } = await serviceSupabase
    .from("webhook_logs")
    .select("*")
    .eq("webhook_id", webhookId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching webhook logs:", error);
    return [];
  }

  return data.map(toWebhookLog);
}

/**
 * Get webhook statistics
 */
export async function getWebhookStats(webhookId: string): Promise<{
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  lastExecutionAt: Date | null;
}> {
  const serviceSupabase = getServiceSupabase();

  const { data, error } = await serviceSupabase
    .from("webhook_logs")
    .select("status, execution_time_ms, created_at")
    .eq("webhook_id", webhookId)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error || !data || data.length === 0) {
    return {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      lastExecutionAt: null,
    };
  }

  const successfulExecutions = data.filter(
    (l) => l.status === "success",
  ).length;
  const failedExecutions = data.filter((l) => l.status === "failed").length;

  const executionTimes = data
    .filter((l) => l.execution_time_ms)
    .map((l) => l.execution_time_ms!);

  const averageExecutionTime =
    executionTimes.length > 0
      ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length
      : 0;

  return {
    totalExecutions: data.length,
    successfulExecutions,
    failedExecutions,
    averageExecutionTime,
    lastExecutionAt: data[0].created_at ? new Date(data[0].created_at) : null,
  };
}

/**
 * Check daily limit for a webhook
 */
export async function checkDailyLimit(webhookId: string): Promise<{
  withinLimit: boolean;
  currentUsage: number;
  limit: number;
}> {
  const serviceSupabase = getServiceSupabase();

  // Get webhook config
  const { data: webhook } = await serviceSupabase
    .from("webhooks")
    .select("daily_limit")
    .eq("id", webhookId)
    .single();

  if (!webhook) {
    return { withinLimit: false, currentUsage: 0, limit: 0 };
  }

  // Get today's logs
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: logs } = await serviceSupabase
    .from("webhook_logs")
    .select("request_payload")
    .eq("webhook_id", webhookId)
    .eq("status", "success")
    .gte("created_at", today.toISOString());

  // Calculate total order value for today
  let currentUsage = 0;
  if (logs) {
    for (const log of logs) {
      if (log.request_payload) {
        const quantity = log.request_payload.quantity || 0;
        const price = log.request_payload.price || 0;
        currentUsage += quantity * price;
      }
    }
  }

  return {
    withinLimit: currentUsage < Number(webhook.daily_limit),
    currentUsage,
    limit: Number(webhook.daily_limit),
  };
}
