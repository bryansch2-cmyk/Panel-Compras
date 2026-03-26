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

const state = {
  data: null,
  constants: {
    deviceBalanceCap: 2750,
    productRules: [],
  },
  selectedTab: "control",
  selectedDeviceId: "",
  selectedHistoryTypeByDevice: {},
  sensitiveUnlockedUntilByDevice: {},
  modal: null,
  requestPending: false,
};

let unlockExpiryTimer = null;

function formatMoney(value) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatDateTime(value) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getStoredTheme() {
  return localStorage.getItem(THEME_KEY) || "dark";
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === "light" ? "light" : "dark";
  themeToggle.textContent = theme === "light" ? "Tema oscuro" : "Tema claro";
}

function initTheme() {
  applyTheme(getStoredTheme());
}

function toggleTheme() {
  const nextTheme = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  localStorage.setItem(THEME_KEY, nextTheme);
  applyTheme(nextTheme);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

  const entries = Object.entries(state.sensitiveUnlockedUntilByDevice)
    .map(([deviceId, until]) => [deviceId, Number(until || 0)])
    .filter(([, until]) => until > Date.now())
    .sort((left, right) => left[1] - right[1]);

  if (!entries.length) {
    return;
  }

  const [, nextUntil] = entries[0];
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
  }, Math.max(0, nextUntil - Date.now()) + 40);
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
    ? device.cards.filter((card) => !card.archived).sort((left, right) => {
        if (left.order !== right.order) {
          return left.order - right.order;
        }
        return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
      })
    : [];
}

function getActiveCard(device) {
  const cards = getVisibleCards(device);
  const activeMatches = cards.filter((card) => Number(card.order) === Number(device?.activeCardOrder || 1));
  return activeMatches[0] || cards[0] || null;
}

function isCooldownActive(card) {
  return Boolean(card?.cooldownUntil) && new Date(card.cooldownUntil).getTime() > Date.now();
}

function getCooldownLabel(card) {
  if (!isCooldownActive(card)) {
    return "";
  }

  return `24h hasta ${formatDateTime(card.cooldownUntil)}`;
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
  state.selectedHistoryTypeByDevice[deviceId] = historyType;
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
    return getVisibleCards(device)
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
    return `
      <button class="device-item ${isActive ? "active" : ""}" type="button" data-action="select-device" data-device-id="${escapeHtml(device.id)}">
        <strong>${escapeHtml(device.title)}</strong>
        <span>Saldo ${escapeHtml(formatMoney(device.availableBalance))}</span>
        <span>Usado ${escapeHtml(formatMoney(device.pendingUsed))}</span>
        <span>Limite ${escapeHtml(formatMoney(device.balanceLimitCurrent))}</span>
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
          <p class="panel-head-sub">Se abren en una ventana, como en la app.</p>
        </div>
        <div class="history-icon-row">
          <button class="history-icon-button" type="button" data-action="open-history" data-device-id="${escapeHtml(device.id)}" data-history-type="recharges" title="Recargas">&#8635;</button>
          <button class="history-icon-button" type="button" data-action="open-history" data-device-id="${escapeHtml(device.id)}" data-history-type="purchases" title="Compras">&#128722;</button>
          <button class="history-icon-button" type="button" data-action="open-history" data-device-id="${escapeHtml(device.id)}" data-history-type="replacements" title="Reemplazos">&#8646;</button>
        </div>
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

  const productCards = PRODUCT_ORDER.map((productKey) => {
    const rule = getProductRule(productKey);
    if (!rule) {
      return "";
    }

    const count = getCardDisplayedCount(activeCard, productKey);
    const isBlocked = productKey === "epic" && isCooldownActive(activeCard);
    return `
      <div class="product-stat ${isBlocked ? "is-disabled" : ""}">
        <strong>${escapeHtml(rule.label)}</strong>
        <span>${escapeHtml(formatMoney(rule.amount))}${rule.maxCount ? ` · Max ${escapeHtml(rule.maxCount)}` : ""}</span>
        <div class="product-counter">
          <button type="button" data-action="update-product" data-device-id="${escapeHtml(device.id)}" data-card-id="${escapeHtml(activeCard.id)}" data-product-key="${escapeHtml(productKey)}" data-delta="-1">-</button>
          <div class="product-stat-count">${escapeHtml(count)}</div>
          <button type="button" data-action="update-product" data-device-id="${escapeHtml(device.id)}" data-card-id="${escapeHtml(activeCard.id)}" data-product-key="${escapeHtml(productKey)}" data-delta="1" ${isBlocked ? "disabled" : ""}>+</button>
        </div>
      </div>
    `;
  }).join("");

  return `
    <section class="cards-section">
      <h3>Tarjeta activa</h3>
      <article class="selected-card">
        <div class="selected-card-head">
          <div>
            <div class="status-row">
              <span class="card-label">${escapeHtml(activeCard.orderLabel || "Tarjeta activa")}</span>
              <span class="status-pill active">Activa</span>
              <span class="status-pill">${escapeHtml(activeCard.rejectedAt ? "Rechazada" : "Sin estado")}</span>
              ${cooldownLabel ? `<span class="status-pill active">${escapeHtml(cooldownLabel)}</span>` : ""}
            </div>
            <h3>${escapeHtml(numberText)}</h3>
            <p>Creada ${escapeHtml(formatDate(activeCard.createdAt))} · Vence ${escapeHtml(activeCard.expiry || "--")}</p>
          </div>
          <div class="inline-actions">
            <button type="button" data-action="unlock-sensitive" data-device-id="${escapeHtml(device.id)}">${escapeHtml(unlockLabel)}</button>
            <button type="button" data-action="edit-card" data-device-id="${escapeHtml(device.id)}" data-card-id="${escapeHtml(activeCard.id)}">Editar</button>
            <button type="button" data-action="replace-card" data-device-id="${escapeHtml(device.id)}" data-card-id="${escapeHtml(activeCard.id)}">Reemplazar</button>
            <button type="button" data-action="notes-card" data-device-id="${escapeHtml(device.id)}" data-card-id="${escapeHtml(activeCard.id)}">Notas</button>
            <button type="button" data-action="toggle-rejected" data-device-id="${escapeHtml(device.id)}" data-card-id="${escapeHtml(activeCard.id)}">Rechazado</button>
            <button type="button" data-action="toggle-cooldown" data-device-id="${escapeHtml(device.id)}" data-card-id="${escapeHtml(activeCard.id)}">24h</button>
          </div>
        </div>

        <div class="selected-card-grid">
          <div class="info-tile">
            <span>MM/YY</span>
            <strong>${escapeHtml(activeCard.expiry || "--")}</strong>
          </div>
          <div class="info-tile">
            <span>CVV</span>
            <strong>${escapeHtml(cvvText)}</strong>
          </div>
          <div class="info-tile">
            <span>Creada</span>
            <strong>${escapeHtml(formatDate(activeCard.createdAt))}</strong>
          </div>
          <div class="info-tile info-tile-wide">
            <span>Notas</span>
            <strong>${escapeHtml(activeCard.notes || "Sin notas")}</strong>
          </div>
        </div>

        <div class="product-stats-grid">
          ${productCards}
          <form class="product-stat custom-amount-form" data-action="custom-amount" data-device-id="${escapeHtml(device.id)}">
            <strong>Otro monto</strong>
            <span>Compra libre</span>
            <div class="compact-action-row">
              <input name="amount" type="number" min="0" step="0.01" placeholder="0.00" required>
              <button type="submit">Sumar</button>
            </div>
          </form>
        </div>
      </article>
    </section>
  `;
}

function renderCardCycle(device) {
  const cards = getVisibleCards(device);
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
        ${cards.map((card) => {
          const isActive = activeCard && card.id === activeCard.id;
          return `
            <article class="card-mini ${isActive ? "active is-cycle-active" : "is-cycle-inactive"}">
              <div class="status-row">
                <span class="card-label">${escapeHtml(card.orderLabel || "Tarjeta")}</span>
                <span class="status-pill ${isActive ? "active" : ""}">${escapeHtml(isActive ? "Activa" : "Inactiva")}</span>
              </div>
              <strong>**** ${escapeHtml(last4(card.number))}</strong>
              <span>Creada ${escapeHtml(formatDate(card.createdAt))}</span>
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
      <div>
        <h2>${escapeHtml(device.title)}</h2>
        <p>Saldo disponible ${escapeHtml(formatMoney(device.availableBalance))} · Saldo usado ${escapeHtml(formatMoney(device.pendingUsed))}</p>
      </div>
      <div class="meta-strip">
        <span>Ultima recarga ${escapeHtml(formatMoney(device.lastRechargeAmount || 0))}</span>
        <span>Fecha ${escapeHtml(formatDate(device.lastRechargeAt))}</span>
        <span>Limite actual ${escapeHtml(formatMoney(device.balanceLimitCurrent))}</span>
        <span>Tope fijo ${escapeHtml(formatMoney(state.constants.deviceBalanceCap))}</span>
      </div>
    </div>

    <section class="actions-grid control-actions-grid">
      <form class="action-card compact-action-card" data-action="recharge" data-device-id="${escapeHtml(device.id)}">
        <h3>Agregar saldo</h3>
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
      <div class="modal-backdrop" data-action="close-modal">
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
      <div class="modal-backdrop" data-action="close-modal">
        <div class="modal-card" data-stop-modal>
          <div class="modal-head">
            <div>
              <h3>${escapeHtml(modal.needsCreate ? "Crear PIN sensible" : "Desbloquear datos sensibles")}</h3>
              <p>${escapeHtml(modal.needsCreate ? "Crea un PIN local de 6 digitos para este navegador." : "Ingresa tu PIN de 6 digitos para ver numero y CVV por 30 segundos.")}</p>
            </div>
            <button class="modal-close" type="button" data-action="close-modal">&times;</button>
          </div>
          <form class="modal-form" data-action="submit-pin" data-device-id="${escapeHtml(modal.deviceId)}">
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

  if (modal.type === "edit-card" || modal.type === "replace-card") {
    modalRoot.innerHTML = `
      <div class="modal-backdrop" data-action="close-modal">
        <div class="modal-card" data-stop-modal>
          <div class="modal-head">
            <div>
              <h3>${escapeHtml(modal.title)}</h3>
              <p>Actualiza los datos clave de la tarjeta.</p>
            </div>
            <button class="modal-close" type="button" data-action="close-modal">&times;</button>
          </div>
          <form class="modal-form" data-action="${escapeHtml(modal.type)}" data-device-id="${escapeHtml(modal.deviceId)}" data-card-id="${escapeHtml(modal.cardId)}">
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
      <div class="modal-backdrop" data-action="close-modal">
        <div class="modal-card" data-stop-modal>
          <div class="modal-head">
            <div>
              <h3>${escapeHtml(modal.title)}</h3>
              <p>Guarda observaciones internas para la tarjeta activa.</p>
            </div>
            <button class="modal-close" type="button" data-action="close-modal">&times;</button>
          </div>
          <form class="modal-form" data-action="save-notes" data-device-id="${escapeHtml(modal.deviceId)}" data-card-id="${escapeHtml(modal.cardId)}">
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

document.addEventListener("click", async (event) => {
  const stopNode = event.target.closest("[data-stop-modal]");
  if (stopNode) {
    event.stopPropagation();
  }

  const button = event.target.closest("[data-action]");
  if (!button) {
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

document.addEventListener("submit", async (event) => {
  const form = event.target.closest("form[data-action]");
  if (!form) {
    return;
  }

  event.preventDefault();
  const { action } = form.dataset;
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
