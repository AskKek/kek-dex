"use client";

import React from "react";
import { Box } from "@orderly.network/ui";
import { WebhookManager } from "@/components/WebhookConfig/WebhookManager";

export default function WebhooksView() {
  return (
    <Box
      p={6}
      pb={0}
      intensity={900}
      r="xl"
      width="100%"
      style={{
        minHeight: 379,
        maxHeight: 2560,
        overflow: "hidden",
        height: "calc(100vh - 48px - 29px - 48px)",
      }}
    >
      <WebhookManager />
    </Box>
  );
}
