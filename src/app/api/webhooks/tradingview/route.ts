import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { OrderSide, OrderType } from "@orderly.network/types";
import { checkRateLimit } from "@/lib/supabase/rateLimiter";
import { getUserFromApiKey } from "@/lib/supabase/webhookDatabase";
import { verifyWebhookSignature } from "@/lib/webhookAuth";
import { WebhookOrderService } from "@/services/orderlyWebhookService";

// Webhook payload from TradingView
interface WebhookPayload {
  action: "buy" | "sell" | "close";
  symbol: string;
  quantity: number;
  price?: number;
  orderType?: "market" | "limit" | "stop";
  stopLoss?: number;
  takeProfit?: number;
  apiKey: string;
  signature: string;
  timestamp: number;
}

interface WebhookResponse {
  success: boolean;
  orderId?: string;
  message?: string;
  error?: string;
  executedPrice?: number;
  executedQuantity?: number;
  timestamp?: number;
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<WebhookResponse>> {
  let payload: WebhookPayload | null = null;

  try {
    // Parse request body
    payload = await request.json();

    // Validate required fields
    if (
      !payload.action ||
      !payload.symbol ||
      !payload.quantity ||
      !payload.apiKey
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: action, symbol, quantity, or apiKey",
        },
        { status: 400 },
      );
    }

    // Verify timestamp to prevent replay attacks (5 minute window)
    const currentTime = Date.now();
    const requestTime = payload.timestamp * 1000; // Convert to milliseconds
    if (Math.abs(currentTime - requestTime) > 5 * 60 * 1000) {
      return NextResponse.json(
        {
          success: false,
          error: "Request timestamp is too old or invalid",
        },
        { status: 401 },
      );
    }

    // Verify API key and signature
    const isValid = await verifyWebhookSignature(payload);
    if (!isValid) {
      console.error("Invalid webhook signature for API key:", payload.apiKey);
      return NextResponse.json(
        { success: false, error: "Invalid signature or API key" },
        { status: 401 },
      );
    }

    // Get user from API key
    const webhookConfig = await getUserFromApiKey(payload.apiKey);
    if (!webhookConfig) {
      return NextResponse.json(
        { success: false, error: "Invalid API key" },
        { status: 401 },
      );
    }

    // Check if webhook is enabled
    if (!webhookConfig.enabled) {
      return NextResponse.json(
        { success: false, error: "Webhook is disabled" },
        { status: 403 },
      );
    }

    // Check rate limits
    const rateLimitOk = await checkRateLimit(
      webhookConfig.userId,
      payload.apiKey,
    );
    if (!rateLimitOk) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded. Please try again later.",
        },
        { status: 429 },
      );
    }

    // Validate allowed symbols
    if (
      webhookConfig.allowedSymbols &&
      webhookConfig.allowedSymbols.length > 0 &&
      !webhookConfig.allowedSymbols.includes(payload.symbol)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Symbol ${payload.symbol} is not allowed for this webhook`,
        },
        { status: 403 },
      );
    }

    // Check order size limits
    const orderValue = payload.quantity * (payload.price || 0);
    if (webhookConfig.maxOrderSize && orderValue > webhookConfig.maxOrderSize) {
      return NextResponse.json(
        {
          success: false,
          error: `Order size exceeds maximum limit of ${webhookConfig.maxOrderSize}`,
        },
        { status: 403 },
      );
    }

    // Check if stop loss is required
    if (webhookConfig.requireStopLoss && !payload.stopLoss) {
      return NextResponse.json(
        {
          success: false,
          error: "Stop loss is required for this webhook configuration",
        },
        { status: 400 },
      );
    }

    // Initialize order service
    const orderService = new WebhookOrderService();

    // Execute order
    const orderResult = await orderService.executeOrder(
      payload,
      webhookConfig.userId,
    );

    // Log successful execution
    await logWebhookExecution(
      webhookConfig.id,
      payload,
      {
        success: true,
        orderId: orderResult.orderId,
        executedPrice: orderResult.executedPrice,
        executedQuantity: orderResult.executedQuantity,
      },
      "success",
    );

    // Return success response
    return NextResponse.json({
      success: true,
      orderId: orderResult.orderId,
      message: "Order placed successfully",
      executedPrice: orderResult.executedPrice,
      executedQuantity: orderResult.executedQuantity,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error("Webhook error:", error);

    // Log error
    if (payload?.apiKey) {
      const webhookConfig = await getUserFromApiKey(payload.apiKey);
      if (webhookConfig) {
        await logWebhookExecution(
          webhookConfig.id,
          payload,
          { success: false, error: error.message },
          "failed",
        );
      }
    }

    // Return appropriate error response
    if (error.message?.includes("Insufficient balance")) {
      return NextResponse.json(
        { success: false, error: "Insufficient balance to execute order" },
        { status: 400 },
      );
    }

    if (error.message?.includes("Market closed")) {
      return NextResponse.json(
        { success: false, error: "Market is closed" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Helper function to log webhook executions
async function logWebhookExecution(
  webhookId: string,
  request: WebhookPayload,
  response: any,
  status: string,
) {
  try {
    // Log to Supabase
    const { logWebhookExecution: dbLogExecution } = await import(
      "@/lib/supabase/webhookDatabase"
    );
    await dbLogExecution({
      webhookId,
      requestPayload: request,
      responsePayload: response,
      status,
      orderId: response.orderId,
      errorMessage: response.error,
    });
  } catch (error) {
    console.error("Failed to log webhook execution:", error);
  }
}
