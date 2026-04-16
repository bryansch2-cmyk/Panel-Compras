const themeToggle = document.querySelector("#themeToggle");
const connectionBadge = document.querySelector("#connectionBadge");
const reloadButton = document.querySelector("#reloadButton");
const tabControl = document.querySelector("#tabControl");
const tabSpeeches = document.querySelector("#tabSpeeches");
const noticeStrip = document.querySelector("#noticeStrip");
const deviceList = document.querySelector("#deviceList");
const detailView = document.querySelector("#detailView");
const modalRoot = document.querySelector("#modalRoot");
const loadingOverlay = document.querySelector("#loadingOverlay");
const loadingStatus = document.querySelector("#loadingStatus");

const PRODUCT_ORDER = ["epic", "xbox", "nitro", "nitroYear", "crunchy"];
const ACCOUNT_SLOT_COUNT = 20;
const NOTICE_MESSAGES = [
  {
    type: "recommendation",
    label: "Recomendacion",
    icon: "!",
    text: "Verifica saldo disponible antes de vincular una tarjeta.",
  },
  {
    type: "recommendation",
    label: "Recomendacion",
    icon: "!",
    text: "Revisa saldo y limite antes de recargar un dispositivo.",
  },
  {
    type: "warning",
    label: "Advertencia",
    icon: "▲",
    text: "Resta el saldo usado antes de cambiar dispositivo y cerrar turno.",
  },
  {
    type: "warning",
    label: "Advertencia",
    icon: "▲",
    text: "Controla tarjetas con saldo bajo, rechazos repetidos o listas para reemplazo.",
  },
  {
    type: "warning",
    label: "Advertencia",
    icon: "▲",
    text: "Deja una nota si una tarjeta queda vinculada a una cuenta.",
  },
];
const SHARED_PASSWORDS = [
  "kiddarkness20111303",
  "lokyclow2104",
  "franki20111303",
];
const SENSITIVE_PIN_KEY = "panel-compras-web-sensitive-pin";
const SENSITIVE_UNLOCK_MS = 30_000;
const THEME_KEY = "panel-compras-web-theme";
const DEVICE_PROFILES = {
  "IPHONE 12 PRO FREDDY - HADI": {
    ownerName: "GAZAL GUNDUZ",
    accountNumber: "2391442833",
    phone: "5340572401",
    iban: "TR910021300000390061400000",
  },
  "SAMSUNG FREDDY - HADI": {
    ownerName: "ERDOGAN YAMAN",
    accountNumber: "2458863437",
    phone: "5058301006",
    iban: "TR910021300000390061400000",
  },
  "SAMSUNG FREDDY - HADI ISLAND": {
    ownerName: "GAZAL DEMIRCAN",
    accountNumber: "2431424336",
    phone: "5076955213",
    iban: "TR910021300000390061400000",
  },
  "XIAOMI DIEGO - HADI": {
    ownerName: "GAZAK ADAK",
    accountNumber: "2431419636",
    phone: "5078530011",
    iban: "TR910021300000390061400000",
  },
  "XIAOMI DIEGO - HADI ISLAND": {
    ownerName: "GAZAL BOZTAY",
    accountNumber: "2431483839",
    phone: "5014806689",
    iban: "TR910021300000390061400000",
  },
  "XIAOMI PAPA - HADI": {
    ownerName: "GAZAL SAV",
    accountNumber: "2431488936",
    phone: "5072866093",
    iban: "TR910021300000390061400000",
  },
  "XIAOMI PAPA - HADI ISLAND": {
    ownerName: "GAZAL SATIN",
    accountNumber: "2436099630",
    phone: "5015633268",
    iban: "TR910021300000390061400000",
  },
  "HUAWEI - HADI": {
    ownerName: "GAZAL POLAT",
    accountNumber: "2427643231",
    phone: "5513698456",
    iban: "TR910021300000390061400000",
  },
  "HUAWEI - HADI ISLAND": {
    ownerName: "GAZAL ALTU",
    accountNumber: "2436050837",
    phone: "5051132582",
    iban: "TR910021300000390061400000",
  },
  "XIAOMI MAMA - HADI": {
    ownerName: "ERDOGAN CELEBI",
    accountNumber: "2442279231",
    phone: "5520822754",
    iban: "TR910021300000390061400000",
  },
  "XIAOMI MAMA - HADI ISLAND": {
    ownerName: "ERDOGAN DAMLA",
    accountNumber: "2442287333",
    phone: "5513633945",
    iban: "TR910021300000390061400000",
  },
  "HONOR MAMA - HADI": {
    ownerName: "ERDOGAN YASAR",
    accountNumber: "2458740531",
    phone: "5057151003",
    iban: "TR910021300000390061400000",
  },
  "HONOR MAMA - HADI ISLAND": {
    ownerName: "ERDOGAN BILICI",
    accountNumber: "2458762538",
    phone: "5055421007",
    iban: "TR910021300000390061400000",
  },
  "IPHONE 12 PRO BRYAN": {
    ownerName: "GAZAL GUL",
    accountNumber: "2405386030",
    phone: "5015885285",
    iban: "TR910021300000390061400000",
  },
};

const moneyFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("es-PE", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-PE", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const state = {
  data: null,
  constants: {
    deviceBalanceCap: 2750,
    productRules: [],
  },
  selectedTab: "control",
  selectedDeviceId: "",
  sensitiveUnlockedUntilByDevice: {},
  flippedCardByDevice: {},
  modal: null,
  requestPending: false,
  initialLoadComplete: false,
};

let unlockExpiryTimer = null;
let cooldownTimer = null;
let countdownSyncPending = false;

function formatMoney(value) {
  return moneyFormatter.format(Number(value || 0));
}

function parseDateValue(value) {
  if (!value) {
    return null;
  }

  const raw = String(value).trim();
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0);
  }

  const slashMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0);
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function formatDate(value) {
  if (!value) {
    return "--";
  }

  const date = parseDateValue(value);
  if (!date) {
    return String(value);
  }

  return dateFormatter.format(date);
}

function formatDateTime(value) {
  if (!value) {
    return "--";
  }

  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw) || /^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    return formatDate(raw);
  }

  const date = parseDateValue(raw);
  if (!date) {
    return String(value);
  }

  return dateTimeFormatter.format(date);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function copyText(value) {
  const text = String(value ?? "").trim();
  if (!text) {
    return false;
  }

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.warn("Clipboard API unavailable, using fallback.", error);
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, text.length);

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch (error) {
    console.warn("Clipboard fallback failed.", error);
  }

  textarea.remove();
  return copied;
}

function getStoredTheme() {
  return localStorage.getItem(THEME_KEY) || "dark";
}

function applyTheme(theme) {
  const nextTheme = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = nextTheme;
  themeToggle.textContent = nextTheme === "light" ? "Tema oscuro" : "Tema claro";
}

function renderNoticeStrip() {
  if (!noticeStrip) {
    return;
  }

  const items = NOTICE_MESSAGES
    .map((entry) => ({
      type: String(entry?.type || "").trim(),
      label: String(entry?.label || "").trim(),
      icon: String(entry?.icon || "").trim(),
      text: String(entry?.text || "").trim(),
    }))
    .filter((entry) => entry.label && entry.text);

  if (!items.length) {
    noticeStrip.innerHTML = "";
    return;
  }

  const chips = items.map((entry) => `
    <span class="notice-pill notice-pill-${escapeHtml(entry.type || "default")}">
      <span class="notice-pill-badge">
        <span class="notice-pill-icon" aria-hidden="true">${escapeHtml(entry.icon || "!")}</span>
        <span class="notice-pill-label">${escapeHtml(entry.label)}</span>
      </span>
      <span class="notice-pill-text">${escapeHtml(entry.text)}</span>
    </span>
  `).join("");

  noticeStrip.innerHTML = `
    <div class="notice-strip-shell">
      <div class="notice-track">
        ${chips}
        ${chips}
      </div>
    </div>
  `;
}

function setLoadingOverlay(visible, message = "") {
  if (!loadingOverlay) {
    return;
  }

  if (loadingStatus && message) {
    loadingStatus.textContent = message;
  }

  loadingOverlay.classList.toggle("is-visible", visible);
  loadingOverlay.setAttribute("aria-hidden", visible ? "false" : "true");
  document.body.classList.toggle("is-loading", visible);
}

function initTheme() {
  applyTheme(getStoredTheme());
}

function toggleTheme() {
  const nextTheme = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  localStorage.setItem(THEME_KEY, nextTheme);
  applyTheme(nextTheme);
}

function maskCardNumber(number) {
  const digits = String(number || "").replace(/\D/g, "");
  if (!digits) {
    return "**** **** **** ****";
  }

  return `**** **** **** ${digits.slice(-4)}`;
}

function last4(number) {
  const digits = String(number || "").replace(/\D/g, "");
  return digits ? digits.slice(-4) : "----";
}

function getStoredSensitivePin() {
  return localStorage.getItem(SENSITIVE_PIN_KEY) || "";
}

function saveSensitivePin(pin) {
  localStorage.setItem(SENSITIVE_PIN_KEY, pin);
}

function isSensitiveUnlocked(deviceId) {
  return Number(state.sensitiveUnlockedUntilByDevice[deviceId] || 0) > Date.now();
}

function scheduleUnlockExpiryCheck() {
  if (unlockExpiryTimer) {
    clearTimeout(unlockExpiryTimer);
    unlockExpiryTimer = null;
  }

  const nextUnlock = Object.entries(state.sensitiveUnlockedUntilByDevice)
    .map(([deviceId, until]) => [deviceId, Number(until || 0)])
    .filter(([, until]) => until > Date.now())
    .sort((left, right) => left[1] - right[1])[0];

  if (!nextUnlock) {
    return;
  }

  unlockExpiryTimer = setTimeout(() => {
    const now = Date.now();
    let changed = false;

    Object.keys(state.sensitiveUnlockedUntilByDevice).forEach((deviceId) => {
      if (Number(state.sensitiveUnlockedUntilByDevice[deviceId] || 0) <= now) {
        delete state.sensitiveUnlockedUntilByDevice[deviceId];
        changed = true;
      }
    });

    scheduleUnlockExpiryCheck();
    if (changed && state.selectedTab === "control") {
      render();
    }
  }, Math.max(0, nextUnlock[1] - Date.now()) + 40);
}

function unlockSensitive(deviceId) {
  state.sensitiveUnlockedUntilByDevice[deviceId] = Date.now() + SENSITIVE_UNLOCK_MS;
  closeModal();
  scheduleUnlockExpiryCheck();
  render();
}

function getDevices() {
  return Array.isArray(state.data?.devices) ? state.data.devices : [];
}

function getSelectedDevice() {
  const devices = getDevices();
  if (!devices.length) {
    return null;
  }

  if (!state.selectedDeviceId) {
    return devices[0];
  }

  return devices.find((device) => device.id === state.selectedDeviceId) || devices[0];
}

function getVisibleCards(device) {
  return Array.isArray(device?.cards)
    ? device.cards
        .filter((card) => !card.archived)
        .sort((left, right) => {
          if (left.order !== right.order) {
            return left.order - right.order;
          }
          return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
        })
    : [];
}

function getAllCards(device) {
  return Array.isArray(device?.cards) ? device.cards : [];
}

function getActiveCard(device) {
  const cards = getVisibleCards(device);
  const activeOrder = Number(device?.activeCardOrder || 1);
  return cards.find((card) => Number(card.order) === activeOrder) || cards[0] || null;
}

function getCycleCards(device) {
  const cards = getVisibleCards(device);
  const activeCard = getActiveCard(device);
  if (!activeCard) {
    return cards;
  }

  return [activeCard, ...cards.filter((card) => card.id !== activeCard.id)];
}

function isCooldownActive(card) {
  return Boolean(card?.cooldownUntil) && new Date(card.cooldownUntil).getTime() > Date.now();
}

function isRejectedHoldActive(card) {
  return Boolean(card?.rejectedCooldownUntil) && new Date(card.rejectedCooldownUntil).getTime() > Date.now();
}

function getCountdownTimestamp(value) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getPrimaryCooldownUntil(card) {
  const candidates = [card?.cooldownUntil, card?.rejectedCooldownUntil]
    .map((value) => getCountdownTimestamp(value))
    .filter((value) => value > Date.now());

  if (!candidates.length) {
    return 0;
  }

  return Math.max(...candidates);
}

function formatCooldownCountdown(untilValue) {
  const until = Number(untilValue || 0);
  if (!until || until <= Date.now()) {
    return "";
  }

  const totalSeconds = Math.max(0, Math.ceil((until - Date.now()) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getCooldownLabel(card) {
  return formatCooldownCountdown(getPrimaryCooldownUntil(card));
}

function getProductRule(productKey) {
  return (state.constants.productRules || []).find((rule) => rule.key === productKey);
}

function getCardDisplayedCount(card, productKey) {
  return getCardConfirmedCount(card, productKey) + getCardPendingCount(card, productKey);
}

function getCardConfirmedCount(card, productKey) {
  return Number(card?.baseCounts?.[productKey] || 0);
}

function getCardPendingCount(card, productKey) {
  return Number(card?.counts?.[productKey] || 0);
}

function getCardConfirmedPurchaseCount(card) {
  return PRODUCT_ORDER.reduce((total, productKey) => {
    return total + Number(card?.baseCounts?.[productKey] || 0);
  }, 0);
}

function formatConfirmedPurchaseLabel(count) {
  const safeCount = Math.max(0, Number(count || 0));
  return `${safeCount} compra${safeCount === 1 ? "" : "s"} confirmada${safeCount === 1 ? "" : "s"}`;
}

function setBusy(nextValue) {
  state.requestPending = nextValue;
  document.body.classList.toggle("is-busy", nextValue);
}

async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "request-failed");
  }

  return payload;
}

function applyLoadedState(payload) {
  state.data = {
    meta: payload.meta || {},
    devices: payload.devices || [],
    speeches: payload.speeches || {},
  };
  state.constants = payload.constants || state.constants;
  const selected = getSelectedDevice();
  state.selectedDeviceId = selected?.id || "";
}

async function loadState() {
  const isInitialLoad = !state.initialLoadComplete;
  try {
    if (isInitialLoad) {
      setLoadingOverlay(true, "Conectando con el backend y preparando el panel.");
    }
    connectionBadge.textContent = "Conectando...";
    const payload = await apiFetch("/api/state");
    applyLoadedState(payload);
    connectionBadge.textContent = "Backend activo";
    state.initialLoadComplete = true;
    render();
    if (isInitialLoad) {
      window.setTimeout(() => {
        setLoadingOverlay(false);
      }, 280);
    }
  } catch (error) {
    connectionBadge.textContent = "Error de carga";
    detailView.innerHTML = `<div class="empty">No se pudo cargar el panel. ${escapeHtml(error.message)}</div>`;
    setLoadingOverlay(false, "No se pudo cargar el panel.");
  }
}

async function sendMutation(url, payload) {
  try {
    setBusy(true);
    const nextState = await apiFetch(url, {
      method: "POST",
      body: JSON.stringify(payload || {}),
    });
    applyLoadedState(nextState);
    render();
  } catch (error) {
    window.alert(getErrorMessage(error.message));
  } finally {
    setBusy(false);
  }
}

function getErrorMessage(code) {
  const messages = {
    "device-not-found": "No se encontro el dispositivo.",
    "card-not-found": "No se encontro la tarjeta.",
    "invalid-amount": "Ingresa un monto valido.",
    "nothing-to-deduct": "No hay saldo usado para descontar.",
    "insufficient-funds": "No hay saldo suficiente para descontar.",
    "invalid-card-number": "Ingresa un numero de tarjeta valido.",
    "speech-key-required": "Selecciona un speech valido.",
    "product-not-found": "No se encontro el producto.",
    "epic-cooldown-active": "Epic esta bloqueado mientras la tarjeta esta en 24h.",
    "epic-rejection-hold": "Epic esta bloqueado por una tarjeta rechazada en observacion 24h.",
    "epic-max-reached": "Epic ya llego al maximo permitido.",
    "product-max-reached": "Ese producto ya llego a su limite.",
    "invalid-pin": "El PIN debe tener 6 digitos.",
    "wrong-pin": "El PIN no coincide.",
  };

  return messages[code] || "No se pudo completar la accion.";
}

function openModal(config) {
  state.modal = config;
  renderModal();
}

function closeModal() {
  state.modal = null;
  renderModal();
}

function openHistoryModal(deviceId, historyType) {
  openModal({
    type: "history",
    deviceId,
    historyType,
  });
}

function openPinModal(deviceId) {
  const storedPin = getStoredSensitivePin();
  openModal({
    type: "pin",
    deviceId,
    needsCreate: !storedPin,
    error: "",
  });
}

function openEditCardModal(deviceId, card) {
  openModal({
    type: "edit-card",
    deviceId,
    cardId: card.id,
    title: "Editar tarjeta activa",
    submitLabel: "Guardar cambios",
    values: {
      number: String(card.number || ""),
      expiry: String(card.expiry || ""),
      cvv: String(card.cvv || ""),
      createdAt: String(card.createdAt || ""),
      epic: String(getCardPendingCount(card, "epic")),
      xbox: String(getCardPendingCount(card, "xbox")),
      nitro: String(getCardPendingCount(card, "nitro")),
      nitroYear: String(getCardPendingCount(card, "nitroYear")),
      crunchy: String(getCardPendingCount(card, "crunchy")),
    },
    accumulated: {
      epic: String(getCardConfirmedCount(card, "epic")),
      xbox: String(getCardConfirmedCount(card, "xbox")),
      nitro: String(getCardConfirmedCount(card, "nitro")),
      nitroYear: String(getCardConfirmedCount(card, "nitroYear")),
      crunchy: String(getCardConfirmedCount(card, "crunchy")),
    },
    error: "",
  });
}

function openReplaceCardModal(deviceId, card) {
  openModal({
    type: "replace-card",
    deviceId,
    cardId: card.id,
    title: "Reemplazar tarjeta activa",
    submitLabel: "Crear reemplazo",
    values: {
      number: "",
      expiry: String(card.expiry || ""),
      cvv: "",
      createdAt: new Date().toISOString().slice(0, 10),
    },
    error: "",
  });
}

function openNotesModal(deviceId, card) {
  openModal({
    type: "notes",
    deviceId,
    cardId: card.id,
    title: "Notas de la tarjeta",
    submitLabel: "Guardar notas",
    values: {
      notes: String(card.notes || ""),
    },
    error: "",
  });
}

function openDeviceFinancialsModal(device) {
  openModal({
    type: "device-financials",
    deviceId: device.id,
    title: "Ajustar progreso del dispositivo",
    submitLabel: "Guardar progreso",
    values: {
      availableBalance: String(Number(device.availableBalance || 0)),
      balanceLimitCurrent: String(Number(device.balanceLimitCurrent || 0)),
      lastRechargeAmount: String(Number(device.lastRechargeAmount || 0)),
      lastRechargeAt: String(device.lastRechargeAt || ""),
    },
    error: "",
  });
}

function openRechargeModal(device) {
  openModal({
    type: "recharge",
    deviceId: device.id,
    title: "Registrar recarga",
    submitLabel: "Agregar recarga",
    values: {
      amount: "",
    },
    previewBalance: device.availableBalance,
    error: "",
  });
}

function getHistoryEntries(device, historyType) {
  if (!device) {
    return [];
  }

  if (historyType === "recharges") {
    return Array.isArray(device.rechargeHistory) ? device.rechargeHistory : [];
  }

  if (historyType === "purchases") {
    return Array.isArray(device.purchaseHistory) ? device.purchaseHistory : [];
  }

  if (historyType === "replacements") {
    const replacementHistory = Array.isArray(device.replacementHistory) ? device.replacementHistory : [];
    if (replacementHistory.length) {
      return replacementHistory.map((entry) => ({
        id: entry.id,
        at: entry.at,
        productName: `${entry.fromLabel || `Tarjeta ${entry.fromOrder || "-"}`} -> ${entry.toLabel || `Tarjeta ${entry.toOrder || "-"}`}`,
        note: `Terminada en ${entry.fromLast4 || "----"} reemplazada por ${entry.toLast4 || "----"}`,
      }));
    }

    return getAllCards(device)
      .filter((card) => card.resetAt)
      .map((card) => ({
        id: card.id,
        at: card.resetAt,
        productName: card.orderLabel,
        note: `Nueva tarjeta terminada en ${last4(card.number)}`,
      }));
  }

  return [];
}

function renderProfileItem({ icon, label, value, wide = false, bank = false }) {
  const classes = ["device-profile-item"];
  if (wide) {
    classes.push("device-profile-wide");
  }
  if (bank) {
    classes.push("device-profile-bank");
  }

  return `
    <div class="${classes.join(" ")}">
      <span class="device-profile-label"><i aria-hidden="true">${icon}</i><em>${escapeHtml(label)}</em></span>
      <strong class="device-profile-value">${escapeHtml(value)}</strong>
    </div>
  `;
}

function renderDeviceList() {
  const devices = getDevices();
  if (!devices.length) {
    deviceList.innerHTML = `<div class="empty">No hay dispositivos disponibles.</div>`;
    return;
  }

  deviceList.innerHTML = devices.map((device) => {
    const isActive = device.id === state.selectedDeviceId;
    const activeCard = getActiveCard(device);
    const hasNotes = hasMeaningfulNotes(activeCard?.notes);
    const lowBalance = isLowBalance(device.availableBalance);
    const profile = getDeviceProfile(device);
    return `
      <article class="device-item ${isActive ? "active" : ""}">
        <div
          class="device-item-select"
          role="button"
          tabindex="0"
          aria-pressed="${isActive ? "true" : "false"}"
          data-action="select-device"
          data-device-id="${escapeHtml(device.id)}"
        >
        <div class="device-item-top">
          <strong>${escapeHtml(device.title)}</strong>
          ${isActive ? '<span class="device-item-badge">Lista</span>' : ""}
        </div>
          <div class="device-item-stats">
            <span><b>Saldo</b> ${escapeHtml(formatMoney(device.availableBalance))}</span>
            <span><b>Usado</b> ${escapeHtml(formatMoney(device.pendingUsed))}</span>
            <span><b>Limite</b> ${escapeHtml(formatMoney(device.balanceLimitCurrent))}</span>
          </div>
          ${lowBalance ? `<div class="device-low-flag"><span class="device-low-dot"></span><span>Saldo bajo</span></div>` : ""}
          ${hasNotes ? `<div class="device-note-flag"><span class="device-note-dot"></span><span>Nota guardada</span></div>` : ""}
        </div>
        ${isActive && profile ? `
          <div class="device-expanded">
            <div class="device-profile-grid">
              ${renderProfileItem({
                icon: "&#128100;",
                label: "Nombre",
                value: profile.ownerName,
              })}
              ${renderProfileItem({
                icon: "&#128179;",
                label: "Cuenta",
                value: profile.accountNumber,
              })}
              ${renderProfileItem({
                icon: "&#128222;",
                label: "Celular",
                value: profile.phone,
              })}
              ${renderProfileItem({
                icon: "&#127974;",
                label: "Ziraat Bank",
                value: profile.iban,
                wide: true,
                bank: true,
              })}
            </div>
          </div>
        ` : ""}
      </article>
    `;
  }).join("");
}

function renderHistoryLaunchers(device) {
  return `
    <section class="history-launcher">
      <div class="section-row">
        <div>
          <h3>Historiales</h3>
        </div>
        <div class="history-icon-row">
          <button class="history-icon-button" type="button" data-action="open-history" data-device-id="${escapeHtml(device.id)}" data-history-type="recharges" title="Recargas" aria-label="Abrir historial de recargas">&#8635;</button>
          <button class="history-icon-button" type="button" data-action="open-history" data-device-id="${escapeHtml(device.id)}" data-history-type="purchases" title="Compras" aria-label="Abrir historial de compras">&#128722;</button>
          <button class="history-icon-button" type="button" data-action="open-history" data-device-id="${escapeHtml(device.id)}" data-history-type="replacements" title="Reemplazos" aria-label="Abrir historial de reemplazos">&#8646;</button>
        </div>
      </div>
    </section>
  `;
}

function hasMeaningfulNotes(value) {
  return String(value || "").trim().length > 0;
}

function isLowBalance(value) {
  return Number(value || 0) > 0 && Number(value || 0) <= 150;
}

function getDeviceProfile(device) {
  if (!device?.title) {
    return null;
  }

  return DEVICE_PROFILES[String(device.title).trim()] || null;
}

function getCardNetwork(number) {
  const digits = String(number || "").replace(/\D/g, "");
  if (!digits) {
    return "";
  }

  if (digits.startsWith("4")) {
    return "visa";
  }

  const firstTwo = Number(digits.slice(0, 2));
  const firstFour = Number(digits.slice(0, 4));
  if ((firstTwo >= 51 && firstTwo <= 55) || (firstFour >= 2221 && firstFour <= 2720)) {
    return "mastercard";
  }

  return "";
}

function renderCardNetworkMark(network) {
  if (network === "visa") {
    return `<span class="card-network-mark card-network-visa" aria-label="Visa">VISA</span>`;
  }

  if (network === "mastercard") {
    return `
      <span class="card-network-mark card-network-mastercard" aria-label="Mastercard">
        <span class="card-network-mastercard-circles" aria-hidden="true">
          <span></span><span class="card-network-mastercard-overlap"></span><span></span>
        </span>
      </span>
    `;
  }

  return `<span class="card-network-mark card-network-generic" aria-label="Tarjeta">CARD</span>`;
}

function formatProductTryLabel(amount) {
  const numeric = Number(amount || 0);
  const hasDecimals = Math.abs(numeric - Math.trunc(numeric)) > 0.001;
  const formatted = numeric.toLocaleString("en-US", {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `${formatted} TRY`;
}

function getProductDisplayMeta(productKey, rule) {
  const labels = {
    epic: { label: "Epic Games", badge: "EG" },
    xbox: { label: "Xbox", badge: "XB" },
    nitro: { label: "Nitro Boost", badge: "NB" },
    nitroYear: { label: "Nitro Boost 1Y", badge: "1Y" },
    crunchy: { label: "Crunchyroll", badge: "CR" },
  };

  return labels[productKey] || { label: rule?.label || productKey, badge: "PG" };
}

function isCardFlipped(deviceId, cardId) {
  return Boolean(deviceId && cardId && state.flippedCardByDevice[deviceId] === cardId);
}

function renderCardActivityBack(activeCard, confirmedPurchaseLabel) {
  const activityItems = PRODUCT_ORDER.map((productKey) => {
    const rule = getProductRule(productKey);
    const displayMeta = getProductDisplayMeta(productKey, rule);
    const count = getCardConfirmedCount(activeCard, productKey);
    return `
      <div class="card-activity-item">
        <span>${escapeHtml(displayMeta.label)}</span>
        <strong>${escapeHtml(count)}</strong>
      </div>
    `;
  }).join("");

  return `
    <div class="card-face card-face-back">
      <div class="card-face-back-head">
        <span class="summary-kicker">Actividad acumulada</span>
        <strong class="card-activity-total">${escapeHtml(confirmedPurchaseLabel)}</strong>
      </div>
      <div class="card-activity-grid">
        ${activityItems}
      </div>
    </div>
  `;
}

function renderActiveProductStats(device, activeCard, isManualCooldown, isRejectedHold, rejectedUntil, manualCooldownUntil) {
  if (!activeCard) {
    return "";
  }

  const productCards = PRODUCT_ORDER.map((productKey) => {
    const rule = getProductRule(productKey);
    if (!rule) {
      return "";
    }

    const count = getCardDisplayedCount(activeCard, productKey);
    const isEpicBlocked = productKey === "epic" && (isManualCooldown || isRejectedHold);
    const productLockLabel = isRejectedHold ? "Bloqueado por rechazo" : "Bloqueado por 24h";
    const productLockUntil = isRejectedHold ? rejectedUntil : manualCooldownUntil;
    const displayMeta = getProductDisplayMeta(productKey, rule);

    return `
      <div class="product-stat product-stat-${escapeHtml(productKey)} ${isEpicBlocked ? "is-disabled" : ""}">
        <div class="product-stat-body">
          <span class="product-badge" aria-hidden="true">${escapeHtml(displayMeta.badge)}</span>
          <div class="product-copy">
            <div class="product-stat-headline">
              <strong>${escapeHtml(displayMeta.label)}</strong>
              <span class="product-price">${escapeHtml(formatProductTryLabel(rule.amount))}</span>
            </div>
            <span class="product-cap">${rule.maxCount ? `Max ${escapeHtml(rule.maxCount)}` : "Sin tope"}</span>
            ${isEpicBlocked ? `<span class="product-lock" data-countdown-label="${escapeHtml(productLockLabel)}" data-countdown-until="${escapeHtml(productLockUntil)}">${escapeHtml(`${productLockLabel} ${formatCooldownCountdown(productLockUntil)}`.trim())}</span>` : ""}
          </div>
        </div>
        <div class="product-counter">
          <button type="button" data-action="update-product" data-device-id="${escapeHtml(device.id)}" data-card-id="${escapeHtml(activeCard.id)}" data-product-key="${escapeHtml(productKey)}" data-delta="-1">-</button>
          <div class="product-stat-count">${escapeHtml(count)}</div>
          <button type="button" data-action="update-product" data-device-id="${escapeHtml(device.id)}" data-card-id="${escapeHtml(activeCard.id)}" data-product-key="${escapeHtml(productKey)}" data-delta="1" ${isEpicBlocked ? "disabled" : ""}>+</button>
        </div>
      </div>
    `;
  }).join("");

  return `
    <section class="cards-section cards-section-products">
      <div class="product-stats-grid">
        ${productCards}
        <form class="product-stat custom-amount-form product-stat-custom" data-action="custom-amount" data-device-id="${escapeHtml(device.id)}">
          <button class="visually-hidden-submit" type="submit" tabindex="-1" aria-hidden="true">Agregar monto</button>
          <div class="product-stat-body">
            <span class="product-badge" aria-hidden="true">OT</span>
            <div class="product-copy">
              <div class="product-stat-headline">
                <strong>Otro monto</strong>
                <span class="product-price">Libre</span>
              </div>
              <span class="product-cap">Compra libre</span>
            </div>
          </div>
          <div class="compact-action-row product-custom-row">
            <input class="custom-amount-input" name="amount" type="text" inputmode="decimal" placeholder="0.00" required>
            <button class="compact-icon-button" type="button" data-action="revert-custom" data-device-id="${escapeHtml(device.id)}" title="Revertir ultimo monto" aria-label="Revertir ultimo monto">&#8630;</button>
          </div>
        </form>
      </div>
    </section>
  `;
}

function renderActiveCardDetail(device) {
  const activeCard = getActiveCard(device);
  if (!activeCard) {
    return `<div class="empty">Este dispositivo no tiene tarjetas activas.</div>`;
  }

  const sensitiveVisible = isSensitiveUnlocked(device.id);
  const numberText = sensitiveVisible ? String(activeCard.number || "") : maskCardNumber(activeCard.number);
  const cvvText = sensitiveVisible ? String(activeCard.cvv || "--") : "***";
  const unlockLabel = sensitiveVisible ? "Ocultar datos" : "Desbloquear";
  const cooldownLabel = getCooldownLabel(activeCard);
  const confirmedPurchaseCount = getCardConfirmedPurchaseCount(activeCard);
  const confirmedPurchaseLabel = formatConfirmedPurchaseLabel(confirmedPurchaseCount);
  const isManualCooldown = isCooldownActive(activeCard);
  const isRejectedHold = isRejectedHoldActive(activeCard);
  const rejectedUntil = getCountdownTimestamp(activeCard.rejectedCooldownUntil);
  const manualCooldownUntil = getCountdownTimestamp(activeCard.cooldownUntil);
  const stateLabel = isRejectedHold ? "Rechazada" : "Sin estado";
  const hasNotes = hasMeaningfulNotes(activeCard.notes);
  const lowBalance = isLowBalance(device.availableBalance);
  const cardNetwork = getCardNetwork(activeCard.number);
  const cardFlipped = isCardFlipped(device.id, activeCard.id);
  const flipLabel = cardFlipped ? "Mostrar frente de la tarjeta" : "Mostrar actividad acumulada";
  const sensitiveAction = sensitiveVisible ? "lock-sensitive" : "unlock-sensitive";

  return `
    <section class="cards-section cards-section-active">
      <h3>Tarjeta activa</h3>
      <article class="selected-card">
        <div class="selected-card-status">
          <div class="status-row">
            <span class="card-label">${escapeHtml(activeCard.orderLabel || "Tarjeta activa")}</span>
            <span class="status-pill active">Activa</span>
            <span class="status-pill ${isRejectedHold ? "danger" : ""}">${escapeHtml(stateLabel)}</span>
            ${cooldownLabel ? `<span class="status-pill cooldown"><span class="cooldown-icon" aria-hidden="true">&#9201;</span><span data-countdown-label="Bloqueo" data-countdown-until="${escapeHtml(getPrimaryCooldownUntil(activeCard))}">${escapeHtml(`Bloqueo ${cooldownLabel}`)}</span></span>` : ""}
            ${lowBalance ? '<span class="status-pill low-balance">Saldo bajo</span>' : ""}
          </div>
        </div>

        <div class="selected-card-compact-layout">
          <div class="selected-card-primary">
            <div class="card-flip-stage">
              <div class="card-flip-frame">
                <div class="card-flip-shell ${cardFlipped ? "is-flipped" : ""}">
                  <div class="card-flip-inner">
                    <div class="card-flip-face card-flip-face-front">
                      <div class="card-face card-face-network-${escapeHtml(cardNetwork || "generic")}">
                        <div class="card-face-wave" aria-hidden="true"></div>
                        <div class="card-face-top">
                          <span class="card-face-brand">KIDSTORE SECURE</span>
                        </div>
                        <div class="card-network-slot">
                          ${renderCardNetworkMark(cardNetwork)}
                        </div>
                        <h3 class="card-number">${escapeHtml(numberText)}</h3>
                        <div class="card-face-detail-grid">
                          <div class="card-face-detail">
                            <span>MM/YY</span>
                            <strong>${escapeHtml(activeCard.expiry || "--")}</strong>
                          </div>
                          <div class="card-face-detail">
                            <span>CVV</span>
                            <strong>${escapeHtml(cvvText)}</strong>
                          </div>
                          <div class="card-face-detail">
                            <span>Creada</span>
                            <strong>${escapeHtml(formatDate(activeCard.createdAt))}</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="card-flip-face card-flip-face-back">
                      ${renderCardActivityBack(activeCard, confirmedPurchaseLabel)}
                    </div>
                  </div>
                </div>
                <button class="card-visibility-button card-visibility-floating ${sensitiveVisible ? "is-open" : ""}" type="button" data-action="${escapeHtml(sensitiveAction)}" data-device-id="${escapeHtml(device.id)}" title="${escapeHtml(unlockLabel)}" aria-label="${escapeHtml(unlockLabel)}">&#128065;</button>
              </div>

              <button class="card-flip-toggle ${cardFlipped ? "is-active-toggle" : ""}" type="button" data-action="toggle-card-flip" data-device-id="${escapeHtml(device.id)}" data-card-id="${escapeHtml(activeCard.id)}" title="${escapeHtml(flipLabel)}" aria-label="${escapeHtml(flipLabel)}">&#8646;</button>
            </div>

            <div class="card-actions-under">
              <button class="icon-action icon-only" type="button" data-action="edit-card" data-device-id="${escapeHtml(device.id)}" data-card-id="${escapeHtml(activeCard.id)}" title="Editar" aria-label="Editar tarjeta"><span class="icon-action-glyph" aria-hidden="true">&#9998;</span></button>
              <button class="icon-action icon-only ${hasNotes ? "has-note" : ""}" type="button" data-action="notes-card" data-device-id="${escapeHtml(device.id)}" data-card-id="${escapeHtml(activeCard.id)}" title="Notas" aria-label="Editar notas de la tarjeta"><span class="icon-action-glyph" aria-hidden="true">&#128221;</span></button>
              <button class="icon-action icon-only" type="button" data-action="replace-card" data-device-id="${escapeHtml(device.id)}" data-card-id="${escapeHtml(activeCard.id)}" title="Reemplazar" aria-label="Reemplazar tarjeta"><span class="icon-action-glyph" aria-hidden="true">&#8646;</span></button>
              <button type="button" class="card-action-toggle ${isRejectedHold ? "is-active-toggle" : ""}" data-action="toggle-rejected" data-device-id="${escapeHtml(device.id)}" data-card-id="${escapeHtml(activeCard.id)}" data-countdown-label="Rechazado" data-countdown-until="${escapeHtml(rejectedUntil)}">${escapeHtml(`Rechazado${isRejectedHold ? ` ${formatCooldownCountdown(rejectedUntil)}` : ""}`)}</button>
              <button type="button" class="card-action-toggle ${isManualCooldown ? "is-active-toggle" : ""}" data-action="toggle-cooldown" data-device-id="${escapeHtml(device.id)}" data-card-id="${escapeHtml(activeCard.id)}" data-countdown-label="24h" data-countdown-until="${escapeHtml(manualCooldownUntil)}">${escapeHtml(`24h${isManualCooldown ? ` ${formatCooldownCountdown(manualCooldownUntil)}` : ""}`)}</button>
            </div>
          </div>
        </div>
      </article>
    </section>
  `;
}

function renderCardCycle(device) {
  const cards = getCycleCards(device);
  const activeCard = getActiveCard(device);
  const hasNotes = hasMeaningfulNotes(activeCard?.notes);
  if (!cards.length) {
    return "";
  }

  return `
    <section class="cards-section cards-section-cycle">
      <div class="section-row">
        <h3>Ciclo de tarjetas</h3>
      </div>
      <div class="cards-mini-grid">
        ${cards.map((card, index) => {
          const isActive = activeCard && card.id === activeCard.id;
          const last4 = String(card.number || "").replace(/\D/g, "").slice(-4) || "----";
          return `
            <article class="card-mini ${isActive ? "active is-cycle-active" : "is-cycle-inactive"}" style="animation-delay:${index * 70}ms">
              <div class="card-mini-main">
                <div class="status-row">
                  <span class="card-label">${escapeHtml(card.orderLabel || "Tarjeta")}</span>
                  <span class="status-pill ${isActive ? "active" : ""}">${escapeHtml(isActive ? "Activa" : "Inactiva")}</span>
                </div>
                <strong class="card-mini-digits">${escapeHtml(last4)}</strong>
                <span class="card-mini-date">${isActive ? `Creada ${escapeHtml(formatDate(card.createdAt))}` : `${escapeHtml(formatDate(card.createdAt))} - Solo lectura`}</span>
              </div>
            </article>
          `;
        }).join("")}
      </div>
      <div class="cycle-notes-card info-tile ${hasNotes ? "note-highlight" : ""}">
        <span>Notas</span>
        <strong>${escapeHtml(activeCard?.notes || "Sin notas")}</strong>
      </div>
    </section>
  `;
}

function renderControlTab() {
  const device = getSelectedDevice();
  if (!device) {
    detailView.innerHTML = `<div class="empty">No hay dispositivos disponibles.</div>`;
    return;
  }

  const activeCard = getActiveCard(device);
  const isManualCooldown = isCooldownActive(activeCard);
  const isRejectedHold = isRejectedHoldActive(activeCard);
  const rejectedUntil = getCountdownTimestamp(activeCard?.rejectedCooldownUntil);
  const manualCooldownUntil = getCountdownTimestamp(activeCard?.cooldownUntil);
  const pendingUsedAmount = Number(device.pendingUsed || 0);
  const hasPendingUsed = pendingUsedAmount > 0;

  detailView.innerHTML = `
    <div class="control-dashboard">
      <div class="dashboard-columns">
        <div class="dashboard-main-column">
          <div class="detail-head">
            <div class="finance-head-top">
              <div class="detail-title-block">
                <p class="detail-kicker">Dispositivo seleccionado</p>
                <h2>${escapeHtml(device.title)}</h2>
              </div>
              <button class="meta-edit-button" type="button" data-action="edit-device-financials" data-device-id="${escapeHtml(device.id)}">Ajustar progreso</button>
            </div>

            <section class="finance-balance-card">
              <button class="finance-balance-circle finance-recharge-circle" type="button" data-action="open-recharge" data-device-id="${escapeHtml(device.id)}" title="Registrar recarga" aria-label="Registrar recarga">
                <span class="finance-balance-circle-symbol">₺</span>
                <span class="finance-balance-circle-label">Recargar</span>
              </button>

              <div class="finance-balance-center">
                <span class="finance-balance-kicker">Saldo disponible</span>
                <strong class="finance-balance-amount">${escapeHtml(formatMoney(device.availableBalance))}</strong>
              </div>

              <button class="finance-balance-circle finance-used-circle ${hasPendingUsed ? "" : "is-empty"}" type="button" data-action="deduct-pending" data-device-id="${escapeHtml(device.id)}" title="Restar saldo usado" aria-label="Restar saldo usado" ${hasPendingUsed ? "" : "disabled"}>
                <span class="finance-used-circle-amount">${escapeHtml(formatMoney(device.pendingUsed))}</span>
                <span class="finance-balance-circle-label">Restar</span>
              </button>
            </section>

            <div class="meta-strip finance-meta-strip">
              <span>Ultima recarga ${escapeHtml(formatMoney(device.lastRechargeAmount || 0))}</span>
              <span>Fecha ${escapeHtml(formatDate(device.lastRechargeAt))}</span>
              <span>Limite actual ${escapeHtml(formatMoney(device.balanceLimitCurrent))}</span>
              <span>Tope fijo ${escapeHtml(formatMoney(state.constants.deviceBalanceCap))}</span>
            </div>
          </div>

          ${renderActiveCardDetail(device)}
          ${renderActiveProductStats(device, activeCard, isManualCooldown, isRejectedHold, rejectedUntil, manualCooldownUntil)}
        </div>

        <aside class="dashboard-side-column">
          ${renderCardCycle(device)}
          ${renderHistoryLaunchers(device)}
        </aside>
      </div>
    </div>
  `;
}

function renderSpeechTab() {
  const speeches = state.data?.speeches || {};
  const accountSlots = Array.from({ length: ACCOUNT_SLOT_COUNT }, (_, index) => {
    const slotNumber = index + 1;
    const key = `account-${String(slotNumber).padStart(2, "0")}`;
    const rawEntry = speeches[key] || {};
    const entry = {
      nickname: String(rawEntry.nickname || "").trim(),
      email: String(rawEntry.email || rawEntry.primary || "").trim(),
      password: String(rawEntry.password || rawEntry.secondary || "").trim(),
    };
    const hasContent = Boolean(entry.nickname || entry.email || entry.password);
    return {
      key,
      slotNumber,
      entry,
      hasContent,
    };
  });
  const filledCount = accountSlots.filter((slot) => slot.hasContent).length;
  const commonPasswords = SHARED_PASSWORDS;

  detailView.innerHTML = `
    <section class="panel speeches-panel compact-panel accounts-panel">
      <div class="panel-head accounts-head">
        <div>
          <h2>Cuentas</h2>
        </div>
        <div class="accounts-summary">
          <span class="accounts-summary-pill">${commonPasswords.length} contrasenas</span>
          <span class="accounts-summary-pill is-ready">${filledCount} guardadas</span>
        </div>
      </div>
      <section class="accounts-passwords">
        <div class="accounts-block-head">
          <h3>Contrasenas</h3>
        </div>
        <div class="password-chip-list">
          ${commonPasswords.length
            ? commonPasswords.map((password, index) => `
              <div class="password-chip" data-action="copy-password" data-copy-value="${escapeHtml(password)}" title="Copiar contrasena">
                <span class="account-slot-badge">Clave ${String(index + 1).padStart(2, "0")}</span>
                <strong>${escapeHtml(password)}</strong>
              </div>
            `).join("")
            : `<div class="empty empty-inline">No hay contrasenas guardadas todavia.</div>`}
        </div>
      </section>
      <section class="accounts-passwords">
        <div class="accounts-block-head">
          <h3>Lista de cuentas</h3>
        </div>
        <div class="accounts-list-head" aria-hidden="true">
          <span>Cuenta</span>
          <span>Correo</span>
          <span>Usuario</span>
          <span></span>
        </div>
      <div class="accounts-grid">
        ${accountSlots.map((slot) => {
          const slotLabel = `Cuenta ${String(slot.slotNumber).padStart(2, "0")}`;
          return `
            <form class="glass-form inline-form account-card" data-action="save-speech" data-speech-key="${escapeHtml(slot.key)}">
              <div class="account-card-head">
                <div class="account-card-title">
                  <span class="account-slot-badge">${escapeHtml(slotLabel)}</span>
                  <h3>${slot.hasContent ? "Lista para operar" : "Espacio disponible"}</h3>
                </div>
                <span class="account-card-state ${slot.hasContent ? "is-ready" : ""}">${slot.hasContent ? "Guardada" : "Vacia"}</span>
              </div>
              <label class="speech-field account-field account-field-email">
                <span>Correo</span>
                <input name="email" type="email" value="${escapeHtml(slot.entry.email || "")}" placeholder="correo@gmail.com" autocomplete="off" spellcheck="false">
              </label>
              <label class="speech-field account-field account-field-nickname">
                <span>Nick</span>
                <input name="nickname" type="text" value="${escapeHtml(slot.entry.nickname || "")}" placeholder="Kidstore0001" autocomplete="off" spellcheck="false">
              </label>
              <label class="speech-field account-field">
                <span>Contraseña</span>
                <input name="password" type="text" value="${escapeHtml(slot.entry.password || "")}" placeholder="Contrasena de acceso" autocomplete="off" spellcheck="false">
              </label>
              <button class="account-save-button" type="submit">Guardar</button>
            </form>
          `;
        }).join("")}
      </div>
      </section>
    </section>
  `;
}

function renderModal() {
  if (!state.modal) {
    modalRoot.innerHTML = "";
    return;
  }

  const modal = state.modal;

  if (modal.type === "history") {
    const device = getDevices().find((entry) => entry.id === modal.deviceId);
    const entries = getHistoryEntries(device, modal.historyType);
    const titleMap = {
      recharges: "Historial de recargas",
      purchases: "Historial de compras",
      replacements: "Historial de reemplazos",
    };

    modalRoot.innerHTML = `
      <div class="modal-backdrop" data-modal-backdrop>
        <div class="modal-card modal-card-wide" data-stop-modal>
          <div class="modal-head">
            <div>
              <h3>${escapeHtml(titleMap[modal.historyType] || "Historial")}</h3>
            </div>
            <button class="modal-close" type="button" data-action="close-modal">&times;</button>
          </div>
          <div class="modal-history-content">
            ${entries.length ? entries.map((entry) => `
              <article class="history-item">
                <strong>${escapeHtml(entry.productName || formatMoney(entry.amount || 0))}</strong>
                <span>${escapeHtml(formatDateTime(entry.at || entry.date))}</span>
                ${entry.amount != null ? `<span>Monto ${escapeHtml(formatMoney(entry.amount))}</span>` : ""}
                ${entry.balanceAfter != null ? `<span>Saldo despues ${escapeHtml(formatMoney(entry.balanceAfter))}</span>` : ""}
                ${entry.limitAfter != null ? `<span>Limite despues ${escapeHtml(formatMoney(entry.limitAfter))}</span>` : ""}
                ${entry.note ? `<span>${escapeHtml(entry.note)}</span>` : ""}
              </article>
            `).join("") : `<div class="empty">No hay movimientos en este historial.</div>`}
          </div>
        </div>
      </div>
    `;
    return;
  }

  if (modal.type === "pin") {
    modalRoot.innerHTML = `
      <div class="modal-backdrop" data-modal-backdrop>
        <div class="modal-card" data-stop-modal>
          <div class="modal-head">
            <div>
              <h3>${escapeHtml(modal.needsCreate ? "Crear PIN sensible" : "Desbloquear datos sensibles")}</h3>
            </div>
            <button class="modal-close" type="button" data-action="close-modal">&times;</button>
          </div>
          <form class="modal-form" data-modal-action="submit-pin" data-device-id="${escapeHtml(modal.deviceId)}">
            <input name="pin" type="password" inputmode="numeric" maxlength="6" placeholder="PIN de 6 digitos" required>
            ${modal.needsCreate ? '<input name="pinConfirm" type="password" inputmode="numeric" maxlength="6" placeholder="Confirmar PIN" required>' : ""}
            ${modal.error ? `<div class="modal-error">${escapeHtml(modal.error)}</div>` : ""}
            <div class="modal-actions">
              <button type="button" data-action="close-modal">Cancelar</button>
              <button type="submit">${escapeHtml(modal.needsCreate ? "Crear PIN" : "Desbloquear")}</button>
            </div>
          </form>
        </div>
      </div>
    `;
    return;
  }

  if (modal.type === "edit-card") {
    modalRoot.innerHTML = `
      <div class="modal-backdrop" data-modal-backdrop>
        <div class="modal-card" data-stop-modal>
          <div class="modal-head">
            <div>
              <h3>${escapeHtml(modal.title)}</h3>
            </div>
            <button class="modal-close" type="button" data-action="close-modal">&times;</button>
          </div>
          <form class="modal-form" data-modal-action="${escapeHtml(modal.type)}" data-device-id="${escapeHtml(modal.deviceId)}" data-card-id="${escapeHtml(modal.cardId)}">
            <label class="modal-field">
              <span>Numero completo de la tarjeta</span>
              <input name="number" type="text" placeholder="Ej. 5383990268502182" value="${escapeHtml(modal.values.number)}" required>
            </label>
            <div class="form-grid">
              <label class="modal-field">
                <span>Vencimiento (MM/YY)</span>
                <input name="expiry" type="text" placeholder="Ej. 03/31" value="${escapeHtml(modal.values.expiry)}">
              </label>
              <label class="modal-field">
                <span>CVV</span>
                <input name="cvv" type="text" placeholder="Ej. 609" value="${escapeHtml(modal.values.cvv)}">
              </label>
            </div>
            <label class="modal-field">
              <span>Fecha de creacion de esta tarjeta</span>
              <input name="createdAt" type="text" inputmode="numeric" placeholder="DD/MM/AAAA o AAAA-MM-DD" value="${escapeHtml(modal.values.createdAt)}">
            </label>
            <div class="modal-section-title">Compras acumuladas confirmadas</div>
            <div class="form-grid">
              <div class="modal-field">
                <span>Epic confirmadas</span>
                <strong>${escapeHtml(modal.accumulated?.epic || "0")}</strong>
              </div>
              <div class="modal-field">
                <span>Xbox confirmadas</span>
                <strong>${escapeHtml(modal.accumulated?.xbox || "0")}</strong>
              </div>
              <div class="modal-field">
                <span>Nitro confirmadas</span>
                <strong>${escapeHtml(modal.accumulated?.nitro || "0")}</strong>
              </div>
              <div class="modal-field">
                <span>Nitro 1y confirmadas</span>
                <strong>${escapeHtml(modal.accumulated?.nitroYear || "0")}</strong>
              </div>
              <div class="modal-field">
                <span>Crunchy confirmadas</span>
                <strong>${escapeHtml(modal.accumulated?.crunchy || "0")}</strong>
              </div>
            </div>
            <div class="modal-section-title">Compras pendientes editables</div>
            <div class="form-grid">
              <label class="modal-field">
                <span>Pendientes Epic</span>
                <input name="epic" type="text" inputmode="numeric" placeholder="0" value="${escapeHtml(modal.values.epic)}">
              </label>
              <label class="modal-field">
                <span>Pendientes Xbox</span>
                <input name="xbox" type="text" inputmode="numeric" placeholder="0" value="${escapeHtml(modal.values.xbox)}">
              </label>
              <label class="modal-field">
                <span>Pendientes Nitro</span>
                <input name="nitro" type="text" inputmode="numeric" placeholder="0" value="${escapeHtml(modal.values.nitro)}">
              </label>
              <label class="modal-field">
                <span>Pendientes Nitro 1y</span>
                <input name="nitroYear" type="text" inputmode="numeric" placeholder="0" value="${escapeHtml(modal.values.nitroYear)}">
              </label>
              <label class="modal-field">
                <span>Pendientes Crunchy</span>
                <input name="crunchy" type="text" inputmode="numeric" placeholder="0" value="${escapeHtml(modal.values.crunchy)}">
              </label>
            </div>
            ${modal.error ? `<div class="modal-error">${escapeHtml(modal.error)}</div>` : ""}
            <div class="modal-actions">
              <button type="button" data-action="close-modal">Cancelar</button>
              <button type="submit">${escapeHtml(modal.submitLabel)}</button>
            </div>
          </form>
        </div>
      </div>
    `;
    return;
  }

  if (modal.type === "device-financials") {
    modalRoot.innerHTML = `
      <div class="modal-backdrop" data-modal-backdrop>
        <div class="modal-card" data-stop-modal>
          <div class="modal-head">
            <div>
              <h3>${escapeHtml(modal.title)}</h3>
            </div>
            <button class="modal-close" type="button" data-action="close-modal">&times;</button>
          </div>
          <form class="modal-form" data-modal-action="device-financials" data-device-id="${escapeHtml(modal.deviceId)}">
            <div class="form-grid">
              <label class="modal-field">
                <span>Saldo disponible actual</span>
                <input name="availableBalance" type="text" inputmode="decimal" placeholder="Ej. 507" value="${escapeHtml(modal.values.availableBalance)}">
              </label>
              <label class="modal-field">
                <span>Limite actual restante</span>
                <input name="balanceLimitCurrent" type="text" inputmode="decimal" placeholder="Ej. 2243" value="${escapeHtml(modal.values.balanceLimitCurrent)}">
              </label>
              <label class="modal-field">
                <span>Monto de la ultima recarga</span>
                <input name="lastRechargeAmount" type="text" inputmode="decimal" placeholder="Ej. 1250" value="${escapeHtml(modal.values.lastRechargeAmount)}">
              </label>
              <label class="modal-field">
                <span>Fecha de la ultima recarga</span>
                <input name="lastRechargeAt" type="text" inputmode="numeric" placeholder="DD/MM/AAAA o AAAA-MM-DD" value="${escapeHtml(modal.values.lastRechargeAt)}">
              </label>
            </div>
            ${modal.error ? `<div class="modal-error">${escapeHtml(modal.error)}</div>` : ""}
            <div class="modal-actions">
              <button type="button" data-action="close-modal">Cancelar</button>
              <button type="submit">${escapeHtml(modal.submitLabel)}</button>
            </div>
          </form>
        </div>
      </div>
    `;
    return;
  }

  if (modal.type === "recharge") {
    modalRoot.innerHTML = `
      <div class="modal-backdrop" data-modal-backdrop>
        <div class="modal-card" data-stop-modal>
          <div class="modal-head">
            <div>
              <h3>${escapeHtml(modal.title)}</h3>
            </div>
            <button class="modal-close" type="button" data-action="close-modal">&times;</button>
          </div>
          <form class="modal-form" data-modal-action="recharge" data-device-id="${escapeHtml(modal.deviceId)}">
            <label class="modal-field">
              <span>Monto de recarga</span>
              <input name="amount" type="number" min="0" step="0.01" placeholder="Ej. 500" value="${escapeHtml(modal.values.amount)}" required>
            </label>
            <div class="modal-note">Saldo disponible actual: ${escapeHtml(formatMoney(modal.previewBalance || 0))}</div>
            ${modal.error ? `<div class="modal-error">${escapeHtml(modal.error)}</div>` : ""}
            <div class="modal-actions">
              <button type="button" data-action="close-modal">Cancelar</button>
              <button type="submit">${escapeHtml(modal.submitLabel)}</button>
            </div>
          </form>
        </div>
      </div>
    `;
    return;
  }

  if (modal.type === "replace-card") {
    modalRoot.innerHTML = `
      <div class="modal-backdrop" data-modal-backdrop>
        <div class="modal-card" data-stop-modal>
          <div class="modal-head">
            <div>
              <h3>${escapeHtml(modal.title)}</h3>
            </div>
            <button class="modal-close" type="button" data-action="close-modal">&times;</button>
          </div>
          <form class="modal-form" data-modal-action="${escapeHtml(modal.type)}" data-device-id="${escapeHtml(modal.deviceId)}" data-card-id="${escapeHtml(modal.cardId)}">
            <input name="number" type="text" placeholder="Numero de tarjeta" value="${escapeHtml(modal.values.number)}" required>
            <input name="expiry" type="text" placeholder="MM/YY" value="${escapeHtml(modal.values.expiry)}">
            <input name="cvv" type="text" placeholder="CVV" value="${escapeHtml(modal.values.cvv)}">
            <input name="createdAt" type="date" value="${escapeHtml(modal.values.createdAt)}">
            ${modal.error ? `<div class="modal-error">${escapeHtml(modal.error)}</div>` : ""}
            <div class="modal-actions">
              <button type="button" data-action="close-modal">Cancelar</button>
              <button type="submit">${escapeHtml(modal.submitLabel)}</button>
            </div>
          </form>
        </div>
      </div>
    `;
    return;
  }

  if (modal.type === "notes") {
    modalRoot.innerHTML = `
      <div class="modal-backdrop" data-modal-backdrop>
        <div class="modal-card" data-stop-modal>
          <div class="modal-head">
            <div>
              <h3>${escapeHtml(modal.title)}</h3>
            </div>
            <button class="modal-close" type="button" data-action="close-modal">&times;</button>
          </div>
          <form class="modal-form" data-modal-action="save-notes" data-device-id="${escapeHtml(modal.deviceId)}" data-card-id="${escapeHtml(modal.cardId)}">
            <textarea name="notes" placeholder="Escribe aqui tus notas">${escapeHtml(modal.values.notes)}</textarea>
            ${modal.error ? `<div class="modal-error">${escapeHtml(modal.error)}</div>` : ""}
            <div class="modal-actions">
              <button type="button" data-action="close-modal">Cancelar</button>
              <button type="submit">${escapeHtml(modal.submitLabel)}</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }
}

function render() {
  document.body.classList.toggle("speeches-mode", state.selectedTab === "speeches");
  document.body.classList.toggle("fintech-control-mode", state.selectedTab === "control");
  renderNoticeStrip();

  if (state.selectedTab === "speeches") {
    deviceList.innerHTML = "";
  } else {
    renderDeviceList();
  }

  tabControl.classList.toggle("active", state.selectedTab === "control");
  tabSpeeches.classList.toggle("active", state.selectedTab === "speeches");
  tabControl.setAttribute("aria-selected", state.selectedTab === "control" ? "true" : "false");
  tabSpeeches.setAttribute("aria-selected", state.selectedTab === "speeches" ? "true" : "false");

  if (state.selectedTab === "speeches") {
    renderSpeechTab();
  } else {
    renderControlTab();
  }

  renderModal();
  updateCountdownLabels();
}

function updateCountdownLabels() {
  const countdownElements = Array.from(document.querySelectorAll("[data-countdown-label][data-countdown-until]"));
  if (!countdownElements.length) {
    return;
  }

  const now = Date.now();
  let shouldSync = false;

  countdownElements.forEach((element) => {
    const label = String(element.dataset.countdownLabel || "").trim();
    const until = Number(element.dataset.countdownUntil || 0);
    if (!until || until <= now) {
      element.textContent = label;
      if (until) {
        shouldSync = true;
      }
      return;
    }

    element.textContent = `${label} ${formatCooldownCountdown(until)}`.trim();
  });

  if (shouldSync && !countdownSyncPending) {
    countdownSyncPending = true;
    loadState().finally(() => {
      countdownSyncPending = false;
    });
  }
}

function startCooldownTimer() {
  if (cooldownTimer) {
    clearInterval(cooldownTimer);
  }

  cooldownTimer = window.setInterval(() => {
    updateCountdownLabels();
  }, 1000);
}

function serializeForm(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function findDeviceAndCardFromDataset(target) {
  const deviceId = target.dataset.deviceId;
  const cardId = target.dataset.cardId;
  const device = getDevices().find((entry) => entry.id === deviceId);
  const card = getVisibleCards(device).find((entry) => entry.id === cardId) || null;
  return { device, card };
}

function isTypingTarget(target) {
  return Boolean(target?.closest("input, textarea, [contenteditable='true']"));
}

function moveDeviceSelection(direction) {
  const devices = getDevices();
  if (!devices.length || state.selectedTab !== "control") {
    return;
  }

  const currentIndex = Math.max(0, devices.findIndex((device) => device.id === state.selectedDeviceId));
  const nextIndex = Math.min(devices.length - 1, Math.max(0, currentIndex + direction));
  if (devices[nextIndex]) {
    state.selectedDeviceId = devices[nextIndex].id;
    render();
  }
}

document.addEventListener("click", async (event) => {
  const modalContent = event.target.closest("[data-stop-modal]");
  if (modalContent) {
    const closeButton = event.target.closest('[data-action="close-modal"]');
    if (!closeButton) {
      return;
    }
  }

  const button = event.target.closest("[data-action]");
  if (!button) {
    return;
  }

  if (button.tagName === "FORM") {
    return;
  }

  const { action } = button.dataset;

  if (action === "close-modal") {
    closeModal();
    return;
  }

  if (action === "select-device") {
    state.selectedDeviceId = button.dataset.deviceId;
    render();
    return;
  }

  if (action === "open-history") {
    openHistoryModal(button.dataset.deviceId, button.dataset.historyType);
    return;
  }

  if (action === "copy-password") {
    event.preventDefault();
    const copied = await copyText(button.dataset.copyValue || "");
    if (!copied) {
      window.alert("No se pudo copiar la contrasena.");
      return;
    }
    button.classList.add("is-copied");
    window.setTimeout(() => button.classList.remove("is-copied"), 1000);
    return;
  }

  if (action === "edit-device-financials") {
    const device = getDevices().find((entry) => entry.id === button.dataset.deviceId);
    if (device) {
      openDeviceFinancialsModal(device);
    }
    return;
  }

  if (action === "open-recharge") {
    const device = getDevices().find((entry) => entry.id === button.dataset.deviceId);
    if (device) {
      openRechargeModal(device);
    }
    return;
  }

  if (action === "lock-sensitive") {
    const deviceId = button.dataset.deviceId;
    delete state.sensitiveUnlockedUntilByDevice[deviceId];
    scheduleUnlockExpiryCheck();
    render();
    return;
  }

  if (action === "unlock-sensitive") {
    const deviceId = button.dataset.deviceId;
    openPinModal(deviceId);
    return;
  }

  if (action === "edit-card") {
    const { device, card } = findDeviceAndCardFromDataset(button);
    if (device && card) {
      openEditCardModal(device.id, card);
    }
    return;
  }

  if (action === "replace-card") {
    const { device, card } = findDeviceAndCardFromDataset(button);
    if (device && card) {
      openReplaceCardModal(device.id, card);
    }
    return;
  }

  if (action === "notes-card") {
    const { device, card } = findDeviceAndCardFromDataset(button);
    if (device && card) {
      openNotesModal(device.id, card);
    }
    return;
  }

  if (action === "toggle-card-flip") {
    const { deviceId, cardId } = button.dataset;
    if (isCardFlipped(deviceId, cardId)) {
      delete state.flippedCardByDevice[deviceId];
    } else if (deviceId && cardId) {
      state.flippedCardByDevice[deviceId] = cardId;
    }
    render();
    return;
  }

  if (action === "toggle-rejected") {
    await sendMutation(`/api/devices/${button.dataset.deviceId}/cards/${button.dataset.cardId}/toggle-rejected`, {});
    return;
  }

  if (action === "toggle-cooldown") {
    await sendMutation(`/api/devices/${button.dataset.deviceId}/cards/${button.dataset.cardId}/toggle-cooldown`, {});
    return;
  }

  if (action === "revert-custom") {
    await sendMutation(`/api/devices/${button.dataset.deviceId}/revert-custom`, {});
    return;
  }

  if (action === "update-product") {
    if (button.disabled) {
      return;
    }

    await sendMutation(`/api/devices/${button.dataset.deviceId}/cards/${button.dataset.cardId}/product`, {
      productKey: button.dataset.productKey,
      delta: Number(button.dataset.delta || 0),
    });
    return;
  }

  if (action === "deduct-pending") {
    await sendMutation(`/api/devices/${button.dataset.deviceId}/deduct-pending`, {});
    return;
  }
});

modalRoot.addEventListener("pointerdown", (event) => {
  if (event.target.closest("[data-stop-modal]")) {
    event.stopPropagation();
  }
});

modalRoot.addEventListener("mousedown", (event) => {
  if (event.target.closest("[data-stop-modal]")) {
    event.stopPropagation();
  }
});

modalRoot.addEventListener("click", (event) => {
  const closeTrigger = event.target.closest('[data-action="close-modal"]');
  if (closeTrigger) {
    event.stopPropagation();
    closeModal();
    return;
  }

  if (event.target.closest("[data-stop-modal]")) {
    event.stopPropagation();
    return;
  }

  const backdrop = event.target.closest("[data-modal-backdrop]");
  if (backdrop && event.target === backdrop) {
    closeModal();
  }
});

document.addEventListener("submit", async (event) => {
  const form = event.target.closest("form[data-action], form[data-modal-action]");
  if (!form) {
    return;
  }

  event.preventDefault();
  const action = form.dataset.modalAction || form.dataset.action;
  const values = serializeForm(form);

  if (action === "recharge") {
    await sendMutation(`/api/devices/${form.dataset.deviceId}/recharge`, {
      amount: Number(values.amount || 0),
    });
    form.reset();
    if (form.dataset.modalAction === "recharge") {
      closeModal();
    }
    return;
  }

  if (action === "custom-amount") {
    await sendMutation(`/api/devices/${form.dataset.deviceId}/pending-used`, {
      amount: Number(values.amount || 0),
    });
    form.reset();
    return;
  }

  if (action === "save-speech") {
    const payload = {};
    ["nickname", "email", "password", "primary", "secondary"].forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(values, key)) {
        payload[key] = values[key] || "";
      }
    });

    await sendMutation(`/api/speeches/${form.dataset.speechKey}`, {
      ...payload,
    });
    return;
  }

  if (action === "submit-pin") {
    const pin = String(values.pin || "").trim();
    const pinConfirm = String(values.pinConfirm || "").trim();

    if (!/^\d{6}$/.test(pin)) {
      state.modal.error = getErrorMessage("invalid-pin");
      renderModal();
      return;
    }

    if (state.modal.needsCreate) {
      if (pin !== pinConfirm) {
        state.modal.error = "Los PIN no coinciden.";
        renderModal();
        return;
      }

      saveSensitivePin(pin);
      unlockSensitive(form.dataset.deviceId);
      return;
    }

    if (pin !== getStoredSensitivePin()) {
      state.modal.error = getErrorMessage("wrong-pin");
      renderModal();
      return;
    }

    unlockSensitive(form.dataset.deviceId);
    return;
  }

  if (action === "edit-card") {
    await sendMutation(`/api/devices/${form.dataset.deviceId}/cards/${form.dataset.cardId}/update`, values);
    closeModal();
    return;
  }

  if (action === "device-financials") {
    await sendMutation(`/api/devices/${form.dataset.deviceId}/financials`, values);
    closeModal();
    return;
  }

  if (action === "replace-card") {
    await sendMutation(`/api/devices/${form.dataset.deviceId}/cards/${form.dataset.cardId}/replace`, values);
    closeModal();
    return;
  }

  if (action === "save-notes") {
    await sendMutation(`/api/devices/${form.dataset.deviceId}/cards/${form.dataset.cardId}/notes`, {
      notes: values.notes || "",
    });
    closeModal();
  }
});

document.addEventListener("keydown", (event) => {
  const deviceItem = event.target instanceof HTMLElement ? event.target.closest('.device-item-select[data-action="select-device"]') : null;
  if (deviceItem && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    deviceItem.click();
    return;
  }

  const customAmountInput = event.target instanceof HTMLElement ? event.target.closest(".custom-amount-input") : null;
  if (customAmountInput && event.key === "Enter") {
    event.preventDefault();
    const form = customAmountInput.closest("form");
    form?.requestSubmit();
    return;
  }

  if (event.key === "Escape" && state.modal) {
    closeModal();
    return;
  }

  if (state.modal) {
    return;
  }

  if (isTypingTarget(event.target)) {
    return;
  }

  if (event.key === "1") {
    state.selectedTab = "control";
    render();
    return;
  }

  if (event.key === "2") {
    state.selectedTab = "speeches";
    render();
    return;
  }

  if (event.key.toLowerCase() === "r") {
    loadState();
    return;
  }

  if (event.key === "ArrowDown") {
    moveDeviceSelection(1);
    return;
  }

  if (event.key === "ArrowUp") {
    moveDeviceSelection(-1);
  }
});

tabControl.addEventListener("click", () => {
  state.selectedTab = "control";
  render();
});

tabSpeeches.addEventListener("click", () => {
  state.selectedTab = "speeches";
  render();
});

themeToggle.addEventListener("click", toggleTheme);
reloadButton.addEventListener("click", loadState);

initTheme();
renderNoticeStrip();
setLoadingOverlay(true, "Preparando dispositivos, tarjetas y conexiones del panel.");
scheduleUnlockExpiryCheck();
startCooldownTimer();
loadState();
