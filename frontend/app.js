const themeToggle = document.querySelector("#themeToggle");
const connectionBadge = document.querySelector("#connectionBadge");
const reloadButton = document.querySelector("#reloadButton");
const tabControl = document.querySelector("#tabControl");
const tabSpeeches = document.querySelector("#tabSpeeches");
const deviceList = document.querySelector("#deviceList");
const detailView = document.querySelector("#detailView");
const modalRoot = document.querySelector("#modalRoot");

const PRODUCT_ORDER = ["epic", "xbox", "nitro", "nitroYear", "crunchy"];
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
  modal: null,
  requestPending: false,
};

let unlockExpiryTimer = null;
let detailSwitchTimer = null;

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

function getStoredTheme() {
  return localStorage.getItem(THEME_KEY) || "dark";
}

function applyTheme(theme) {
  const nextTheme = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = nextTheme;
  themeToggle.textContent = nextTheme === "light" ? "Tema oscuro" : "Tema claro";
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

function getCooldownLabel(card) {
  if (!isCooldownActive(card)) {
    return "";
  }

  return `24h manual hasta ${formatDateTime(card.cooldownUntil)}`;
}

function getRejectedHoldLabel(card) {
  if (!isRejectedHoldActive(card)) {
    return "";
  }

  return `24h por rechazo hasta ${formatDateTime(card.rejectedCooldownUntil)}`;
}

function getProductRule(productKey) {
  return (state.constants.productRules || []).find((rule) => rule.key === productKey);
}

function getCardDisplayedCount(card, productKey) {
  return Number(card?.baseCounts?.[productKey] || 0) + Number(card?.counts?.[productKey] || 0);
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
  try {
    connectionBadge.textContent = "Conectando...";
    const payload = await apiFetch("/api/state");
    applyLoadedState(payload);
    connectionBadge.textContent = "Backend activo";
    render();
  } catch (error) {
    connectionBadge.textContent = "Error de carga";
    detailView.innerHTML = `<div class="empty">No se pudo cargar el panel. ${escapeHtml(error.message)}</div>`;
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
      epic: String(getCardDisplayedCount(card, "epic")),
      xbox: String(getCardDisplayedCount(card, "xbox")),
      nitro: String(getCardDisplayedCount(card, "nitro")),
      nitroYear: String(getCardDisplayedCount(card, "nitroYear")),
      crunchy: String(getCardDisplayedCount(card, "crunchy")),
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
      <button class="device-item ${isActive ? "active" : ""}" type="button" data-action="select-device" data-device-id="${escapeHtml(device.id)}">
        <div class="device-item-top">
          <strong>${escapeHtml(device.title)}</strong>
          <span class="device-item-badge">${isActive ? "En foco" : "Lista"}</span>
        </div>
        <div class="device-item-stats">
          <span><b>Saldo</b> ${escapeHtml(formatMoney(device.availableBalance))}</span>
          <span><b>Usado</b> ${escapeHtml(formatMoney(device.pendingUsed))}</span>
          <span><b>Limite</b> ${escapeHtml(formatMoney(device.balanceLimitCurrent))}</span>
        </div>
        ${lowBalance ? `<div class="device-low-flag"><span class="device-low-dot"></span><span>Saldo bajo</span></div>` : ""}
        ${hasNotes ? `<div class="device-note-flag"><span class="device-note-dot"></span><span>Nota guardada</span></div>` : ""}
        ${isActive && profile ? `
          <div class="device-expanded">
            <div class="device-profile-grid">
              <div class="device-profile-item">
                <span class="device-profile-label"><i aria-hidden="true">&#128100;</i><em>Nombre</em></span>
                <strong>${escapeHtml(profile.ownerName)}</strong>
              </div>
              <div class="device-profile-item">
                <span class="device-profile-label"><i aria-hidden="true">&#128179;</i><em>Cuenta</em></span>
                <strong>${escapeHtml(profile.accountNumber)}</strong>
              </div>
              <div class="device-profile-item">
                <span class="device-profile-label"><i aria-hidden="true">&#128222;</i><em>Celular</em></span>
                <strong>${escapeHtml(profile.phone)}</strong>
              </div>
              <div class="device-profile-item device-profile-wide device-profile-bank">
                <span class="device-profile-label"><i aria-hidden="true">&#127974;</i><em>Ziraat Bank</em></span>
                <strong>${escapeHtml(profile.iban)}</strong>
              </div>
            </div>
          </div>
        ` : ""}
      </button>
    `;
  }).join("");
}

function renderHistoryLaunchers(device) {
  return `
    <section class="history-launcher">
      <div class="section-row">
        <div>
          <h3>Historiales</h3>
          <p class="panel-head-sub">Se abren en ventana flotante, igual que en la app.</p>
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

function renderActiveCardCounts(card) {
  return PRODUCT_ORDER.map((productKey) => {
    const rule = getProductRule(productKey);
    if (!rule) {
      return "";
    }
    return `${rule.label}: ${getCardDisplayedCount(card, productKey)}`;
  }).filter(Boolean).join(" / ");
}

function pulseDetailView() {
  if (detailSwitchTimer) {
    window.clearTimeout(detailSwitchTimer);
    detailSwitchTimer = null;
  }

  detailView.classList.add("is-switching");
  detailSwitchTimer = window.setTimeout(() => {
    detailView.classList.remove("is-switching");
    detailSwitchTimer = null;
  }, 170);
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
  const rejectedHoldLabel = getRejectedHoldLabel(activeCard);
  const purchaseSummary = renderActiveCardCounts(activeCard);
  const stateLabel = activeCard.rejectedAt ? "Rechazada" : "Sin estado";
  const hasNotes = hasMeaningfulNotes(activeCard.notes);
  const lowBalance = isLowBalance(device.availableBalance);
  const isManualCooldown = isCooldownActive(activeCard);
  const isRejectedHold = isRejectedHoldActive(activeCard);

  const productCards = PRODUCT_ORDER.map((productKey) => {
    const rule = getProductRule(productKey);
    if (!rule) {
      return "";
    }

    const count = getCardDisplayedCount(activeCard, productKey);
    const isEpicBlocked = productKey === "epic" && (isManualCooldown || isRejectedHold);
    const productLockLabel = isRejectedHold ? "Bloqueado por rechazo" : "Bloqueado por 24h";

    return `
      <div class="product-stat ${isEpicBlocked ? "is-disabled" : ""}">
        <div class="product-stat-headline">
          <strong>${escapeHtml(rule.label)}</strong>
          <span class="product-price">${escapeHtml(formatMoney(rule.amount))}</span>
        </div>
        <span class="product-cap">${rule.maxCount ? `Max ${escapeHtml(rule.maxCount)}` : "Sin tope"}</span>
        ${isEpicBlocked ? `<span class="product-lock">${escapeHtml(productLockLabel)}</span>` : ""}
        <div class="product-counter">
          <button type="button" data-action="update-product" data-device-id="${escapeHtml(device.id)}" data-card-id="${escapeHtml(activeCard.id)}" data-product-key="${escapeHtml(productKey)}" data-delta="-1">-</button>
          <div class="product-stat-count">${escapeHtml(count)}</div>
          <button type="button" data-action="update-product" data-device-id="${escapeHtml(device.id)}" data-card-id="${escapeHtml(activeCard.id)}" data-product-key="${escapeHtml(productKey)}" data-delta="1" ${isEpicBlocked ? "disabled" : ""}>+</button>
        </div>
      </div>
    `;
  }).join("");

  return `
    <section class="cards-section">
      <h3>Tarjeta activa</h3>
      <article class="selected-card">
        <div class="selected-card-head">
          <div class="selected-card-primary">
            <div class="status-row">
              <span class="card-label">${escapeHtml(activeCard.orderLabel || "Tarjeta activa")}</span>
              <span class="status-pill active">Activa</span>
              <span class="status-pill ${activeCard.rejectedAt ? "danger" : ""}">${escapeHtml(stateLabel)}</span>
              ${cooldownLabel ? `<span class="status-pill cooldown">${escapeHtml(cooldownLabel)}</span>` : ""}
              ${rejectedHoldLabel ? `<span class="status-pill rejection-hold">${escapeHtml(rejectedHoldLabel)}</span>` : ""}
              ${lowBalance ? '<span class="status-pill low-balance">Saldo bajo</span>' : ""}
            </div>
            <div class="card-face">
              <div class="card-face-top">
                <span class="card-face-brand">KIDSTORE SECURE</span>
                <span class="card-face-chip" aria-hidden="true"></span>
              </div>
              <h3 class="card-number">${escapeHtml(numberText)}</h3>
              <div class="card-face-meta">
                <span>Creada ${escapeHtml(formatDate(activeCard.createdAt))}</span>
                <span>Vence ${escapeHtml(activeCard.expiry || "--")}</span>
              </div>
            </div>
          </div>
          <div class="selected-card-topside">
            <div class="purchase-summary-shell">
              <span class="summary-kicker">Actividad acumulada</span>
              <p class="purchase-summary">${escapeHtml(purchaseSummary)}</p>
            </div>
            <div class="inline-actions-shell">
              <span class="summary-kicker">Acciones y alertas</span>
              <div class="inline-actions">
                <button type="button" data-action="unlock-sensitive" data-device-id="${escapeHtml(device.id)}">${escapeHtml(unlockLabel)}</button>
                <button class="icon-action" type="button" data-action="edit-card" data-device-id="${escapeHtml(device.id)}" data-card-id="${escapeHtml(activeCard.id)}" title="Editar" aria-label="Editar tarjeta">&#9998;</button>
                <button class="icon-action" type="button" data-action="replace-card" data-device-id="${escapeHtml(device.id)}" data-card-id="${escapeHtml(activeCard.id)}" title="Reemplazar" aria-label="Reemplazar tarjeta">&#8646;</button>
                <button class="icon-action ${hasNotes ? "has-note" : ""}" type="button" data-action="notes-card" data-device-id="${escapeHtml(device.id)}" data-card-id="${escapeHtml(activeCard.id)}" title="Notas" aria-label="Editar notas">&#128221;</button>
                <button type="button" class="${activeCard.rejectedAt ? "is-active-toggle" : ""}" data-action="toggle-rejected" data-device-id="${escapeHtml(device.id)}" data-card-id="${escapeHtml(activeCard.id)}">Rechazado</button>
                <button type="button" class="${isManualCooldown ? "is-active-toggle" : ""}" data-action="toggle-cooldown" data-device-id="${escapeHtml(device.id)}" data-card-id="${escapeHtml(activeCard.id)}">24h</button>
              </div>
            </div>
          </div>
        </div>

        <div class="selected-card-grid">
          <div class="info-tile secure-tile">
            <span class="secure-tile-label">MM/YY</span>
            <strong>${escapeHtml(activeCard.expiry || "--")}</strong>
          </div>
          <div class="info-tile secure-tile">
            <span class="secure-tile-label">CVV</span>
            <strong>${escapeHtml(cvvText)}</strong>
          </div>
          <div class="info-tile secure-tile">
            <span class="secure-tile-label">Creada</span>
            <strong>${escapeHtml(formatDate(activeCard.createdAt))}</strong>
          </div>
          <div class="info-tile info-tile-wide ${hasNotes ? "note-highlight" : ""}">
            <span>Notas</span>
            ${hasNotes ? '<em class="note-emphasis">Importante</em>' : ""}
            <strong>${escapeHtml(activeCard.notes || "Sin notas")}</strong>
          </div>
        </div>

        <div class="product-stats-grid">
          ${productCards}
          <form class="product-stat custom-amount-form" data-action="custom-amount" data-device-id="${escapeHtml(device.id)}">
            <strong>Otro monto</strong>
            <span>Compra libre</span>
            <button class="visually-hidden-submit" type="submit" tabindex="-1" aria-hidden="true">Agregar monto</button>
            <div class="compact-action-row">
              <input class="custom-amount-input" name="amount" type="text" inputmode="decimal" placeholder="0.00" required>
              <button class="compact-icon-button" type="button" data-action="revert-custom" data-device-id="${escapeHtml(device.id)}" title="Revertir ultimo monto" aria-label="Revertir ultimo monto">&#8630;</button>
            </div>
          </form>
        </div>
      </article>
    </section>
  `;
}

function renderCardCycle(device) {
  const cards = getCycleCards(device);
  const activeCard = getActiveCard(device);
  if (!cards.length) {
    return "";
  }

  return `
    <section class="cards-section">
      <div class="section-row">
        <h3>Ciclo de tarjetas</h3>
        <span class="readonly-chip">Solo la activa conserva acciones</span>
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
              <div class="card-mini-meta">
                ${isActive ? "<span>Lista para operar ahora.</span>" : "<span>Se activara cuando el ciclo vuelva a esta tarjeta.</span>"}
              </div>
              <div class="card-mini-hint">
                ${isActive ? "<span>Acciones habilitadas en esta tarjeta.</span>" : "<span>4 digitos y fecha visibles hasta su turno.</span>"}
              </div>
            </article>
          `;
        }).join("")}
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

  detailView.innerHTML = `
    <div class="detail-head">
      <div class="detail-title-block">
        <p class="detail-kicker">Dispositivo seleccionado</p>
        <h2>${escapeHtml(device.title)}</h2>
        <p class="detail-summary">Saldo disponible ${escapeHtml(formatMoney(device.availableBalance))} - Saldo usado ${escapeHtml(formatMoney(device.pendingUsed))}</p>
      </div>
      <div class="meta-strip">
        <span>Ultima recarga ${escapeHtml(formatMoney(device.lastRechargeAmount || 0))}</span>
        <span>Fecha ${escapeHtml(formatDate(device.lastRechargeAt))}</span>
        <span>Limite actual ${escapeHtml(formatMoney(device.balanceLimitCurrent))}</span>
        <span>Tope fijo ${escapeHtml(formatMoney(state.constants.deviceBalanceCap))}</span>
        <button class="meta-edit-button" type="button" data-action="edit-device-financials" data-device-id="${escapeHtml(device.id)}">Ajustar progreso</button>
      </div>
    </div>

    <section class="actions-grid control-actions-grid">
      <form class="action-card compact-action-card" data-action="recharge" data-device-id="${escapeHtml(device.id)}">
        <div class="card-header-row">
          <h3>Agregar saldo</h3>
          <strong class="balance-highlight">Disponible ${escapeHtml(formatMoney(device.availableBalance))}</strong>
        </div>
        <div class="compact-action-row">
          <input name="amount" type="number" min="0" step="0.01" placeholder="Monto de recarga" required>
          <button type="submit">Agregar</button>
        </div>
      </form>

      <section class="action-card compact-action-card used-summary-card">
        <h3>Saldo usado</h3>
        <strong class="used-summary-amount">${escapeHtml(formatMoney(device.pendingUsed))}</strong>
        <p>Este monto se descuenta y pasa al historial de compras.</p>
        <button type="button" data-action="deduct-pending" data-device-id="${escapeHtml(device.id)}">Restar saldo usado</button>
      </section>
    </section>

    ${renderHistoryLaunchers(device)}
    ${renderActiveCardDetail(device)}
    ${renderCardCycle(device)}
  `;
}

function renderSpeechTab() {
  const speeches = state.data?.speeches || {};
  const keys = Object.keys(speeches);
  if (!keys.length) {
    detailView.innerHTML = `<div class="empty">No hay speeches cargados.</div>`;
    return;
  }

  detailView.innerHTML = `
    <section class="panel speeches-panel compact-panel">
      <div class="panel-head">
        <h2>Speeches</h2>
        <p class="panel-head-sub">Edita los mensajes guardados del panel.</p>
      </div>
      <div class="speech-grid">
        ${keys.map((key) => {
          const entry = speeches[key] || { primary: "", secondary: "" };
          return `
            <form class="glass-form inline-form" data-action="save-speech" data-speech-key="${escapeHtml(key)}">
              <h3>${escapeHtml(key)}</h3>
              <label class="speech-field">
                <span>Principal</span>
                <textarea name="primary">${escapeHtml(entry.primary || "")}</textarea>
              </label>
              <label class="speech-field">
                <span>Secundario</span>
                <textarea name="secondary">${escapeHtml(entry.secondary || "")}</textarea>
              </label>
              <button type="submit">Guardar speech</button>
            </form>
          `;
        }).join("")}
      </div>
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
              <p>${escapeHtml(device?.title || "")}</p>
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
              <p>${escapeHtml(modal.needsCreate ? "Crea un PIN local de 6 digitos para este navegador." : "Ingresa tu PIN de 6 digitos para ver numero y CVV por 30 segundos.")}</p>
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
              <p>Ajusta los datos reales y el progreso acumulado de la tarjeta.</p>
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
            <div class="modal-section-title">Compras reales acumuladas</div>
            <div class="form-grid">
              <label class="modal-field">
                <span>Compras Epic realizadas</span>
                <input name="epic" type="text" inputmode="numeric" placeholder="0" value="${escapeHtml(modal.values.epic)}">
              </label>
              <label class="modal-field">
                <span>Compras Xbox realizadas</span>
                <input name="xbox" type="text" inputmode="numeric" placeholder="0" value="${escapeHtml(modal.values.xbox)}">
              </label>
              <label class="modal-field">
                <span>Compras Nitro realizadas</span>
                <input name="nitro" type="text" inputmode="numeric" placeholder="0" value="${escapeHtml(modal.values.nitro)}">
              </label>
              <label class="modal-field">
                <span>Compras Nitro 1y realizadas</span>
                <input name="nitroYear" type="text" inputmode="numeric" placeholder="0" value="${escapeHtml(modal.values.nitroYear)}">
              </label>
              <label class="modal-field">
                <span>Compras Crunchy realizadas</span>
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
              <p>Fija manualmente el progreso previo del dispositivo.</p>
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

  if (modal.type === "replace-card") {
    modalRoot.innerHTML = `
      <div class="modal-backdrop" data-modal-backdrop>
        <div class="modal-card" data-stop-modal>
          <div class="modal-head">
            <div>
              <h3>${escapeHtml(modal.title)}</h3>
              <p>Actualiza los datos clave de la tarjeta.</p>
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
              <p>Guarda observaciones internas para la tarjeta activa.</p>
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
    pulseDetailView();
    return;
  }

  if (action === "open-history") {
    openHistoryModal(button.dataset.deviceId, button.dataset.historyType);
    return;
  }

  if (action === "edit-device-financials") {
    const device = getDevices().find((entry) => entry.id === button.dataset.deviceId);
    if (device) {
      openDeviceFinancialsModal(device);
    }
    return;
  }

  if (action === "unlock-sensitive") {
    const deviceId = button.dataset.deviceId;
    if (isSensitiveUnlocked(deviceId)) {
      delete state.sensitiveUnlockedUntilByDevice[deviceId];
      scheduleUnlockExpiryCheck();
      render();
      return;
    }

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
    await sendMutation(`/api/speeches/${form.dataset.speechKey}`, {
      primary: values.primary || "",
      secondary: values.secondary || "",
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
    pulseDetailView();
    return;
  }

  if (event.key === "ArrowUp") {
    moveDeviceSelection(-1);
    pulseDetailView();
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
scheduleUnlockExpiryCheck();
loadState();
