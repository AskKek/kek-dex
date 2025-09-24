import { createClient } from "@supabase/supabase-js";

// Database types
export interface WebhookDB {
  id: string;
  user_id: string;
  name: string;
  api_key: string;
  api_secret_hash: string;
  encrypted_secret?: string | null;
  enabled: boolean;
  allowed_symbols: string[];
  max_order_size: number;
  daily_limit: number;
  require_stop_loss: boolean;
  execution_count: number;
  last_execution_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookLogDB {
  id: string;
  webhook_id: string;
  request_payload: any;
  response_payload: any;
  order_id: string | null;
  status: "success" | "failed";
  error_message: string | null;
  execution_time_ms: number | null;
  created_at: string;
}

export interface RateLimitDB {
  id: string;
  user_id: string;
  api_key: string;
  window_type: "minute" | "hour" | "day";
  window_start: string;
  request_count: number;
}

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client for browser/client-side operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server client with service role (for server-side operations)
export function getServiceSupabase() {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseServiceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}
