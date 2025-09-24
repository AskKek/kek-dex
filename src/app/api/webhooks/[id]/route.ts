import { NextRequest, NextResponse } from "next/server";
import {
  updateWebhook,
  deleteWebhook,
  getWebhookLogs,
  getWebhookStats,
} from "@/lib/supabase/webhookDatabase";

// PATCH /api/webhooks/[id] - Update webhook configuration
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: webhookId } = await params;
    const body = await request.json();

    // Don't allow updating certain fields
    delete body.id;
    delete body.userId;
    delete body.apiKey;
    delete body.apiSecretHash;
    delete body.createdAt;

    const webhook = await updateWebhook(webhookId, body);

    if (!webhook) {
      return NextResponse.json(
        { success: false, error: "Webhook not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      webhook,
    });
  } catch (error) {
    console.error("Error updating webhook:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update webhook" },
      { status: 500 },
    );
  }
}

// DELETE /api/webhooks/[id] - Delete webhook
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: webhookId } = await params;

    const success = await deleteWebhook(webhookId);

    if (!success) {
      return NextResponse.json(
        { success: false, error: "Webhook not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Webhook deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting webhook:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete webhook" },
      { status: 500 },
    );
  }
}

// GET /api/webhooks/[id] - Get webhook details with stats
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: webhookId } = await params;
    const includeStats = request.nextUrl.searchParams.get("stats") === "true";
    const includeLogs = request.nextUrl.searchParams.get("logs") === "true";

    const response: any = {
      success: true,
      webhookId,
    };

    if (includeStats) {
      const stats = await getWebhookStats(webhookId);
      response.stats = stats;
    }

    if (includeLogs) {
      const limit = parseInt(
        request.nextUrl.searchParams.get("limit") || "100",
      );
      const logs = await getWebhookLogs(webhookId, limit);
      response.logs = logs;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching webhook details:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch webhook details" },
      { status: 500 },
    );
  }
}
