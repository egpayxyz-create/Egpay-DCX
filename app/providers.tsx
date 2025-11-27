"use client";

import { ReactNode, useState } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { bsc } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// BSC Mainnet config
const config = createConfig({
  chains: [bsc],
  transports: {
    [bsc.id]: http(), // public RPC, baad me custom RPC bhi de sakte hain
  },
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}