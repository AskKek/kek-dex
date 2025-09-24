/**
 * Supabase-based rate limiter for webhook API endpoints
 */
import { getServiceSupabase } from "./client";

interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  maxRequestsPerDay: number;
}

// Default rate limits
const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  maxRequestsPerMinute: 10,
  maxRequestsPerHour: 100,
  maxRequestsPerDay: 1000,
};

/**
 * Check if a request is within rate limits using Supabase
 */
export async function checkRateLimit(
  userId: string,
  apiKey: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMITS,
): Promise<boolean> {
  const supabase = getServiceSupabase();
  const now = new Date();

  // Check all three windows
  const windows = [
    { type: "minute", duration: 60 * 1000, limit: config.maxRequestsPerMinute },
    {
      type: "hour",
      duration: 60 * 60 * 1000,
      limit: config.maxRequestsPerHour,
    },
    {
      type: "day",
      duration: 24 * 60 * 60 * 1000,
      limit: config.maxRequestsPerDay,
    },
  ];

  for (const window of windows) {
    const windowStart = new Date(now.getTime() - window.duration);

    // Try to increment the counter
    const { data: existing } = await supabase
      .from("rate_limits")
      .select("request_count")
      .eq("user_id", userId)
      .eq("api_key", apiKey)
      .eq("window_type", window.type)
      .gte("window_start", windowStart.toISOString())
      .single();

    if (existing) {
      // Check if limit exceeded
      if (existing.request_count >= window.limit) {
        console.log(
          `Rate limit exceeded (${window.type}) for ${userId}:${apiKey}`,
        );
        return false;
      }

      // Increment counter
      const { error } = await supabase
        .from("rate_limits")
        .update({ request_count: existing.request_count + 1 })
        .eq("user_id", userId)
        .eq("api_key", apiKey)
        .eq("window_type", window.type)
        .gte("window_start", windowStart.toISOString());

      if (error) {
        console.error("Error updating rate limit:", error);
        return false;
      }
    } else {
      // Create new window
      const { error } = await supabase.from("rate_limits").insert({
        user_id: userId,
        api_key: apiKey,
        window_type: window.type,
        window_start: now.toISOString(),
        request_count: 1,
      });

      if (error && error.code !== "23505") {
        // Ignore unique constraint violations
        console.error("Error creating rate limit:", error);
        return false;
      }
    }
  }

  return true;
}

/**
 * Get remaining rate limit for a user
 */
export async function getRateLimitStatus(
  userId: string,
  apiKey: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMITS,
): Promise<{
  minuteLimit: number;
  minuteRemaining: number;
  minuteReset: number;
  hourLimit: number;
  hourRemaining: number;
  hourReset: number;
  dayLimit: number;
  dayRemaining: number;
  dayReset: number;
}> {
  const supabase = getServiceSupabase();
  const now = new Date();

  const getRemaining = async (
    windowType: string,
    duration: number,
    limit: number,
  ): Promise<[number, number]> => {
    const windowStart = new Date(now.getTime() - duration);

    const { data } = await supabase
      .from("rate_limits")
      .select("request_count, window_start")
      .eq("user_id", userId)
      .eq("api_key", apiKey)
      .eq("window_type", windowType)
      .gte("window_start", windowStart.toISOString())
      .order("window_start", { ascending: false })
      .limit(1)
      .single();

    if (!data) {
      return [limit, 0];
    }

    const resetTime = new Date(data.window_start).getTime() + duration;
    return [limit - data.request_count, resetTime];
  };

  const [minuteRemaining, minuteReset] = await getRemaining(
    "minute",
    60 * 1000,
    config.maxRequestsPerMinute,
  );
  const [hourRemaining, hourReset] = await getRemaining(
    "hour",
    60 * 60 * 1000,
    config.maxRequestsPerHour,
  );
  const [dayRemaining, dayReset] = await getRemaining(
    "day",
    24 * 60 * 60 * 1000,
    config.maxRequestsPerDay,
  );

  return {
    minuteLimit: config.maxRequestsPerMinute,
    minuteRemaining,
    minuteReset,
    hourLimit: config.maxRequestsPerHour,
    hourRemaining,
    hourReset,
    dayLimit: config.maxRequestsPerDay,
    dayRemaining,
    dayReset,
  };
}

/**
 * Reset rate limits for a specific user
 */
export async function resetRateLimit(
  userId: string,
  apiKey: string,
): Promise<void> {
  const supabase = getServiceSupabase();

  const { error } = await supabase
    .from("rate_limits")
    .delete()
    .eq("user_id", userId)
    .eq("api_key", apiKey);

  if (error) {
    console.error("Error resetting rate limits:", error);
  }
}

/**
 * Clean up expired rate limit entries
 */
export async function cleanupExpiredRateLimits(): Promise<void> {
  const supabase = getServiceSupabase();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const { error } = await supabase
    .from("rate_limits")
    .delete()
    .lt("window_start", oneDayAgo.toISOString());

  if (error) {
    console.error("Error cleaning up rate limits:", error);
  }
}

/**
 * Get rate limit configuration from environment or use defaults
 */
export function getRateLimitConfig(): RateLimitConfig {
  if (typeof process !== "undefined" && process.env) {
    return {
      maxRequestsPerMinute:
        parseInt(process.env.WEBHOOK_RATE_LIMIT_PER_MINUTE || "") ||
        DEFAULT_RATE_LIMITS.maxRequestsPerMinute,
      maxRequestsPerHour:
        parseInt(process.env.WEBHOOK_RATE_LIMIT_PER_HOUR || "") ||
        DEFAULT_RATE_LIMITS.maxRequestsPerHour,
      maxRequestsPerDay:
        parseInt(process.env.WEBHOOK_RATE_LIMIT_PER_DAY || "") ||
        DEFAULT_RATE_LIMITS.maxRequestsPerDay,
    };
  }

  return DEFAULT_RATE_LIMITS;
}
