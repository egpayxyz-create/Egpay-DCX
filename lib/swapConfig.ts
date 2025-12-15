// lib/swapConfig.ts

export const BSC_CHAIN_ID = 56;

export const PANCAKE_ROUTER_V2 = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
export const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
export const USDT = "0x55d398326f99059fF775485246999027B3197955";
export const EGLIFE = "0xca326a5e15b9451efC1A6BddaD6fB098a4D09113";

export type TokenKey = "BNB" | "WBNB" | "USDT" | "EGLIFE";

export const TOKENS: Record<
  TokenKey,
  { symbol: string; address: string | null; decimals: number }
> = {
  BNB: {
    symbol: "BNB",
    address: null, // native
    decimals: 18,
  },
  WBNB: {
    symbol: "WBNB",
    address: WBNB,
    decimals: 18,
  },
  USDT: {
    symbol: "USDT",
    address: USDT,
    decimals: 18, // BSC-USD का 18 decimals है
  },
  EGLIFE: {
    symbol: "EGLIFE",
    address: EGLIFE,
    decimals: 18,
  },
};

// simple ERC20 ABI (allowance, approve, balanceOf)
export const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
];

// minimal Pancake Router ABI
export const PANCAKE_ROUTER_ABI = [
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",

  "function swapExactETHForTokensSupportingFeeOnTransferTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable",

  "function swapExactTokensForETHSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external",

  "function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external",
];