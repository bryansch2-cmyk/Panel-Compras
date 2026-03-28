const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  loadState,
  applyRecharge,
  addPendingUsed,
  deductPendingUsed,
  revertLastCustomAmount,
  updateDeviceFinancials,
  updateCard,
  updateCardNotes,
  toggleCardRejected,
  toggleCardCooldown,
  replaceCard,
  updateProductCount,
  updateSpeech,
  DEVICE_BALANCE_CAP,
  PRODUCT_RULES,
} = require("./storage");

const PORT = Number(process.env.PORT || 4100);
const HOST = process.env.HOST || "0.0.0.0";
const FRONTEND_DIR = path.join(__dirname, "..", "frontend");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk.toString("utf8");
      if (raw.length > 1024 * 1024) {
        reject(new Error("payload-too-large"));
      }
    });
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error("invalid-json"));
      }
    });
    req.on("error", reject);
  });
}

async function serveStatic(req, res) {
  const requestedPath = req.url === "/" ? "/index.html" : req.url;
  const normalizedPath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const fullPath = path.join(FRONTEND_DIR, normalizedPath);

  if (!fullPath.startsWith(FRONTEND_DIR)) {
    sendJson(res, 403, { ok: false, error: "forbidden" });
    return;
  }

  try {
    const stat = await fs.promises.stat(fullPath);
    const finalPath = stat.isDirectory() ? path.join(fullPath, "index.html") : fullPath;
    const ext = path.extname(finalPath).toLowerCase();
    const mimeType = MIME_TYPES[ext] || "application/octet-stream";
    const content = await fs.promises.readFile(finalPath);
    res.writeHead(200, { "Content-Type": mimeType });
    res.end(content);
  } catch (error) {
    sendJson(res, 404, { ok: false, error: "not-found" });
  }
}

function getLanUrls() {
  const interfaces = os.networkInterfaces();
  return Object.values(interfaces)
    .flat()
    .filter((entry) => entry && entry.family === "IPv4" && !entry.internal)
    .map((entry) => `http://${entry.address}:${PORT}/`);
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`);
  const segments = url.pathname.split("/").filter(Boolean);

  if (req.method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, {
      ok: true,
      service: "panel-compras-web",
      storage: "json",
      url: `http://localhost:${PORT}/`,
      lanUrls: getLanUrls(),
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/state") {
    const state = await loadState();
    sendJson(res, 200, {
      ...state,
      constants: {
        deviceBalanceCap: DEVICE_BALANCE_CAP,
        productRules: PRODUCT_RULES,
      },
    });
    return;
  }

  if (req.method === "POST" && segments[0] === "api" && segments[1] === "devices" && segments[3] === "recharge") {
    const payload = await readRequestBody(req);
    const state = await applyRecharge(segments[2], payload.amount);
    sendJson(res, 200, state);
    return;
  }

  if (req.method === "POST" && segments[0] === "api" && segments[1] === "devices" && segments[3] === "pending-used") {
    const payload = await readRequestBody(req);
    const state = await addPendingUsed(segments[2], payload.amount);
    sendJson(res, 200, state);
    return;
  }

  if (req.method === "POST" && segments[0] === "api" && segments[1] === "devices" && segments[3] === "deduct-pending") {
    const state = await deductPendingUsed(segments[2]);
    sendJson(res, 200, state);
    return;
  }

  if (req.method === "POST" && segments[0] === "api" && segments[1] === "devices" && segments[3] === "revert-custom") {
    const state = await revertLastCustomAmount(segments[2]);
    sendJson(res, 200, state);
    return;
  }

  if (req.method === "POST" && segments[0] === "api" && segments[1] === "devices" && segments[3] === "financials") {
    const payload = await readRequestBody(req);
    const state = await updateDeviceFinancials(segments[2], payload);
    sendJson(res, 200, state);
    return;
  }

  if (req.method === "POST" && segments[0] === "api" && segments[1] === "devices" && segments[3] === "cards" && segments[5] === "update") {
    const payload = await readRequestBody(req);
    const state = await updateCard(segments[2], segments[4], payload);
    sendJson(res, 200, state);
    return;
  }

  if (req.method === "POST" && segments[0] === "api" && segments[1] === "devices" && segments[3] === "cards" && segments[5] === "notes") {
    const payload = await readRequestBody(req);
    const state = await updateCardNotes(segments[2], segments[4], payload.notes);
    sendJson(res, 200, state);
    return;
  }

  if (req.method === "POST" && segments[0] === "api" && segments[1] === "devices" && segments[3] === "cards" && segments[5] === "toggle-rejected") {
    const state = await toggleCardRejected(segments[2], segments[4]);
    sendJson(res, 200, state);
    return;
  }

  if (req.method === "POST" && segments[0] === "api" && segments[1] === "devices" && segments[3] === "cards" && segments[5] === "toggle-cooldown") {
    const state = await toggleCardCooldown(segments[2], segments[4]);
    sendJson(res, 200, state);
    return;
  }

  if (req.method === "POST" && segments[0] === "api" && segments[1] === "devices" && segments[3] === "cards" && segments[5] === "replace") {
    const payload = await readRequestBody(req);
    const state = await replaceCard(segments[2], segments[4], payload);
    sendJson(res, 200, state);
    return;
  }

  if (req.method === "POST" && segments[0] === "api" && segments[1] === "devices" && segments[3] === "cards" && segments[5] === "product") {
    const payload = await readRequestBody(req);
    const state = await updateProductCount(segments[2], segments[4], payload.productKey, Number(payload.delta || 0));
    sendJson(res, 200, state);
    return;
  }

  if (req.method === "POST" && segments[0] === "api" && segments[1] === "speeches" && segments[2]) {
    const payload = await readRequestBody(req);
    const state = await updateSpeech(segments[2], payload);
    sendJson(res, 200, state);
    return;
  }

  sendJson(res, 404, { ok: false, error: "route-not-found" });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith("/api/")) {
      await handleApi(req, res);
      return;
    }

    await serveStatic(req, res);
  } catch (error) {
    const message = String(error?.message || "server-error");
    const status = message === "invalid-json" ? 400 : 500;
    sendJson(res, status, {
      ok: false,
      error: message,
    });
  }
});

server.listen(PORT, HOST, () => {
  const lanUrls = getLanUrls();
  console.log(`Panel Compras Web activo en http://localhost:${PORT}/`);
  if (lanUrls.length) {
    console.log("Disponible en red local:");
    lanUrls.forEach((url) => console.log(`- ${url}`));
  }
});
