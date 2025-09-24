import { NextRequest, NextResponse } from "next/server";
import { useAccount } from "@orderly.network/hooks";
import {
  createWebhook,
  getUserWebhooks,
  type WebhookConfig,
} from "@/lib/supabase/webhookDatabase";
import { generateApiCredentials } from "@/lib/webhookAuth";

// GET /api/webhooks - Get all webhooks for the authenticated user
export async function GET(request: NextRequest) {
  try {
    // In production, get user ID from session/auth
    const userId = request.headers.get("x-user-id") || "user_sample_001";

    const webhooks = await getUserWebhooks(userId);

    return NextResponse.json({
      success: true,
      webhooks,
    });
  } catch (error) {
    console.error("Error fetching webhooks:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch webhooks" },
      { status: 500 },
    );
  }
}

// POST /api/webhooks - Create a new webhook
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // In production, get user ID from session/auth
    const userId = request.headers.get("x-user-id") || "user_sample_001";

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { success: false, error: "Webhook name is required" },
        { status: 400 },
      );
    }

    // Generate API credentials if not provided
    let apiKey = body.apiKey;
    let apiSecretHash = body.apiSecretHash;
    let encryptedSecret = body.encryptedSecret;
    let apiSecret = "";

    if (!apiKey) {
      const credentials = generateApiCredentials();
      apiKey = credentials.apiKey;
      apiSecret = credentials.apiSecret;
      apiSecretHash = credentials.apiSecretHash;
      encryptedSecret = credentials.encryptedSecret;
    }

    // Create webhook configuration
    const webhook = await createWebhook(userId, {
      name: body.name,
      apiKey,
      apiSecretHash,
      encryptedSecret: encryptedSecret || undefined,
      enabled: body.enabled !== false,
      allowedSymbols: body.allowedSymbols || [],
      maxOrderSize: body.maxOrderSize || 1000,
      dailyLimit: body.dailyLimit || 10000,
      requireStopLoss: body.requireStopLoss || false,
      executionCount: 0,
    });

    // Return webhook with API secret (only on creation)
    const response: any = {
      success: true,
      webhook,
    };

    if (apiSecret) {
      response.apiSecret = apiSecret;
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Error creating webhook:", error);

    if (error.message?.includes("already exists")) {
      return NextResponse.json(
        { success: false, error: "API key already exists" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to create webhook" },
      { status: 500 },
    );
  }
}
