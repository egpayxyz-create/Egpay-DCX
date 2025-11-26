// backend-js/index.js

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const { signup, login, verifyToken, verifyAdmin } = require("./auth");

const app = express();
app.use(cors());
app.use(express.json());

const USERS_FILE = path.join(__dirname, "users.json");
const PAYMENTS_FILE = path.join(__dirname, "payments.json");

// =====================================
//  SUPPORTED PAIRS (MARKETS)
// =====================================
const PAIRS = ["EGLIFE_USDT", "EGLIFE_INR", "BTC_USDT"];

// Har pair ke liye alag orders/trades
const ordersByPair = {};
const tradesByPair = {};

PAIRS.forEach((p) => {
  ordersByPair[p] = [];
  tradesByPair[p] = [];
});

// Demo wallet balance (global – simple MVP)
let userBalance = {
  usdt: 10000,
  btc: 1.5,
  eglife: 500000, // demo EGLIFE balance
  inr: 0, // INR virtual balance (future use)
};

// =====================================
//  MERCHANTS + PAYMENTS
// =====================================

const MERCHANTS = [
  {
    id: "SHOP001",
    name: "EGPAY Demo Store",
    egpayId: "egpay.demo@egpay",
    upi: "7545978703@upi",
  },
  {
    id: "SHOP002",
    name: "EGPAY Kirana",
    egpayId: "kirana@egpay",
    upi: "9999999999@upi",
  },
];

// payments = [{ id, merchantId, userId, amount, currency, status, createdAt, paidAt }]
function loadPayments() {
  try {
    const raw = fs.readFileSync(PAYMENTS_FILE, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

function savePayments(list) {
  fs.writeFileSync(PAYMENTS_FILE, JSON.stringify(list, null, 2));
}

// =====================================
//  HEALTH CHECK
// =====================================
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "egpaydcx-backend" });
});

// =====================================
//  AUTH ROUTES (signup / login / token)
// =====================================
app.post("/signup", signup);
app.post("/login", login);

app.get("/protected", verifyToken, (req, res) => {
  res.json({ message: "Valid token", user: req.user });
});

// =====================================
//  MARKETS LIST (with lastPrice per pair)
// =====================================
app.get("/markets", (req, res) => {
  const markets = PAIRS.map((pair) => {
    const symbol = pair.replace("_", "/");
    const trades = tradesByPair[pair];
    const lastPrice = trades.length
      ? trades[0].price
      : defaultPriceForPair(pair);
    return {
      pair,
      symbol,
      lastPrice,
      totalTrades: trades.length,
    };
  });
  res.json(markets);
});

function defaultPriceForPair(pair) {
  switch (pair) {
    case "BTC_USDT":
      return 65000;
    case "EGLIFE_USDT":
      return 0.0042;
    case "EGLIFE_INR":
      return 0.35;
    default:
      return 0;
  }
}

// =====================================
//  ORDERS + TRADES PER PAIR
// =====================================

// GET /orders?pair=BTC_USDT
app.get("/orders", (req, res) => {
  const pair = req.query.pair;
  if (pair) {
    if (!ordersByPair[pair]) {
      return res.status(400).json({ error: "Unknown pair", pair });
    }
    return res.json(ordersByPair[pair]);
  }
  res.json(ordersByPair);
});

// GET /markets/:pair/orders  (recent trades/orders for ek pair)
app.get("/markets/:pair/orders", (req, res) => {
  const pair = req.params.pair;
  if (!tradesByPair[pair]) {
    return res.status(400).json({ error: "Unknown pair", pair });
  }
  const list = tradesByPair[pair].slice(0, 50);
  res.json(list);
});

// Helper: ek user ke sabhi orders
function getUserOrders(userId, limit = 100) {
  const result = [];
  PAIRS.forEach((pair) => {
    (ordersByPair[pair] || []).forEach((o) => {
      if (o.userId === userId) result.push(o);
    });
  });
  result.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return result.slice(0, limit);
}

// GET /orders/my  (logged-in user history)
app.get("/orders/my", verifyToken, (req, res) => {
  try {
    const userId = req.user.id;
    const orders = getUserOrders(userId, 100);
    res.json(orders);
  } catch (err) {
    console.error("GET /orders/my error:", err);
    res.status(500).json({ error: "Failed to load user orders" });
  }
});

// POST /orders (trading orders)
app.post("/orders", verifyToken, (req, res) => {
  const {
    pair = "BTC_USDT",
    side,
    price,
    amount,
    total,
    fee,
    finalAmount,
    time,
  } = req.body;

  if (!PAIRS.includes(pair)) {
    return res.status(400).json({ error: "Invalid pair", pair });
  }

  if (!side || !price || !amount) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const numericPrice = parseFloat(price);
  const numericAmount = parseFloat(amount);
  const numericTotal =
    total !== undefined ? parseFloat(total) : numericPrice * numericAmount;
  const numericFee = fee !== undefined ? parseFloat(fee) : 0;
  const numericFinal =
    finalAmount !== undefined ? parseFloat(finalAmount) : numericTotal;

  if (
    !numericPrice ||
    !numericAmount ||
    Number.isNaN(numericPrice) ||
    Number.isNaN(numericAmount)
  ) {
    return res.status(400).json({ error: "Invalid price or amount" });
  }

  const order = {
    id: Date.now(),
    userId: req.user.id,
    pair,
    side,
    price: numericPrice,
    amount: numericAmount,
    total: numericTotal,
    fee: numericFee,
    finalAmount: numericFinal,
    time: time || new Date().toLocaleTimeString(),
    createdAt: new Date().toISOString(),
  };

  ordersByPair[pair].unshift(order);
  tradesByPair[pair].unshift(order);

  res.json({
    success: true,
    message: "Order + trade saved",
    order,
  });
});

// GET /trades?pair=BTC_USDT
app.get("/trades", (req, res) => {
  const pair = req.query.pair;
  if (pair) {
    if (!tradesByPair[pair]) {
      return res.status(400).json({ error: "Unknown pair", pair });
    }
    return res.json(tradesByPair[pair]);
  }
  res.json(tradesByPair);
});

// =====================================
//  USER BALANCE (ab EGLIFE + INR bhi)
// =====================================
app.get("/balance", (req, res) => {
  res.json(userBalance);
});

app.post("/balance", (req, res) => {
  userBalance = {
    usdt: req.body.usdt ?? userBalance.usdt,
    btc: req.body.btc ?? userBalance.btc,
    eglife: req.body.eglife ?? userBalance.eglife,
    inr: req.body.inr ?? userBalance.inr,
  };
  res.json({ success: true, message: "Balance updated", userBalance });
});

// =====================================
//  MERCHANT APIs (Scan & Pay)
// =====================================

// GET /merchants
app.get("/merchants", (req, res) => {
  res.json(MERCHANTS);
});

// GET /merchants/:id
app.get("/merchants/:id", (req, res) => {
  const id = req.params.id;
  const merchant = MERCHANTS.find((m) => m.id === id);
  if (!merchant) {
    return res.status(404).json({ error: "Merchant not found" });
  }
  res.json(merchant);
});

// POST /payments  (user → merchant : Scan & Pay)
// body: { merchantId, amount, currency }
app.post("/payments", verifyToken, (req, res) => {
  try {
    const { merchantId, amount, currency = "INR" } = req.body;

    if (!merchantId || !amount) {
      return res
        .status(400)
        .json({ error: "merchantId and amount are required" });
    }

    const merchant = MERCHANTS.find((m) => m.id === merchantId);
    if (!merchant) {
      return res.status(404).json({ error: "Merchant not found" });
    }

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const payments = loadPayments();

    const payment = {
      id: Date.now().toString(),
      merchantId,
      userId: req.user.id,
      amount: numericAmount,
      currency,
      status: "PAID", // demo: instant success
      createdAt: new Date().toISOString(),
      paidAt: new Date().toISOString(),
    };

    payments.unshift(payment);
    savePayments(payments);

    // (Optional) yaha aap future me userBalance / merchantBalance adjust kar sakte hain.

    res.json({
      success: true,
      message: "Payment successful",
      payment,
      merchant,
    });
  } catch (err) {
    console.error("POST /payments error:", err);
    res.status(500).json({ error: "Payment failed" });
  }
});

// GET /payments/my  (user ka payment history)
app.get("/payments/my", verifyToken, (req, res) => {
  try {
    const payments = loadPayments().filter(
      (p) => p.userId === req.user.id
    );
    res.json(payments);
  } catch (err) {
    console.error("GET /payments/my error:", err);
    res.status(500).json({ error: "Failed to load payments" });
  }
});

// GET /payments/merchant/:merchantId  (admin view)
app.get("/payments/merchant/:merchantId", verifyAdmin, (req, res) => {
  try {
    const { merchantId } = req.params;
    const payments = loadPayments().filter(
      (p) => p.merchantId === merchantId
    );
    res.json(payments);
  } catch (err) {
    console.error("GET /payments/merchant error:", err);
    res.status(500).json({ error: "Failed to load merchant payments" });
  }
});

// =====================================
//  ADMIN ROUTES (protected)
// =====================================

// sab users (password ke bina)
app.get("/admin/users", verifyAdmin, (req, res) => {
  try {
    const raw = fs.readFileSync(USERS_FILE, "utf8");
    const users = JSON.parse(raw);
    const safeUsers = users.map(({ password, ...rest }) => rest);
    res.json(safeUsers);
  } catch (err) {
    console.error("Error reading users:", err);
    res.status(500).json({ error: "Failed to load users" });
  }
});

// exchange stats
app.get("/admin/stats", verifyAdmin, (req, res) => {
  let totalOrders = 0;
  let totalTrades = 0;
  let totalVolume = 0;

  PAIRS.forEach((pair) => {
    const pairOrders = ordersByPair[pair] || [];
    const pairTrades = tradesByPair[pair] || [];

    totalOrders += pairOrders.length;
    totalTrades += pairTrades.length;

    pairTrades.forEach((t) => {
      totalVolume += Number(t.amount) || 0;
    });
  });

  res.json({
    totalMarkets: PAIRS.length,
    totalTrades,
    totalOrders,
    totalVolume,
    userBalance,
  });
});

// admin markets list
app.get("/admin/markets", verifyAdmin, (req, res) => {
  const markets = PAIRS.map((pair) => {
    const symbol = pair.replace("_", "/");
    const trades = tradesByPair[pair];
    const lastPrice = trades.length
      ? trades[0].price
      : defaultPriceForPair(pair);
    return {
      pair,
      symbol,
      lastPrice,
      totalTrades: trades.length,
    };
  });
  res.json(markets);
});

// price update
app.post("/admin/markets/update-price", verifyAdmin, (req, res) => {
  const { pair, price } = req.body;

  if (!pair || price === undefined) {
    return res.status(400).json({ error: "pair and price are required" });
  }

  if (!PAIRS.includes(pair)) {
    return res.status(404).json({ error: "Market pair not found" });
  }

  const numericPrice = Number(price);
  if (Number.isNaN(numericPrice)) {
    return res.status(400).json({ error: "Invalid price" });
  }

  const fakeTrade = {
    pair,
    side: "admin-update",
    price: numericPrice,
    amount: 0,
    total: 0,
    fee: 0,
    finalAmount: 0,
    time: new Date().toLocaleTimeString(),
    createdAt: new Date().toISOString(),
  };

  tradesByPair[pair].unshift(fakeTrade);

  res.json({
    success: true,
    message: "Price updated",
    pair,
    price: numericPrice,
  });
});

// =====================================
//  START BACKEND
// =====================================

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(
    `EGPAYDCX multi-pair backend (with EGLIFE + Admin) running on port ${PORT}`
  );
});