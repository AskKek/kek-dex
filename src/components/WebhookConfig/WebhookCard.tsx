"use client";

import React, { useState } from "react";
import {
  CopyIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@radix-ui/react-icons";
import { Box, Text, Button, Switch, cn } from "@orderly.network/ui";
import type { WebhookConfig } from "@/lib/supabase/webhookDatabase";

interface WebhookCardProps {
  webhook: WebhookConfig;
  onUpdate: (updates: Partial<WebhookConfig>) => void;
  onDelete: () => void;
  onRefresh: () => void;
}

export function WebhookCard({
  webhook,
  onUpdate,
  onDelete,
  onRefresh,
}: WebhookCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://kekdex.com"}/api/webhooks/tradingview`;

  const alertTemplate = JSON.stringify(
    {
      action: "{{strategy.order.action}}",
      symbol: "{{ticker}}",
      quantity: "{{strategy.order.contracts}}",
      price: "{{strategy.order.price}}",
      orderType: "market",
      stopLoss: "{{strategy.order.stop}}",
      takeProfit: "{{strategy.order.limit}}",
      apiKey: webhook.apiKey,
      signature: "{{strategy.order.id}}",
      timestamp: "{{timenow}}",
    },
    null,
    2,
  );

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Box
      p={4}
      intensity={800}
      r="md"
      className="border border-gray-700 hover:border-gray-600 transition-colors"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Text weight="medium" className="text-white">
              {webhook.name}
            </Text>
            <div
              className={cn(
                "px-2 py-0.5 rounded text-xs font-medium",
                webhook.enabled
                  ? "bg-green-500/20 text-green-400"
                  : "bg-gray-500/20 text-gray-400",
              )}
            >
              {webhook.enabled ? "Active" : "Inactive"}
            </div>
          </div>
          <Text size="sm" className="text-gray-400 mt-1">
            Created: {new Date(webhook.createdAt).toLocaleDateString()}
          </Text>
        </div>
        <Switch
          checked={webhook.enabled}
          onCheckedChange={(enabled) => onUpdate({ enabled })}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <Text size="xs" className="text-gray-500">
            Daily Limit
          </Text>
          <Text weight="medium" className="text-white">
            ${webhook.dailyLimit.toLocaleString()}
          </Text>
        </div>
        <div>
          <Text size="xs" className="text-gray-500">
            Max Order Size
          </Text>
          <Text weight="medium" className="text-white">
            ${webhook.maxOrderSize.toLocaleString()}
          </Text>
        </div>
        <div>
          <Text size="xs" className="text-gray-500">
            Allowed Symbols
          </Text>
          <Text weight="medium" className="text-white">
            {webhook.allowedSymbols.length > 0
              ? webhook.allowedSymbols.length
              : "All"}
          </Text>
        </div>
        <div>
          <Text size="xs" className="text-gray-500">
            Total Executions
          </Text>
          <Text weight="medium" className="text-white">
            {webhook.executionCount || 0}
          </Text>
        </div>
      </div>

      <Button
        variant="outline"
        onClick={() => setShowDetails(!showDetails)}
        className="w-full flex items-center justify-center gap-2"
      >
        {showDetails ? (
          <>
            Hide Setup Instructions
            <ChevronUpIcon />
          </>
        ) : (
          <>
            Show Setup Instructions
            <ChevronDownIcon />
          </>
        )}
      </Button>

      {showDetails && (
        <div className="mt-4 space-y-4 pt-4 border-t border-gray-700">
          <div>
            <Text weight="medium" className="text-white mb-2">
              Webhook URL
            </Text>
            <div className="flex gap-2">
              <Box
                p={2}
                intensity={700}
                r="sm"
                className="flex-1 font-mono text-sm text-gray-300 break-all"
              >
                {webhookUrl}
              </Box>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(webhookUrl, "url")}
              >
                {copied === "url" ? "Copied!" : <CopyIcon />}
              </Button>
            </div>
          </div>

          <div>
            <Text weight="medium" className="text-white mb-2">
              API Key
            </Text>
            <div className="flex gap-2">
              <Box
                p={2}
                intensity={700}
                r="sm"
                className="flex-1 font-mono text-sm text-gray-300"
              >
                {webhook.apiKey}
              </Box>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(webhook.apiKey, "key")}
              >
                {copied === "key" ? "Copied!" : <CopyIcon />}
              </Button>
            </div>
          </div>

          <div>
            <Text weight="medium" className="text-white mb-2">
              TradingView Alert Message Template
            </Text>
            <Box
              p={3}
              intensity={700}
              r="sm"
              className="font-mono text-xs overflow-x-auto"
            >
              <pre className="text-gray-300">{alertTemplate}</pre>
            </Box>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(alertTemplate, "template")}
              className="mt-2"
            >
              {copied === "template" ? "Copied!" : "Copy Template"}
            </Button>
          </div>

          <Box
            p={3}
            intensity={600}
            r="sm"
            className="bg-blue-900/20 border border-blue-800/30"
          >
            <Text size="sm" weight="medium" className="text-blue-400 mb-2">
              Setup Instructions:
            </Text>
            <ol className="text-sm space-y-1 ml-4 list-decimal text-gray-300">
              <li>
                Open TradingView and navigate to your strategy or indicator
              </li>
              <li>Click the "Alert" button (clock icon) on your chart</li>
              <li>Configure your alert conditions</li>
              <li>
                Check the "Webhook URL" checkbox and paste the webhook URL above
              </li>
              <li>
                In the "Message" field, paste the JSON template provided above
              </li>
              <li>Customize the template values if needed</li>
              <li>Save your alert and start automated trading!</li>
            </ol>
          </Box>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Open webhook logs modal
                console.log("View logs for webhook:", webhook.id);
              }}
              className="flex-1"
            >
              View Logs
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                setIsDeleting(true);
                await onDelete();
                setIsDeleting(false);
              }}
              disabled={isDeleting}
              className="flex-1 text-red-400 hover:text-red-300 border-red-800 hover:border-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? "Deleting..." : "Delete Webhook"}
            </Button>
          </div>
        </div>
      )}
    </Box>
  );
}
