"use client";

import React, { ReactNode, useMemo } from "react";
import {
  PortfolioLayoutWidget,
  PortfolioLeftSidebarPath,
} from "@orderly.network/portfolio";
import { PathEnum } from "@/constant";
import { useNav } from "@/hooks/useNav";
import { useOrderlyConfig } from "@/hooks/useOrderlyConfig";
import { usePathWithoutLang } from "@/hooks/usePathWithoutLang";

export default function PortfolioLayout(props: { children: ReactNode }) {
  const config = useOrderlyConfig();
  const path = usePathWithoutLang();

  const { onRouteChange } = useNav();

  const currentPath = useMemo(() => {
    if (path.endsWith(PathEnum.FeeTier))
      return PortfolioLeftSidebarPath.FeeTier;

    if (path.endsWith(PathEnum.ApiKey)) return PortfolioLeftSidebarPath.ApiKey;

    if (path.endsWith(PathEnum.Webhooks)) return PathEnum.Webhooks;

    return path;
  }, [path]);

  // Custom sidebar items including webhooks
  const customItems = useMemo(
    () => [
      {
        name: "Overview",
        href: PathEnum.Portfolio,
        icon: null,
      },
      {
        name: "Positions",
        href: PathEnum.Positions,
        icon: null,
      },
      {
        name: "Orders",
        href: PathEnum.Orders,
        icon: null,
      },
      {
        name: "Assets",
        href: PathEnum.Assets,
        icon: null,
      },
      {
        name: "TradingView Webhooks",
        href: PathEnum.Webhooks,
        icon: null,
      },
      {
        name: "History",
        href: PathEnum.History,
        icon: null,
      },
      {
        name: "Fee tier",
        href: PathEnum.FeeTier,
        icon: null,
      },
      {
        name: "API keys",
        href: PathEnum.ApiKey,
        icon: null,
      },
      {
        name: "Settings",
        href: PathEnum.Setting,
        icon: null,
      },
    ],
    [],
  );

  return (
    <PortfolioLayoutWidget
      footerProps={config.scaffold.footerProps}
      mainNavProps={{
        ...config.scaffold.mainNavProps,
        initialMenu: PathEnum.Portfolio,
      }}
      routerAdapter={{
        onRouteChange,
      }}
      leftSideProps={{
        current: currentPath,
        items: customItems,
        onItemSelect: (item: any) => {
          onRouteChange(item.href);
        },
      }}
    >
      {props.children}
    </PortfolioLayoutWidget>
  );
}
