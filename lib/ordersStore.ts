// lib/ordersStore.ts
export type OrderStatus = "PENDING_CONFIRMATION" | "APPROVED" | "REJECTED";

export type Order = {
  orderId: string;
  coin: string;
  utr: string;
  amountInr: number;
  payInr: number;
  feeBps: number;
  amountOut: number;
  toAddress: string;
  status: OrderStatus;
  createdAt: number;
  updatedAt: number;
  txHash?: string;
  blockNumber?: number;
  rejectReason?: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __ordersStore: Map<string, Order> | undefined;
}

export const ordersStore: Map<string, Order> =
  global.__ordersStore ?? (global.__ordersStore = new Map<string, Order>());

export function upsertOrder(order: Order) {
  ordersStore.set(order.orderId, order);
  return order;
}

export function getOrder(orderId: string) {
  return ordersStore.get(orderId);
}