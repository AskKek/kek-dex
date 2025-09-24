"use client";

import React, { useState, useEffect } from "react";
import { useAccount } from "@orderly.network/hooks";
import { Box, Button, Text, cn } from "@orderly.network/ui";
import {
  getUserWebhooks,
  type WebhookConfig,
} from "@/lib/supabase/webhookDatabase";
import { CreateWebhookModal } from "./CreateWebhookModal";
import { WebhookCard } from "./WebhookCard";

export function WebhookManager() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletingWebhookId, setDeletingWebhookId] = useState<string | null>(
    null,
  );
  const { account } = useAccount();

  useEffect(() => {
    loadWebhooks();
  }, [account]);

  const loadWebhooks = async () => {
    try {
      setLoading(true);
      // In production, this would fetch from the actual API
      const response = await fetch("/api/webhooks", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setWebhooks(data.webhooks || []);
      } else {
        // For development, use mock data
        const mockWebhooks = await getUserWebhooks(
          account?.address || "user_sample_001",
        );
        setWebhooks(mockWebhooks);
      }
    } catch (error) {
      console.error("Error loading webhooks:", error);
      // Use mock data as fallback
      const mockWebhooks = await getUserWebhooks(
        account?.address || "user_sample_001",
      );
      setWebhooks(mockWebhooks);
    } finally {
      setLoading(false);
    }
  };

  const createWebhook = async (config: any) => {
    try {
      const response = await fetch("/api/webhooks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        const data = await response.json();
        setWebhooks([...webhooks, data.webhook]);
        // Return the full response including the API secret
        return data;
      }
    } catch (error) {
      console.error("Error creating webhook:", error);
    }
  };

  const updateWebhook = async (webhookId: string, updates: any) => {
    try {
      const response = await fetch(`/api/webhooks/${webhookId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        await loadWebhooks();
      }
    } catch (error) {
      console.error("Error updating webhook:", error);
    }
  };

  const deleteWebhook = async (webhookId: string) => {
    setDeletingWebhookId(webhookId);
    try {
      const response = await fetch(`/api/webhooks/${webhookId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setWebhooks(webhooks.filter((w) => w.id !== webhookId));
      }
    } catch (error) {
      console.error("Error deleting webhook:", error);
    } finally {
      setDeletingWebhookId(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Text size="lg" weight="bold" className="text-white">
            TradingView Webhooks
          </Text>
          <Text size="sm" className="text-gray-400 mt-1">
            Connect your TradingView alerts to execute trades automatically
          </Text>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className={cn(
            "bg-gradient-to-r from-purple-500 to-pink-500",
            "hover:from-purple-600 hover:to-pink-600",
            "text-white font-medium",
          )}
        >
          + Create Webhook
        </Button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Text className="text-gray-400">Loading webhooks...</Text>
        </div>
      ) : webhooks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-center max-w-md">
            <Text size="lg" weight="medium" className="text-white mb-2">
              No webhooks configured yet
            </Text>
            <Text className="text-gray-400 mb-6">
              Create your first webhook to start automated trading with
              TradingView alerts
            </Text>
            <Button
              onClick={() => setShowCreateModal(true)}
              className={cn(
                "bg-gradient-to-r from-purple-500 to-pink-500",
                "hover:from-purple-600 hover:to-pink-600",
                "text-white font-medium",
              )}
            >
              Create Your First Webhook
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4">
          {webhooks.map((webhook) => (
            <WebhookCard
              key={webhook.id}
              webhook={webhook}
              onUpdate={(updates) => updateWebhook(webhook.id, updates)}
              onDelete={() => deleteWebhook(webhook.id)}
              onRefresh={loadWebhooks}
            />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateWebhookModal
          onClose={() => {
            setShowCreateModal(false);
            loadWebhooks(); // Refresh the list when closing
          }}
          onCreate={async (config) => {
            const webhook = await createWebhook(config);
            // Don't close the modal here - let the modal handle it after showing the secret
            await loadWebhooks();
            return webhook;
          }}
        />
      )}
    </div>
  );
}
