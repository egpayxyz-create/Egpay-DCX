// backend-js/trading.js

const fs = require("fs");
const path = require("path");

// JSON files
const MARKETS_DB = path.join(__dirname, "markets.json");
const ORDERS_DB = path.join(__dirname, "orders.json");

// -------------------- Helper: load/save JSON --------------------
function loadJson(file, fallback) {
  try {
    const raw = fs.readFileSync(file, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    return fallback;
  }
}

function saveJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// -------------------- Markets --------------------
function getMarkets() {
  return loadJson(MARKETS_DB, []);
}

function saveMarkets(markets) {
  saveJson(MARKETS_DB, markets);
}

function findMarket(pair) {
  const markets = getMarkets();
  return markets.find((m) => m.pair === pair) || null;
}

// -------------------- Orders --------------------
function getAllOrders() {
  return loadJson(ORDERS_DB, []);
}

function saveAllOrders(orders) {
  saveJson(ORDERS_DB, orders);
}

function getMarketOrders(pair, limit = 50) {
  const orders = getAllOrders()
    .filter((o) => o.pair === pair)
    .sort((a, b) => b.createdAt - a.createdAt);
  return orders.slice(0, limit);
}

function getUserOrders(userId, limit = 50) {
  const orders = getAllOrders()
    .filter((o) => o.userId === userId)
    .sort((a, b) => b.createdAt - a.createdAt);
  return orders.slice(0, limit);
}

// -------------------- Place order (demo engine) --------------------
function placeOrder({ userId, pair, side, price, amount, type }) {
  const markets = getMarkets();
  const market = markets.find((m) => m.pair === pair);
  if (!market) {
    throw new Error("Invalid market pair");
  }

  const orders = getAllOrders();

  const numericPrice = Number(price);
  const numericAmount = Number(amount);
  if (!numericPrice || !numericAmount || numericPrice <= 0 || numericAmount <= 0) {
    throw new Error("Invalid price or amount");
  }

  const total = numericPrice * numericAmount;

  const order = {
    id: Date.now(),
    userId,
    pair,
    side, // "BUY" or "SELL"
    price: numericPrice,
    amount: numericAmount,
    total,
    type: type || "LIMIT",
    status: "FILLED", // demo: immediately filled
    createdAt: Date.now(),
  };

  orders.push(order);
  saveAllOrders(orders);

  // update market lastPrice & volume (very simple demo logic)
  market.lastPrice = numericPrice;
  market.volume24h = (market.volume24h || 0) + numericAmount;

  saveMarkets(markets);

  return order;
}

module.exports = {
  getMarkets,
  getMarketOrders,
  getUserOrders,
  placeOrder,
};