const fs = require("fs");
const path = require("path");

const LOCAL_DATA_DIR = path.join(__dirname, "data");
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : LOCAL_DATA_DIR;
const STATE_PATH = path.join(DATA_DIR, "state.json");
const BUNDLED_STATE_PATH = path.join(LOCAL_DATA_DIR, "state.json");
const DEVICE_BALANCE_CAP = 2750;
const PRODUCT_RULES = [
  { key: "epic", label: "Epic", amount: 79, maxCount: 6 },
  { key: "xbox", label: "Xbox", amount: 79, maxCount: 2 },
  { key: "nitro", label: "Nitro", amount: 104.99, maxCount: 3 },
  { key: "nitroYear", label: "Nitro 1y", amount: 1049.99, maxCount: 2 },
  { key: "crunchy", label: "Crunchy", amount: 89.9, maxCount: 0 },
];

function roundMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix = "id") {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
}

function createEmptyCounts() {
  return {
    epic: 0,
    xbox: 0,
    nitro: 0,
    nitroYear: 0,
    crunchy: 0,
  };
}

function getMonthKey(value) {
  return String(value || todayIso()).slice(0, 7);
}

function isCardCooldownActive(card) {
  return Boolean(card?.cooldownUntil) && new Date(card.cooldownUntil).getTime() > Date.now();
}

function createCard(order, number) {
  return {
    id: `card-${order}`,
    order,
    orderLabel: `Tarjeta ${order}`,
    number,
    createdAt: "2026-03-20",
    expiry: "22/06",
    cvv: "***",
    archived: false,
    resetAt: "",
    counts: createEmptyCounts(),
    baseCounts: createEmptyCounts(),
    cooldownUntil: "",
    rejectedAt: "",
    notes: "",
  };
}

function createSeedState() {
  const firstCard = createCard(1, "************4545");
  firstCard.baseCounts.nitroYear = 1;

  return {
    meta: {
      updatedAt: "",
      revision: 0,
      seedVersion: "seed-default-v1",
    },
    devices: [
      {
        id: "iphone-12-pro-bryan",
        title: "IPHONE 12 PRO BRYAN",
        note: "",
        createdAt: "2025-12-15",
        availableBalance: 1600,
        pendingUsed: 900,
        extraUsed: 0,
        lastCustomAmount: 0,
        lastDeducted: 0,
        carryoverBalance: 0,
        balanceLimitCurrent: 1150,
        limitCycleMonth: "2026-03",
        activeCardOrder: 1,
        lastRechargeAt: "2026-03-23",
        lastRechargeAmount: 1500,
        rechargeHistory: [],
        purchaseHistory: [],
        pendingLedger: [],
        cards: [
          firstCard,
          createCard(2, "************9987"),
          createCard(3, "************1290"),
        ],
      },
    ],
    speeches: {},
  };
}

function isSeedLikeState(state) {
  const devices = Array.isArray(state?.devices) ? state.devices : [];
  if (devices.length !== 1) {
    return false;
  }

  const firstDevice = devices[0];
  return firstDevice?.id === "iphone-12-pro-bryan";
}

function shouldPromoteBundledState(currentState, bundledState) {
  if (!bundledState || !Array.isArray(bundledState.devices) || !bundledState.devices.length) {
    return false;
  }

  const currentDevices = Array.isArray(currentState?.devices) ? currentState.devices : [];
  const currentRevision = Number(currentState?.meta?.revision || 0);
  const bundledRevision = Number(bundledState?.meta?.revision || 0);
  const currentSeedVersion = String(currentState?.meta?.seedVersion || "");
  const bundledSeedVersion = String(bundledState?.meta?.seedVersion || "");
  if (!currentDevices.length) {
    return true;
  }

  if (bundledSeedVersion && bundledSeedVersion !== currentSeedVersion) {
    return true;
  }

  if (bundledRevision > currentRevision) {
    return true;
  }

  if (isSeedLikeState(currentState)) {
    return true;
  }

  return currentDevices.length < bundledState.devices.length;
}

function loadBundledState() {
  try {
    if (!fs.existsSync(BUNDLED_STATE_PATH)) {
      return null;
    }
    const raw = JSON.parse(fs.readFileSync(BUNDLED_STATE_PATH, "utf8"));
    const normalized = normalizeState(raw);
    return Array.isArray(normalized.devices) && normalized.devices.length ? normalized : null;
  } catch (error) {
    return null;
  }
}

async function ensureStateFile() {
  await fs.promises.mkdir(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STATE_PATH)) {
    const initialState =
      DATA_DIR !== LOCAL_DATA_DIR
        ? (loadBundledState() || createSeedState())
        : createSeedState();
    await fs.promises.writeFile(STATE_PATH, JSON.stringify(initialState, null, 2), "utf8");
  }
}

function normalizeCounts(raw) {
  const base = createEmptyCounts();
  Object.keys(base).forEach((key) => {
    base[key] = Math.max(0, Math.trunc(Number(raw?.[key] || 0)));
  });
  return base;
}

function calculatePendingUsed(device) {
  const cardPending = (Array.isArray(device?.cards) ? device.cards : [])
    .filter((card) => !card.archived)
    .reduce((sum, card) => {
      return sum + PRODUCT_RULES.reduce((cardSum, rule) => {
        return cardSum + Number(card.counts?.[rule.key] || 0) * rule.amount;
      }, 0);
    }, 0);

  return roundMoney(cardPending + Number(device?.extraUsed || 0));
}

function normalizeCard(raw, index) {
  return {
    id: typeof raw?.id === "string" ? raw.id : createId("card"),
    order: Number.isFinite(Number(raw?.order)) ? Number(raw.order) : index + 1,
    orderLabel: String(raw?.orderLabel || `Tarjeta ${index + 1}`),
    number: String(raw?.number || ""),
    createdAt: String(raw?.createdAt || todayIso()),
    expiry: String(raw?.expiry || ""),
    cvv: String(raw?.cvv || ""),
    archived: Boolean(raw?.archived),
    resetAt: String(raw?.resetAt || ""),
    counts: normalizeCounts(raw?.counts),
    baseCounts: normalizeCounts(raw?.baseCounts),
    cooldownUntil: String(raw?.cooldownUntil || ""),
    rejectedAt: String(raw?.rejectedAt || ""),
    notes: typeof raw?.notes === "string" ? raw.notes : "",
  };
}

function normalizeDevice(raw) {
  const availableBalance = Math.max(0, Math.min(DEVICE_BALANCE_CAP, roundMoney(raw?.availableBalance)));
  const inferredLimit = Math.max(0, roundMoney(DEVICE_BALANCE_CAP - availableBalance));
  const cards = Array.isArray(raw?.cards) ? raw.cards.map(normalizeCard) : [];

  const normalized = {
    id: String(raw?.id || createId("device")),
    title: String(raw?.title || "Dispositivo"),
    note: typeof raw?.note === "string" ? raw.note : "",
    createdAt: String(raw?.createdAt || todayIso()),
    availableBalance,
    pendingUsed: 0,
    extraUsed: Math.max(0, roundMoney(raw?.extraUsed)),
    lastCustomAmount: Math.max(0, roundMoney(raw?.lastCustomAmount)),
    lastDeducted: Math.max(0, roundMoney(raw?.lastDeducted)),
    carryoverBalance: Math.max(0, roundMoney(raw?.carryoverBalance)),
    balanceLimitCurrent: Math.max(
      0,
      Math.min(
        DEVICE_BALANCE_CAP,
        roundMoney(Number.isFinite(Number(raw?.balanceLimitCurrent)) ? Number(raw.balanceLimitCurrent) : inferredLimit),
      ),
    ),
    limitCycleMonth: String(raw?.limitCycleMonth || getMonthKey(todayIso())),
    activeCardOrder: Number.isFinite(Number(raw?.activeCardOrder)) ? Number(raw.activeCardOrder) : 1,
    lastRechargeAt: String(raw?.lastRechargeAt || ""),
    lastRechargeAmount: Math.max(0, roundMoney(raw?.lastRechargeAmount)),
    rechargeHistory: Array.isArray(raw?.rechargeHistory)
      ? raw.rechargeHistory.map((entry) => ({
          id: typeof entry?.id === "string" ? entry.id : createId("recharge"),
          at: String(entry?.at || entry?.date || ""),
          amount: Math.max(0, roundMoney(entry?.amount)),
          balanceAfter: Math.max(0, roundMoney(entry?.balanceAfter)),
          limitAfter: Math.max(0, roundMoney(entry?.limitAfter)),
        }))
      : [],
    purchaseHistory: Array.isArray(raw?.purchaseHistory)
      ? raw.purchaseHistory.map((entry) => ({
          id: typeof entry?.id === "string" ? entry.id : createId("purchase"),
          at: String(entry?.at || entry?.date || ""),
          productKey: String(entry?.productKey || ""),
          productName: String(entry?.productName || "Compra"),
          amount: Math.max(0, roundMoney(entry?.amount)),
          note: typeof entry?.note === "string" ? entry.note : "",
        }))
      : [],
    pendingLedger: Array.isArray(raw?.pendingLedger) ? raw.pendingLedger : [],
    cards,
  };

  normalized.pendingUsed = calculatePendingUsed(normalized);
  return normalized;
}

function normalizeState(raw) {
  const fallback = createSeedState();
  if (!raw || typeof raw !== "object") {
    return fallback;
  }

  return {
    meta: {
      updatedAt: typeof raw.meta?.updatedAt === "string" ? raw.meta.updatedAt : "",
      revision: Number.isFinite(Number(raw.meta?.revision)) ? Number(raw.meta.revision) : 0,
      seedVersion: typeof raw.meta?.seedVersion === "string" ? raw.meta.seedVersion : "",
    },
    devices: Array.isArray(raw.devices) ? raw.devices.map(normalizeDevice) : fallback.devices,
    speeches: raw.speeches && typeof raw.speeches === "object" ? raw.speeches : {},
  };
}

function refreshMonthlyBalanceLimit(device) {
  const currentMonth = getMonthKey(todayIso());
  const storedMonth = String(device.limitCycleMonth || "");
  const inferredLimit = Math.max(0, roundMoney(DEVICE_BALANCE_CAP - Number(device.availableBalance || 0)));

  if (!storedMonth) {
    device.limitCycleMonth = currentMonth;
    device.balanceLimitCurrent = inferredLimit;
    return true;
  }

  if (storedMonth !== currentMonth) {
    const carryover = Math.max(0, roundMoney(Number(device.availableBalance || 0)));
    device.balanceLimitCurrent = Math.max(0, roundMoney(DEVICE_BALANCE_CAP - carryover));
    device.limitCycleMonth = currentMonth;
    return true;
  }

  const normalizedLimit = Math.max(0, Math.min(DEVICE_BALANCE_CAP, roundMoney(Number(device.balanceLimitCurrent || 0))));
  if (normalizedLimit !== Number(device.balanceLimitCurrent || 0)) {
    device.balanceLimitCurrent = normalizedLimit;
    return true;
  }

  return false;
}

function refreshAutomaticCardStates(state) {
  let changed = false;

  state.devices.forEach((device) => {
    let deviceChanged = false;
    device.cards.forEach((card) => {
      if (!card.cooldownUntil) {
        return;
      }
      if (new Date(card.cooldownUntil).getTime() > Date.now()) {
        return;
      }

      card.cooldownUntil = "";
      card.rejectedAt = "";
      card.counts.epic = 0;
      card.baseCounts.epic = 0;
      deviceChanged = true;
    });

    if (refreshMonthlyBalanceLimit(device)) {
      deviceChanged = true;
    }

    if (deviceChanged) {
      device.pendingUsed = calculatePendingUsed(device);
      changed = true;
    }
  });

  return changed;
}

async function writeState(state) {
  const normalized = normalizeState(state);
  const finalState = {
    ...normalized,
    meta: {
      updatedAt: new Date().toISOString(),
      revision: normalized.meta.revision + 1,
      seedVersion: normalized.meta.seedVersion || "",
    },
  };

  const tempPath = `${STATE_PATH}.${process.pid}.${Date.now()}.tmp`;
  await fs.promises.writeFile(tempPath, JSON.stringify(finalState, null, 2), "utf8");
  await fs.promises.rename(tempPath, STATE_PATH);
  return finalState;
}

async function loadState() {
  await ensureStateFile();
  const raw = await fs.promises.readFile(STATE_PATH, "utf8");
  const normalized = normalizeState(JSON.parse(raw));
  if (DATA_DIR !== LOCAL_DATA_DIR) {
    const bundled = loadBundledState();
    if (bundled && bundled.devices.length > 1 && shouldPromoteBundledState(normalized, bundled)) {
      return writeState(bundled);
    }
  }
  if (refreshAutomaticCardStates(normalized)) {
    return writeState(normalized);
  }
  return normalized;
}

function findDevice(state, deviceId) {
  return state.devices.find((device) => device.id === deviceId);
}

function findCard(device, cardId) {
  return Array.isArray(device?.cards) ? device.cards.find((card) => card.id === cardId) : null;
}

async function applyRecharge(deviceId, amount) {
  const state = await loadState();
  const device = findDevice(state, deviceId);
  if (!device) {
    throw new Error("device-not-found");
  }

  const nextAmount = roundMoney(amount);
  if (nextAmount <= 0) {
    throw new Error("invalid-amount");
  }

  const room = Math.max(0, DEVICE_BALANCE_CAP - Number(device.availableBalance || 0));
  const actualAdded = Math.min(nextAmount, room);

  device.availableBalance = roundMoney(Number(device.availableBalance || 0) + actualAdded);
  device.balanceLimitCurrent = Math.max(0, roundMoney(Number(device.balanceLimitCurrent || DEVICE_BALANCE_CAP) - actualAdded));
  device.lastRechargeAmount = actualAdded;
  device.lastRechargeAt = todayIso();
  device.rechargeHistory = Array.isArray(device.rechargeHistory) ? device.rechargeHistory : [];
  device.rechargeHistory.unshift({
    id: createId("recharge"),
    at: nowIso(),
    amount: actualAdded,
    balanceAfter: device.availableBalance,
    limitAfter: device.balanceLimitCurrent,
  });
  device.rechargeHistory = device.rechargeHistory.slice(0, 40);

  return writeState(state);
}

async function addPendingUsed(deviceId, amount) {
  const state = await loadState();
  const device = findDevice(state, deviceId);
  if (!device) {
    throw new Error("device-not-found");
  }

  const nextAmount = roundMoney(amount);
  if (nextAmount <= 0) {
    throw new Error("invalid-amount");
  }

  device.extraUsed = roundMoney(Number(device.extraUsed || 0) + nextAmount);
  device.lastCustomAmount = nextAmount;
  device.pendingUsed = calculatePendingUsed(device);
  device.pendingLedger = Array.isArray(device.pendingLedger) ? device.pendingLedger : [];
  device.pendingLedger.push({
    id: createId("pending"),
    at: nowIso(),
    productName: "Otro monto",
    amount: nextAmount,
    note: "Monto libre",
  });
  return writeState(state);
}

async function deductPendingUsed(deviceId) {
  const state = await loadState();
  const device = findDevice(state, deviceId);
  if (!device) {
    throw new Error("device-not-found");
  }

  const pending = roundMoney(device.pendingUsed);
  if (pending <= 0) {
    throw new Error("nothing-to-deduct");
  }
  if (pending > Number(device.availableBalance || 0)) {
    throw new Error("insufficient-funds");
  }

  device.availableBalance = roundMoney(Number(device.availableBalance || 0) - pending);
  device.lastDeducted = pending;

  const ledgerEntries = Array.isArray(device.pendingLedger) ? device.pendingLedger : [];
  const timestamp = nowIso();
  const purchaseEntries = [];

  (Array.isArray(device.cards) ? device.cards : []).filter((card) => !card.archived).forEach((card) => {
    PRODUCT_RULES.forEach((rule) => {
      const pendingCount = Math.max(0, Number(card.counts?.[rule.key] || 0));
      if (!pendingCount) {
        return;
      }

      for (let index = 0; index < pendingCount; index += 1) {
        purchaseEntries.push({
          id: createId("purchase"),
          at: timestamp,
          productKey: rule.key,
          productName: rule.label,
          amount: roundMoney(rule.amount),
          note: card.orderLabel || "",
        });
      }

      card.baseCounts[rule.key] = Math.max(0, Number(card.baseCounts?.[rule.key] || 0)) + pendingCount;
      card.counts[rule.key] = 0;
    });
  });

  if (ledgerEntries.length) {
    purchaseEntries.push(...ledgerEntries.map((entry) => ({
      id: entry.id || createId("purchase"),
      at: entry.at || timestamp,
      productName: entry.productName || "Otro monto",
      amount: roundMoney(entry.amount),
      note: entry.note || "",
    })));
  }

  if (!purchaseEntries.length) {
    purchaseEntries.push({
      id: createId("purchase"),
      at: timestamp,
      productName: "Otro monto",
      amount: pending,
      note: "Monto libre",
    });
  }

  device.purchaseHistory = [...purchaseEntries, ...(Array.isArray(device.purchaseHistory) ? device.purchaseHistory : [])].slice(0, 80);
  device.extraUsed = 0;
  device.pendingUsed = calculatePendingUsed(device);
  device.lastCustomAmount = 0;
  device.pendingLedger = [];

  return writeState(state);
}

async function revertLastCustomAmount(deviceId) {
  const state = await loadState();
  const device = findDevice(state, deviceId);
  if (!device) {
    throw new Error("device-not-found");
  }

  const ledgerEntries = Array.isArray(device.pendingLedger) ? device.pendingLedger : [];
  const lastCustomIndex = [...ledgerEntries]
    .map((entry, index) => ({ entry, index }))
    .reverse()
    .find(({ entry }) => entry?.productName === "Otro monto");

  if (!lastCustomIndex) {
    throw new Error("nothing-to-deduct");
  }

  const amount = roundMoney(lastCustomIndex.entry.amount);
  ledgerEntries.splice(lastCustomIndex.index, 1);
  device.pendingLedger = ledgerEntries;
  device.extraUsed = Math.max(0, roundMoney(Number(device.extraUsed || 0) - amount));
  device.lastCustomAmount = 0;
  device.pendingUsed = calculatePendingUsed(device);

  return writeState(state);
}

async function updateCard(deviceId, cardId, payload) {
  const state = await loadState();
  const device = findDevice(state, deviceId);
  if (!device) {
    throw new Error("device-not-found");
  }

  const card = findCard(device, cardId);
  if (!card) {
    throw new Error("card-not-found");
  }

  const nextNumber = String(payload?.number || card.number || "").trim();
  if (!nextNumber) {
    throw new Error("invalid-card-number");
  }

  card.number = nextNumber;
  card.expiry = String(payload?.expiry || card.expiry || "").trim();
  card.cvv = String(payload?.cvv || card.cvv || "").trim();
  card.createdAt = String(payload?.createdAt || card.createdAt || "").trim();
  card.baseCounts = normalizeCounts({
    epic: payload?.epic,
    xbox: payload?.xbox,
    nitro: payload?.nitro,
    nitroYear: payload?.nitroYear,
    crunchy: payload?.crunchy,
  });
  card.counts = normalizeCounts({});
  device.pendingUsed = calculatePendingUsed(device);

  return writeState(state);
}

async function updateCardNotes(deviceId, cardId, notes) {
  const state = await loadState();
  const device = findDevice(state, deviceId);
  if (!device) {
    throw new Error("device-not-found");
  }

  const card = findCard(device, cardId);
  if (!card) {
    throw new Error("card-not-found");
  }

  card.notes = String(notes || "").trim();
  return writeState(state);
}

async function toggleCardRejected(deviceId, cardId) {
  const state = await loadState();
  const device = findDevice(state, deviceId);
  if (!device) {
    throw new Error("device-not-found");
  }

  const card = findCard(device, cardId);
  if (!card) {
    throw new Error("card-not-found");
  }

  if (card.rejectedAt) {
    card.rejectedAt = "";
    if (!isCardCooldownActive(card)) {
      card.cooldownUntil = "";
    }
  } else {
    card.rejectedAt = nowIso();
    card.cooldownUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    card.counts.epic = 0;
    card.baseCounts.epic = 0;
  }

  device.pendingUsed = calculatePendingUsed(device);
  return writeState(state);
}

async function toggleCardCooldown(deviceId, cardId) {
  const state = await loadState();
  const device = findDevice(state, deviceId);
  if (!device) {
    throw new Error("device-not-found");
  }

  const card = findCard(device, cardId);
  if (!card) {
    throw new Error("card-not-found");
  }

  if (isCardCooldownActive(card)) {
    card.cooldownUntil = "";
    card.rejectedAt = "";
  } else {
    card.cooldownUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  }

  return writeState(state);
}

async function replaceCard(deviceId, cardId, payload) {
  const state = await loadState();
  const device = findDevice(state, deviceId);
  if (!device) {
    throw new Error("device-not-found");
  }

  const card = findCard(device, cardId);
  if (!card) {
    throw new Error("card-not-found");
  }

  const nextNumber = String(payload?.number || "").trim();
  if (!nextNumber || nextNumber.replace(/\D/g, "").length < 8) {
    throw new Error("invalid-card-number");
  }

  card.archived = true;
  card.resetAt = String(payload?.createdAt || todayIso()).trim() || todayIso();

  const replacementCard = {
    id: createId("card"),
    order: card.order,
    orderLabel: card.orderLabel || `Tarjeta ${card.order}`,
    number: nextNumber,
    createdAt: String(payload?.createdAt || todayIso()).trim() || todayIso(),
    expiry: String(payload?.expiry || "").trim(),
    cvv: String(payload?.cvv || "").trim(),
    archived: false,
    resetAt: "",
    counts: createEmptyCounts(),
    baseCounts: createEmptyCounts(),
    cooldownUntil: "",
    rejectedAt: "",
    notes: "",
  };

  device.cards.push(replacementCard);
  device.activeCardOrder = replacementCard.order;
  device.pendingUsed = calculatePendingUsed(device);

  return writeState(state);
}

async function updateProductCount(deviceId, cardId, productKey, delta) {
  const state = await loadState();
  const device = findDevice(state, deviceId);
  if (!device) {
    throw new Error("device-not-found");
  }

  const card = findCard(device, cardId);
  if (!card) {
    throw new Error("card-not-found");
  }

  const rule = PRODUCT_RULES.find((entry) => entry.key === productKey);
  if (!rule) {
    throw new Error("product-not-found");
  }

  if (productKey === "epic" && isCardCooldownActive(card)) {
    throw new Error("epic-cooldown-active");
  }

  const currentPending = Math.max(0, Number(card.counts?.[productKey] || 0));
  const currentBase = Math.max(0, Number(card.baseCounts?.[productKey] || 0));
  let nextPending = currentPending;
  let nextBase = currentBase;

  if (delta > 0) {
    nextPending += delta;
  } else if (currentPending > 0) {
    nextPending = Math.max(0, currentPending + delta);
  } else if (currentBase > 0) {
    nextBase = Math.max(0, currentBase + delta);
  }

  const nextDisplayed = Math.max(0, nextBase + nextPending);
  if (delta > 0 && rule.maxCount && nextDisplayed > rule.maxCount) {
    throw new Error(productKey === "epic" ? "epic-max-reached" : "product-max-reached");
  }

  card.counts[productKey] = nextPending;
  card.baseCounts[productKey] = nextBase;
  device.pendingUsed = calculatePendingUsed(device);

  return writeState(state);
}

async function updateSpeech(groupKey, payload) {
  const state = await loadState();
  const nextKey = String(groupKey || "").trim();
  if (!nextKey) {
    throw new Error("speech-key-required");
  }

  state.speeches = state.speeches && typeof state.speeches === "object" ? state.speeches : {};
  const current = state.speeches[nextKey] && typeof state.speeches[nextKey] === "object"
    ? state.speeches[nextKey]
    : { primary: "", secondary: "" };

  state.speeches[nextKey] = {
    primary: typeof payload?.primary === "string" ? payload.primary : String(current.primary || ""),
    secondary: typeof payload?.secondary === "string" ? payload.secondary : String(current.secondary || ""),
  };

  return writeState(state);
}

module.exports = {
  DEVICE_BALANCE_CAP,
  PRODUCT_RULES,
  loadState,
  applyRecharge,
  addPendingUsed,
  deductPendingUsed,
  revertLastCustomAmount,
  updateCard,
  updateCardNotes,
  toggleCardRejected,
  toggleCardCooldown,
  replaceCard,
  updateProductCount,
  updateSpeech,
};
