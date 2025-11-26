import { Address, formatUnits } from "viem";
import { useReadContract } from "wagmi";

// EGLIFE token contract (BSC mainnet)
export const EGLIFE_TOKEN_ADDRESS: Address =
  "0xca326a5e15b9451efC1A6BddaD6fB098a4D09113";

// Minimal ERC20 ABI: balanceOf, decimals, symbol
export const eglifeAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

// Hook: walletAddress se on-chain EGLIFE balance padhne ke liye
export function useOnchainEglifeBalance(walletAddress?: string | null) {
  const address =
    walletAddress && walletAddress.startsWith("0x")
      ? (walletAddress as Address)
      : undefined;

  const enabled = !!address;

  // decimals() call
  const decimalsQuery = useReadContract({
    address: EGLIFE_TOKEN_ADDRESS,
    abi: eglifeAbi,
    functionName: "decimals",
    query: {
      enabled,
    },
  });

  // balanceOf(address) call
  const balanceQuery = useReadContract({
    address: EGLIFE_TOKEN_ADDRESS,
    abi: eglifeAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled,
    },
  });

  if (!enabled) {
    return {
      enabled,
      isLoading: false,
      error: null as any,
      rawBalance: BigInt(0),
      decimals: 18,
      formatted: "0.00",
      symbol: "EGLIFE",
    };
  }

  const decimals =
    typeof decimalsQuery.data === "number" ? decimalsQuery.data : 18;

  const rawBalance =
    typeof balanceQuery.data === "bigint"
      ? balanceQuery.data
      : BigInt(0);

  const formatted = formatUnits(rawBalance, decimals);

  return {
    enabled,
    isLoading: decimalsQuery.isLoading || balanceQuery.isLoading,
    error: decimalsQuery.error || balanceQuery.error,
    rawBalance,
    decimals,
    formatted,
    symbol: "EGLIFE",
  };
}