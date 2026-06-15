const express = require("express");
const router = express.Router();
const data = require("../data");

function getUser(token) {
  const userId = data.sessions[token];
  if (!userId) return null;
  return data.users.find((u) => u.id === userId);
}

// POST /api/orders
router.post("/", (req, res) => {
  const user = getUser(req.headers.authorization);
  if (!user) return res.status(401).json({ error: "Pead olema sisse logitud" });

  const { items } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Vajalik väli: items (massiiv toodetest)" });
  }

  const orderItems = [];
  for (const item of items) {
    const product = data.products.find((p) => p.id === item.productId);
    if (!product) return res.status(404).json({ error: `Toodet ID ${item.productId} ei leitud` });
    if (product.stock < item.quantity) {
      return res.status(409).json({ error: `Toode "${product.name}" pole piisavalt laos` });
    }
    orderItems.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
    });
    // Vähenda laoseisu
    product.stock -= item.quantity;
  }

  const total = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const order = {
    id: data.nextOrderId++,
    userId: user.id,
    userName: user.name,
    items: orderItems,
    total: Math.round(total * 100) / 100,
    // BUG: staatus peaks olema "vastu võetud" mitte "pending"
    status: "vastu võetud",
    createdAt: new Date().toISOString(),
  };

  data.orders.push(order);
  res.status(201).json({ message: "Tellimus loodud!", order });
});

// GET /api/orders
router.get("/", (req, res) => {
  res.json({ orders: data.orders });
});

// GET /api/orders/me
router.get("/me", (req, res) => {
  const user = getUser(req.headers.authorization);
  if (!user) return res.status(401).json({ error: "Pead olema sisse logitud" });
  const userOrders = data.orders.filter((o) => o.userId === user.id);
  res.json({ orders: userOrders, count: userOrders.length });
});

// GET /api/orders/:id
router.get("/:id", (req, res) => {
  const order = data.orders.find((o) => o.id === parseInt(req.params.id));
  if (!order) return res.status(404).json({ error: "Tellimust ei leitud" });
  res.json(order);
});

// PATCH /api/orders/:id/status
router.patch("/:id/status", (req, res) => {
  const { status } = req.body;
  const validStatuses = ["vastu võetud", "töötlemisel", "saadetud", "kohale toimetatud"];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Kehtivad staatused: ${validStatuses.join(", ")}` });
  }
  const order = data.orders.find((o) => o.id === parseInt(req.params.id));
  if (!order) return res.status(404).json({ error: "Tellimust ei leitud" });
  order.status = status;
  res.json({ message: "Staatus uuendatud!", order });
});

module.exports = router;
