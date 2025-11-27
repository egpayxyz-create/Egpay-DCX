"use client";

import { useEffect, useRef } from "react";

type TradingChartProps = {
  pairCode: string; // e.g. "BTC_USDT", "EGLIFE_USDT", "EGLIFE_INR"
};

export default function TradingChart({ pairCode }: TradingChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!containerRef.current) return;

    // Purana widget clear करो
    containerRef.current.innerHTML = "";

    // EGLIFE pairs → GeckoTerminal chart
    if (pairCode.startsWith("EGLIFE")) {
      const iframe = document.createElement("iframe");
      // EGLIFE pool (aapne pehle diya tha GeckoTerminal link)
      iframe.src =
        "https://www.geckoterminal.com/bsc/pools/0xa75f11504a5f171a1b6d4ba8dbf39bf44010fabc?embed=1&info=0";
      iframe.style.border = "none";
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.loading = "lazy";
      containerRef.current.appendChild(iframe);
      return;
    }

    // BTC_USDT ya koi aur → TradingView Advanced Chart
    const tvContainerId = "tv-advanced-chart";

    const inner = document.createElement("div");
    inner.id = tvContainerId;
    inner.style.width = "100%";
    inner.style.height = "100%";
    containerRef.current.appendChild(inner);

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;

    // TradingView settings
    const symbol =
      pairCode === "BTC_USDT"
        ? "BINANCE:BTCUSDT"
        : "BINANCE:BTCUSDT"; // fallback

    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval: "60",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      hide_volume: false,
      container_id: tvContainerId,
      backgroundColor: "#000000",
    });

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [pairCode]);

  return (
    <div className="bg-gray-900 h-96 rounded overflow-hidden border border-yellow-500">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}