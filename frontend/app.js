const deviceList = document.querySelector("#deviceList");
const detailView = document.querySelector("#detailView");
const reloadButton = document.querySelector("#reloadButton");
const connectionBadge = document.querySelector("#connectionBadge");
const themeToggle = document.querySelector("#themeToggle");
const tabControl = document.querySelector("#tabControl");
const tabSpeeches = document.querySelector("#tabSpeeches");
const sidebarTitle = document.querySelector("#sidebarTitle");

const state = {
  devices: [],
  speeches: {},
  constants: {
    deviceBalanceCap: 2750,
    productRules: [],
  },
  currentView: "control",
  selectedSpeechKey: "",
  selectedDeviceId: "",
  selectedCardIdByDevice: {},
  editingCardIdByDevice: {},
  replacingCardIdByDevice: {},
  notesCardIdByDevice: {},
  openedHistoryByDevice: {},
};

const THEME_STORAGE_KEY = "panel-compras-web-theme";

const fallbackProductRules = [
  { key: "epic", label: "Epic", amount: 79, maxCount: 6 },
  { key: "xbox", label: "Xbox", amount: 79, maxCount: 2 },
  { key: "nitro", label: "Nitro", amount: 104.99, maxCount: 3 },
  { key: "nitroYear", label: "Nitro 1 ano", amount: 1049.99, maxCount: 2 },
  { key: "crunchy", label: "Crunchy", amount: 89.9, maxCount: 0 },
];
const CARD_CYCLE_ORDERS = [1, 2, 3];

const currencyFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  minimumFractionDigits: 2,
});

function getProductRules() {
  return Array.isArray(state.constants.productRules) && state.constants.productRules.length
    ? state.constants.productRules
    : fallbackProductRules;
}

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

function formatDate(value) {
  if (!value) {
    return "--";
  }
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value) {
  if (!value) {
    return "--";
  }
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function maskCardNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) {
    return "****";
  }
  return `**** **** **** ${digits.slice(-4)}`;
}

function getStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" ? "light" : "dark";
  } catch (error) {
    return "dark";
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  if (themeToggle) {
    themeToggle.textContent = theme === "light" ? "Tema oscuro" : "Tema claro";
  }
}

function toggleTheme() {
  const nextTheme = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
  try {
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  } catch (error) {
    // ignore storage failures
  }
  applyTheme(nextTheme);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function findDevice(deviceId) {
  return state.devices.find((device) => device.id === deviceId);
}

function getCards(device) {
  return Array.isArray(device?.cards) ? device.cards.filter((card) => !card.archived) : [];
}

function getCycleCards(device) {
  const activeOrder = CARD_CYCLE_ORDERS.includes(Number(device?.activeCardOrder))
    ? Number(device.activeCardOrder)
    : CARD_CYCLE_ORDERS[0];
  const activeIndex = CARD_CYCLE_ORDERS.indexOf(activeOrder);

  return getCards(device)
    .filter((card) => CARD_CYCLE_ORDERS.includes(Number(card.order)))
    .sort((left, right) => {
      const leftIndex = CARD_CYCLE_ORDERS.indexOf(Number(left.order));
      const rightIndex = CARD_CYCLE_ORDERS.indexOf(Number(right.order));
      const shiftedLeft = (leftIndex - activeIndex + CARD_CYCLE_ORDERS.length) % CARD_CYCLE_ORDERS.length;
      const shiftedRight = (rightIndex - activeIndex + CARD_CYCLE_ORDERS.length) % CARD_CYCLE_ORDERS.length;
      return shiftedLeft - shiftedRight;
    });
}

function getActiveCard(device) {
  const activeOrder = CARD_CYCLE_ORDERS.includes(Number(device?.activeCardOrder))
    ? Number(device.activeCardOrder)
    : CARD_CYCLE_ORDERS[0];
  return getCards(device).find((card) => Number(card.order) === activeOrder) || getCycleCards(device)[0] || null;
}

function getArchivedCards(device) {
  return Array.isArray(device?.cards)
    ? device.cards.filter((card) => card.archived).sort((a, b) => String(b.resetAt || "").localeCompare(String(a.resetAt || "")))
    : [];
}

function getDisplayedCount(card, productKey) {
  return Number(card?.baseCounts?.[productKey] || 0) + Number(card?.counts?.[productKey] || 0);
}

function isCardCooldownActive(card) {
  return Boolean(card?.cooldownUntil) && new Date(card.cooldownUntil).getTime() > Date.now();
}

function formatCardStatus(card) {
  const parts = [];
  if (card?.rejectedAt) {
    parts.push("Rechazada");
  }
  if (isCardCooldownActive(card)) {
    parts.push(`24h hasta ${formatDateTime(card.cooldownUntil)}`);
  }
  return parts.join(" / ") || "Sin estado";
}

function getHistoryView(device) {
  return state.openedHistoryByDevice[device.id] || "recharges";
}

async function request(pathname, payload) {
  const options = payload
    ? {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    : undefined;

  const response = await fetch(pathname, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || "request-failed");
  }
  return data;
}

async function loadState() {
  connectionBadge.textContent = "Cargando...";
  const data = await request("/api/state");
  state.devices = Array.isArray(data.devices) ? data.devices : [];
  state.speeches = data.speeches && typeof data.speeches === "object" ? data.speeches : {};
  state.constants = data.constants || state.constants;

  if (!findDevice(state.selectedDeviceId)) {
    state.selectedDeviceId = state.devices[0]?.id || "";
  }

  state.devices.forEach((device) => {
    if (!state.selectedCardIdByDevice[device.id]) {
      state.selectedCardIdByDevice[device.id] = getCards(device)[0]?.id || "";
    }
    if (!state.openedHistoryByDevice[device.id]) {
      state.openedHistoryByDevice[device.id] = "none";
    }
  });

  connectionBadge.textContent = "Backend activo";
  render();
}

function getSpeechKeys() {
  return Object.keys(state.speeches || {});
}

function getSelectedSpeechKey() {
  const keys = getSpeechKeys();
  if (!keys.length) {
    return "";
  }
  if (keys.includes(state.selectedSpeechKey)) {
    return state.selectedSpeechKey;
  }
  state.selectedSpeechKey = keys[0];
  return state.selectedSpeechKey;
}

function renderDeviceList() {
  if (state.currentView === "speeches") {
    const keys = getSpeechKeys();
    if (!keys.length) {
      deviceList.innerHTML = '<div class="empty">No hay speeches.</div>';
      return;
    }

    deviceList.innerHTML = keys.map((key) => `
      <button class="device-item ${key === getSelectedSpeechKey() ? "active" : ""}" data-speech-key="${key}" type="button">
        <strong>${escapeHtml(key.toUpperCase())}</strong>
        <span>${state.speeches[key]?.primary ? "Texto principal listo" : "Sin texto principal"}</span>
        <span>${state.speeches[key]?.secondary ? "Texto secundario listo" : "Sin texto secundario"}</span>
      </button>
    `).join("");
    return;
  }

  if (!state.devices.length) {
    deviceList.innerHTML = '<div class="empty">No hay dispositivos.</div>';
    return;
  }

  deviceList.innerHTML = state.devices.map((device) => `
    <button class="device-item ${device.id === state.selectedDeviceId ? "active" : ""}" data-device-id="${device.id}" type="button">
      <strong>${escapeHtml(device.title)}</strong>
      <span>Saldo ${formatCurrency(device.availableBalance)}</span>
      <span>Usado ${formatCurrency(device.pendingUsed)}</span>
      <span>Limite ${formatCurrency(device.balanceLimitCurrent)}</span>
    </button>
  `).join("");
}

function renderHistoryList(items, emptyLabel, formatter) {
  if (!Array.isArray(items) || !items.length) {
    return `<div class="empty empty-inline">${emptyLabel}</div>`;
  }

  return `
    <div class="history-list">
      ${items.map((item) => formatter(item)).join("")}
    </div>
  `;
}

function renderRechargeHistory(device) {
  return renderHistoryList(
    device.rechargeHistory,
    "Todavia no hay recargas registradas.",
    (entry) => `
      <article class="history-item">
        <strong>${formatCurrency(entry.amount)}</strong>
        <span>${formatDateTime(entry.at)}</span>
        <span>Saldo despues ${formatCurrency(entry.balanceAfter)}</span>
        <span>Limite despues ${formatCurrency(entry.limitAfter)}</span>
      </article>
    `,
  );
}

function renderPurchaseHistory(device) {
  return renderHistoryList(
    device.purchaseHistory,
    "Todavia no hay compras descontadas.",
    (entry) => `
      <article class="history-item">
        <strong>${escapeHtml(entry.productName || "Compra")}</strong>
        <span>${formatCurrency(entry.amount)}</span>
        <span>${formatDateTime(entry.at)}</span>
        <span>${escapeHtml(entry.note || "Sin nota")}</span>
      </article>
    `,
  );
}

function renderReplacedCards(device) {
  return renderHistoryList(
    getArchivedCards(device),
    "Todavia no hay tarjetas reemplazadas.",
    (card) => `
      <article class="history-item">
        <strong>${escapeHtml(card.orderLabel)}</strong>
        <span>${escapeHtml(maskCardNumber(card.number))}</span>
        <span>Creada ${escapeHtml(card.createdAt)}</span>
        <span>Reemplazada ${formatDate(card.resetAt)}</span>
      </article>
    `,
  );
}

function renderHistoryPanel(device) {
  const opened = getHistoryView(device);
  return `
    <section class="history-section compact-panel">
      <div class="section-row">
        <div class="panel-head">
          <h3>Historiales</h3>
        </div>
        <div class="history-switch">
          <button class="${opened === "recharges" ? "active" : ""}" data-action="open-history" data-device-id="${device.id}" data-history="recharges" type="button">Recargas</button>
          <button class="${opened === "purchases" ? "active" : ""}" data-action="open-history" data-device-id="${device.id}" data-history="purchases" type="button">Compras</button>
          <button class="${opened === "replaced" ? "active" : ""}" data-action="open-history" data-device-id="${device.id}" data-history="replaced" type="button">Reemplazos</button>
        </div>
      </div>
      ${opened === "recharges" ? renderRechargeHistory(device) : ""}
      ${opened === "purchases" ? renderPurchaseHistory(device) : ""}
      ${opened === "replaced" ? renderReplacedCards(device) : ""}
      ${opened === "none" ? '<div class="empty empty-inline">Haz clic en una pestaña para ver el historial.</div>' : ""}
    </section>
  `;
}

function renderProductStat(card, rule, canInteract) {
  const displayed = getDisplayedCount(card, rule.key);
  const isEpicBlocked = rule.key === "epic" && (Boolean(card.rejectedAt) || isCardCooldownActive(card));
  const disabled = isEpicBlocked || !canInteract;
  return `
    <article class="product-stat ${disabled ? "is-disabled" : ""}">
      <strong>${escapeHtml(rule.label)}</strong>
      <span>${formatCurrency(rule.amount)}${rule.maxCount ? ` - Max ${rule.maxCount}` : ""}</span>
      <div class="product-counter">
        <button ${disabled ? "disabled" : ""} data-action="update-product" data-product-key="${rule.key}" data-delta="-1" type="button">-</button>
        <div class="product-stat-count">${displayed}</div>
        <button ${disabled ? "disabled" : ""} data-action="update-product" data-product-key="${rule.key}" data-delta="1" type="button">+</button>
      </div>
    </article>
  `;
}

function renderCustomAmountCard(device, canInteract) {
  return `
    <article class="product-stat custom-amount-stat ${canInteract ? "" : "is-disabled"}">
      <strong>Otro monto</strong>
      <span>Compra libre</span>
      <form class="custom-amount-form" data-action="custom-amount-form" data-device-id="${device.id}">
        <input name="amount" type="number" step="0.01" min="0" placeholder="0.00" ${canInteract ? "" : "disabled"}>
        <button type="submit" ${canInteract ? "" : "disabled"}>Agregar</button>
      </form>
    </article>
  `;
}

function renderCardSummary(device, card) {
  const status = formatCardStatus(card);
  const isActive = getActiveCard(device)?.id === card.id;
  return `
    <article class="card-mini ${isActive ? "active" : ""} ${isActive ? "is-cycle-active" : "is-cycle-inactive"}">
      <strong>${escapeHtml(card.orderLabel)}</strong>
      <span>${escapeHtml(maskCardNumber(card.number))}</span>
      <span>Creada ${escapeHtml(card.createdAt || "--")}</span>
      <span>${isActive ? "Activa en uso" : "Inactiva / solo lectura"}</span>
      <span>${escapeHtml(isActive ? status : "Se activara cuando vuelva su turno")}</span>
    </article>
  `;
}

function renderEditCardForm(device, card) {
  return `
    <form class="inline-form glass-form" data-action="edit-card-form" data-device-id="${device.id}" data-card-id="${card.id}">
      <div class="form-grid">
        <input name="number" type="text" value="${escapeHtml(card.number)}" placeholder="Tarjeta">
        <input name="expiry" type="text" value="${escapeHtml(card.expiry)}" placeholder="MM/YY">
        <input name="cvv" type="text" value="${escapeHtml(card.cvv)}" placeholder="CVV">
        <input name="createdAt" type="text" value="${escapeHtml(card.createdAt)}" placeholder="AAAA-MM-DD">
      </div>
      <button type="submit">Guardar tarjeta</button>
    </form>
  `;
}

function renderReplaceCardForm(device, card) {
  return `
    <form class="inline-form glass-form" data-action="replace-card-form" data-device-id="${device.id}" data-card-id="${card.id}">
      <div class="form-grid">
        <input name="number" type="text" placeholder="Nueva tarjeta">
        <input name="expiry" type="text" value="${escapeHtml(card.expiry)}" placeholder="MM/YY">
        <input name="cvv" type="text" value="${escapeHtml(card.cvv)}" placeholder="CVV">
        <input name="createdAt" type="text" value="${escapeHtml(card.createdAt)}" placeholder="AAAA-MM-DD">
      </div>
      <button type="submit">Guardar reemplazo</button>
    </form>
  `;
}

function renderNotesForm(device, card) {
  return `
    <form class="inline-form glass-form" data-action="notes-card-form" data-device-id="${device.id}" data-card-id="${card.id}">
      <textarea name="notes" rows="4" placeholder="Notas de la tarjeta">${escapeHtml(card.notes || "")}</textarea>
      <button type="submit">Guardar notas</button>
    </form>
  `;
}

function renderSelectedCard(device) {
  const card = getActiveCard(device);
  if (!card) {
    return '<div class="empty">No hay tarjeta activa.</div>';
  }

  const isEditing = state.editingCardIdByDevice[device.id] === card.id;
  const isReplacing = state.replacingCardIdByDevice[device.id] === card.id;
  const isNotesOpen = state.notesCardIdByDevice[device.id] === card.id;
  const statusText = formatCardStatus(card);

  return `
    <section class="selected-card is-cycle-active">
      <div class="selected-card-head">
        <div>
          <div class="status-row">
            <span class="card-label">${escapeHtml(card.orderLabel)}</span>
            <span class="status-pill active">Activa</span>
            <span class="status-pill ${statusText !== "Sin estado" ? "active" : ""}">${escapeHtml(statusText)}</span>
          </div>
          <h3>${escapeHtml(maskCardNumber(card.number))}</h3>
          <p>Creada ${escapeHtml(card.createdAt || "--")} · Vence ${escapeHtml(card.expiry || "--/--")}</p>
        </div>
        <div class="inline-actions">
          <button data-action="toggle-edit-card" data-device-id="${device.id}" data-card-id="${card.id}" type="button">Editar</button>
          <button data-action="toggle-replace-card" data-device-id="${device.id}" data-card-id="${card.id}" type="button">Reemplazar</button>
          <button data-action="toggle-card-notes" data-device-id="${device.id}" data-card-id="${card.id}" type="button">Notas</button>
          <button class="${card.rejectedAt ? "is-hot" : ""}" data-action="toggle-rejected" data-device-id="${device.id}" data-card-id="${card.id}" type="button">Rechazado</button>
          <button class="${isCardCooldownActive(card) ? "is-hot" : ""}" data-action="toggle-cooldown" data-device-id="${device.id}" data-card-id="${card.id}" type="button">24h</button>
        </div>
      </div>

      <div class="selected-card-grid">
        <article class="info-tile">
          <span>CVV</span>
          <strong>${escapeHtml(card.cvv || "--")}</strong>
        </article>
        <article class="info-tile">
          <span>Limite actual</span>
          <strong>${formatCurrency(device.balanceLimitCurrent)}</strong>
        </article>
        <article class="info-tile">
          <span>Tope fijo</span>
          <strong>${formatCurrency(state.constants.deviceBalanceCap)}</strong>
        </article>
        <article class="info-tile info-tile-wide">
          <span>Notas</span>
          <strong>${escapeHtml(card.notes || "Sin notas")}</strong>
        </article>
      </div>

      <div class="product-stats-grid">
        ${getProductRules().map((rule) => renderProductStat(card, rule, true)).join("")}
        ${renderCustomAmountCard(device, true)}
      </div>

      ${isEditing ? renderEditCardForm(device, card) : ""}
      ${isReplacing ? renderReplaceCardForm(device, card) : ""}
      ${isNotesOpen ? renderNotesForm(device, card) : ""}
    </section>
  `;
}

function renderCards(device) {
  const cards = getCycleCards(device);
  if (!cards.length) {
    return '<div class="empty">No hay tarjetas.</div>';
  }

  return `
    <section class="cards-section">
      <div class="panel-head">
        <h3>Tarjeta activa</h3>
      </div>
      ${renderSelectedCard(device)}
      <div class="panel-head panel-head-sub">
        <h3>Ciclo de tarjetas</h3>
      </div>
      <div class="cards-mini-grid">
        ${cards.map((card) => renderCardSummary(device, card)).join("")}
      </div>
    </section>
  `;
}

function renderSpeechesView() {
  const selectedKey = getSelectedSpeechKey();
  if (!selectedKey) {
    return '<div class="empty">No hay speeches cargados.</div>';
  }

  const speech = state.speeches[selectedKey] || { primary: "", secondary: "" };
  return `
    <section class="detail-head compact-panel">
      <div>
        <h2>${escapeHtml(selectedKey.toUpperCase())}</h2>
        <p>Edita los textos principal y secundario de este bloque.</p>
      </div>
      <div class="meta-strip">
        <span>${speech.primary ? "Principal listo" : "Principal vacio"}</span>
        <span>${speech.secondary ? "Secundario listo" : "Secundario vacio"}</span>
      </div>
    </section>

    <section class="selected-card speeches-panel">
      <form class="inline-form" data-action="speech-form" data-speech-key="${selectedKey}">
        <div class="speech-grid">
          <label class="speech-field">
            <span>Texto principal</span>
            <textarea name="primary" rows="12" placeholder="Bloque principal">${escapeHtml(speech.primary || "")}</textarea>
          </label>
          <label class="speech-field">
            <span>Texto secundario</span>
            <textarea name="secondary" rows="12" placeholder="Bloque secundario">${escapeHtml(speech.secondary || "")}</textarea>
          </label>
        </div>
        <button type="submit">Guardar speech</button>
      </form>
    </section>
  `;
}

function renderDetail() {
  if (state.currentView === "speeches") {
    detailView.innerHTML = renderSpeechesView();
    return;
  }

  const device = findDevice(state.selectedDeviceId);
  if (!device) {
    detailView.innerHTML = '<div class="empty">Selecciona un dispositivo.</div>';
    return;
  }

  detailView.innerHTML = `
    <section class="detail-head compact-panel">
      <div>
        <h2>${escapeHtml(device.title)}</h2>
        <p>Saldo disponible ${formatCurrency(device.availableBalance)} · Saldo usado ${formatCurrency(device.pendingUsed)}</p>
      </div>
      <div class="meta-strip">
        <span>Ultima recarga ${device.lastRechargeAmount ? formatCurrency(device.lastRechargeAmount) : "--"}</span>
        <span>Fecha ${device.lastRechargeAt || "--"}</span>
        <span>Limite actual ${formatCurrency(device.balanceLimitCurrent)}</span>
        <span>Tope fijo ${formatCurrency(state.constants.deviceBalanceCap)}</span>
      </div>
    </section>

    <section class="actions-grid compact-actions-grid">
      <form class="action-card compact-action-card" data-action="recharge-form">
        <h3>Agregar saldo</h3>
        <div class="compact-action-row">
          <input name="amount" type="number" step="0.01" min="0" placeholder="Monto de recarga">
          <button type="submit">Agregar</button>
        </div>
      </form>

      <form class="action-card compact-action-card" data-action="pending-form">
        <h3>Saldo usado</h3>
        <div class="compact-action-row">
          <input name="amount" type="number" step="0.01" min="0" placeholder="Monto usado">
          <button type="submit">Sumar usado</button>
        </div>
      </form>

      <div class="action-card compact-action-card deduct-card">
        <h3>Descuento final</h3>
        <p>Descarga el saldo usado al historial.</p>
        <button data-action="deduct-pending" type="button">Restar saldo usado</button>
      </div>
    </section>

    ${renderHistoryPanel(device)}
    ${renderCards(device)}
  `;
}

function render() {
  if (sidebarTitle) {
    sidebarTitle.textContent = state.currentView === "speeches" ? "Speeches" : "Dispositivos";
  }
  tabControl?.classList.toggle("active", state.currentView === "control");
  tabSpeeches?.classList.toggle("active", state.currentView === "speeches");
  renderDeviceList();
  renderDetail();
}

async function refreshAndKeepSelection() {
  const selectedDeviceId = state.selectedDeviceId;
  const selectedCardId = selectedDeviceId ? state.selectedCardIdByDevice[selectedDeviceId] : "";
  await loadState();
  if (selectedDeviceId && findDevice(selectedDeviceId)) {
    state.selectedDeviceId = selectedDeviceId;
  }
  if (selectedDeviceId && selectedCardId) {
    state.selectedCardIdByDevice[selectedDeviceId] = selectedCardId;
  }
  render();
}

function openOnly(deviceId, slot, cardId) {
  state.editingCardIdByDevice[deviceId] = slot === "edit" ? cardId : "";
  state.replacingCardIdByDevice[deviceId] = slot === "replace" ? cardId : "";
  state.notesCardIdByDevice[deviceId] = slot === "notes" ? cardId : "";
}

deviceList.addEventListener("click", (event) => {
  const speechButton = event.target.closest("[data-speech-key]");
  if (speechButton) {
    state.selectedSpeechKey = speechButton.dataset.speechKey;
    render();
    return;
  }

  const button = event.target.closest("[data-device-id]");
  if (!button) {
    return;
  }
  state.selectedDeviceId = button.dataset.deviceId;
  render();
});

detailView.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target.closest("form[data-action]");
  if (!form) {
    return;
  }

  const device = findDevice(form.dataset.deviceId || state.selectedDeviceId);
  if (!device) {
    return;
  }

  try {
    if (form.dataset.action === "recharge-form") {
      const amount = Number(form.elements.amount?.value || 0);
      await request(`/api/devices/${device.id}/recharge`, { amount });
      connectionBadge.textContent = "Saldo agregado";
    }

    if (form.dataset.action === "pending-form") {
      const amount = Number(form.elements.amount?.value || 0);
      await request(`/api/devices/${device.id}/pending-used`, { amount });
      connectionBadge.textContent = "Saldo usado";
    }

    if (form.dataset.action === "custom-amount-form") {
      const amount = Number(form.elements.amount?.value || 0);
      await request(`/api/devices/${device.id}/pending-used`, { amount });
      connectionBadge.textContent = "Otro monto agregado";
    }

    if (form.dataset.action === "edit-card-form") {
      await request(`/api/devices/${device.id}/cards/${form.dataset.cardId}/update`, {
        number: form.elements.number?.value,
        expiry: form.elements.expiry?.value,
        cvv: form.elements.cvv?.value,
        createdAt: form.elements.createdAt?.value,
      });
      openOnly(device.id, "", "");
      connectionBadge.textContent = "Tarjeta actualizada";
    }

    if (form.dataset.action === "notes-card-form") {
      await request(`/api/devices/${device.id}/cards/${form.dataset.cardId}/notes`, {
        notes: form.elements.notes?.value,
      });
      openOnly(device.id, "", "");
      connectionBadge.textContent = "Notas guardadas";
    }

    if (form.dataset.action === "replace-card-form") {
      await request(`/api/devices/${device.id}/cards/${form.dataset.cardId}/replace`, {
        number: form.elements.number?.value,
        expiry: form.elements.expiry?.value,
        cvv: form.elements.cvv?.value,
        createdAt: form.elements.createdAt?.value,
      });
      openOnly(device.id, "", "");
      connectionBadge.textContent = "Tarjeta reemplazada";
    }

    if (form.dataset.action === "speech-form") {
      await request(`/api/speeches/${form.dataset.speechKey}`, {
        primary: form.elements.primary?.value || "",
        secondary: form.elements.secondary?.value || "",
      });
      connectionBadge.textContent = "Speech guardado";
    }

    await refreshAndKeepSelection();
  } catch (error) {
    connectionBadge.textContent = "Error";
  }
});

detailView.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) {
    return;
  }

  const device = findDevice(button.dataset.deviceId || state.selectedDeviceId);
  if (!device) {
    return;
  }

  const action = button.dataset.action;

  if (action === "toggle-edit-card") {
    const nextCardId = state.editingCardIdByDevice[device.id] === button.dataset.cardId ? "" : button.dataset.cardId;
    openOnly(device.id, nextCardId ? "edit" : "", nextCardId);
    render();
    return;
  }

  if (action === "toggle-replace-card") {
    const nextCardId = state.replacingCardIdByDevice[device.id] === button.dataset.cardId ? "" : button.dataset.cardId;
    openOnly(device.id, nextCardId ? "replace" : "", nextCardId);
    render();
    return;
  }

  if (action === "toggle-card-notes") {
    const nextCardId = state.notesCardIdByDevice[device.id] === button.dataset.cardId ? "" : button.dataset.cardId;
    openOnly(device.id, nextCardId ? "notes" : "", nextCardId);
    render();
    return;
  }

  if (action === "open-history") {
    const nextHistory = button.dataset.history || "recharges";
    state.openedHistoryByDevice[device.id] = state.openedHistoryByDevice[device.id] === nextHistory ? "none" : nextHistory;
    render();
    return;
  }

  try {
    if (action === "deduct-pending") {
      await request(`/api/devices/${device.id}/deduct-pending`, {});
      await refreshAndKeepSelection();
      connectionBadge.textContent = "Descontado";
      return;
    }

    if (action === "toggle-rejected") {
      await request(`/api/devices/${device.id}/cards/${button.dataset.cardId}/toggle-rejected`, {});
      await refreshAndKeepSelection();
      connectionBadge.textContent = "Estado actualizado";
      return;
    }

    if (action === "toggle-cooldown") {
      await request(`/api/devices/${device.id}/cards/${button.dataset.cardId}/toggle-cooldown`, {});
      await refreshAndKeepSelection();
      connectionBadge.textContent = "24h actualizado";
      return;
    }

    if (action === "update-product") {
      const activeCard = getActiveCard(device);
      if (!activeCard) {
        return;
      }
      await request(`/api/devices/${device.id}/cards/${activeCard.id}/product`, {
        productKey: button.dataset.productKey,
        delta: Number(button.dataset.delta || 0),
      });
      await refreshAndKeepSelection();
      connectionBadge.textContent = "Compra actualizada";
    }
  } catch (error) {
    connectionBadge.textContent = "Error";
  }
});

reloadButton?.addEventListener("click", () => {
  loadState().catch(() => {
    connectionBadge.textContent = "Error";
  });
});

themeToggle?.addEventListener("click", toggleTheme);
tabControl?.addEventListener("click", () => {
  state.currentView = "control";
  render();
});
tabSpeeches?.addEventListener("click", () => {
  state.currentView = "speeches";
  render();
});

applyTheme(getStoredTheme());

loadState().catch(() => {
  connectionBadge.textContent = "Sin backend";
  detailView.innerHTML = '<div class="empty">No se pudo conectar con el backend.</div>';
});
