"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@orderly.network/ui";
import { Input, Button, Text, Switch, cn } from "@orderly.network/ui";

interface CreateWebhookModalProps {
  onClose: () => void;
  onCreate: (config: any) => Promise<any>;
}

export function CreateWebhookModal({
  onClose,
  onCreate,
}: CreateWebhookModalProps) {
  const [loading, setLoading] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [apiCredentials, setApiCredentials] = useState<{
    apiKey: string;
    apiSecret: string;
  } | null>(null);

  const [config, setConfig] = useState({
    name: "",
    allowedSymbols: [] as string[],
    maxOrderSize: 1000,
    dailyLimit: 10000,
    requireStopLoss: false,
  });

  const availableSymbols = [
    { value: "PERP_BTC_USDC", label: "BTC Perpetual" },
    { value: "PERP_ETH_USDC", label: "ETH Perpetual" },
    { value: "PERP_SOL_USDC", label: "SOL Perpetual" },
    { value: "PERP_ARB_USDC", label: "ARB Perpetual" },
    { value: "PERP_OP_USDC", label: "OP Perpetual" },
  ];

  const handleCreate = async () => {
    if (!config.name.trim()) {
      alert("Please enter a webhook name");
      return;
    }

    setLoading(true);
    try {
      // Don't generate credentials client-side, let the server do it
      const webhookData = {
        ...config,
        enabled: true,
        executionCount: 0,
      };

      const result = await onCreate(webhookData);

      if (result && result.webhook) {
        // Set the credentials from the server response
        setApiCredentials({
          apiKey: result.webhook.apiKey,
          apiSecret: result.apiSecret || "", // Server returns this only on creation
        });
        setShowApiSecret(true);
      }
    } catch (error) {
      console.error("Error creating webhook:", error);
      alert("Failed to create webhook");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000); // Reset after 2 seconds
  };

  if (showApiSecret && apiCredentials) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Webhook Created Successfully!</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <div className="bg-yellow-900/20 border border-yellow-800/30 rounded-lg p-4">
                <Text className="text-yellow-400 font-medium mb-2">
                  ⚠️ Important: Save Your API Secret
                </Text>
                <Text size="sm" className="text-gray-300">
                  This is the only time you'll see your API secret. Save it
                  securely as it cannot be retrieved later.
                </Text>
              </div>

              <div>
                <Text weight="medium" className="text-white mb-2">
                  API Key
                </Text>
                <div className="flex gap-2">
                  <Input
                    value={apiCredentials.apiKey}
                    readOnly
                    className="flex-1 font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={() =>
                      copyToClipboard(apiCredentials.apiKey, "apiKey")
                    }
                    className={
                      copiedField === "apiKey"
                        ? "bg-green-600 hover:bg-green-700"
                        : ""
                    }
                  >
                    {copiedField === "apiKey" ? "✓ Copied" : "Copy"}
                  </Button>
                </div>
              </div>

              <div>
                <Text weight="medium" className="text-white mb-2">
                  API Secret
                </Text>
                <div className="flex gap-2">
                  <Input
                    value={apiCredentials.apiSecret}
                    readOnly
                    className="flex-1 font-mono text-sm"
                    type="password"
                  />
                  <Button
                    size="sm"
                    onClick={() =>
                      copyToClipboard(apiCredentials.apiSecret, "apiSecret")
                    }
                    className={
                      copiedField === "apiSecret"
                        ? "bg-green-600 hover:bg-green-700"
                        : ""
                    }
                  >
                    {copiedField === "apiSecret" ? "✓ Copied" : "Copy"}
                  </Button>
                </div>
              </div>

              <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-3">
                <Text size="sm" className="text-blue-400">
                  You'll need both the API key and secret to configure your
                  TradingView alerts. The secret is used to sign webhook
                  requests.
                </Text>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button onClick={onClose} className="w-full">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create TradingView Webhook</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            <div>
              <Text weight="medium" className="text-white mb-2">
                Webhook Name
              </Text>
              <Input
                value={config.name}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                placeholder="My Trading Strategy"
              />
              <Text size="xs" className="text-gray-400 mt-1">
                A descriptive name to identify this webhook
              </Text>
            </div>

            <div>
              <Text weight="medium" className="text-white mb-2">
                Allowed Symbols
              </Text>
              <div className="space-y-2">
                {availableSymbols.map((symbol) => (
                  <label
                    key={symbol.value}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={config.allowedSymbols.includes(symbol.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setConfig({
                            ...config,
                            allowedSymbols: [
                              ...config.allowedSymbols,
                              symbol.value,
                            ],
                          });
                        } else {
                          setConfig({
                            ...config,
                            allowedSymbols: config.allowedSymbols.filter(
                              (s) => s !== symbol.value,
                            ),
                          });
                        }
                      }}
                      className="rounded border-gray-600 text-purple-500 focus:ring-purple-500"
                    />
                    <Text size="sm" className="text-gray-300">
                      {symbol.label}
                    </Text>
                  </label>
                ))}
              </div>
              <Text size="xs" className="text-gray-400 mt-2">
                Leave unchecked to allow all symbols
              </Text>
            </div>

            <div>
              <Text weight="medium" className="text-white mb-2">
                Max Order Size (USD)
              </Text>
              <Input
                type="number"
                value={config.maxOrderSize}
                onChange={(e) =>
                  setConfig({ ...config, maxOrderSize: Number(e.target.value) })
                }
                placeholder="1000"
              />
              <Text size="xs" className="text-gray-400 mt-1">
                Maximum value for a single order
              </Text>
            </div>

            <div>
              <Text weight="medium" className="text-white mb-2">
                Daily Limit (USD)
              </Text>
              <Input
                type="number"
                value={config.dailyLimit}
                onChange={(e) =>
                  setConfig({ ...config, dailyLimit: Number(e.target.value) })
                }
                placeholder="10000"
              />
              <Text size="xs" className="text-gray-400 mt-1">
                Maximum total order value per day
              </Text>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Text weight="medium" className="text-white">
                  Require Stop Loss
                </Text>
                <Text size="xs" className="text-gray-400">
                  Reject orders without stop loss
                </Text>
              </div>
              <Switch
                checked={config.requireStopLoss}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, requireStopLoss: checked })
                }
              />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={loading || !config.name.trim()}
            className={cn(
              "bg-gradient-to-r from-purple-500 to-pink-500",
              "hover:from-purple-600 hover:to-pink-600",
              "text-white font-medium",
            )}
          >
            {loading ? "Creating..." : "Create Webhook"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
