import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Boxes,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Gauge,
  Landmark,
  Layers,
  LogOut,
  Loader2,
  Menu,
  Plus,
  ReceiptText,
  Trash2,
  TrendingUp,
  UserPlus,
  Users,
  WalletCards,
  Wrench,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const defaultSettings = {
  shopOwner: "RIGO DEISON AGUDELO",
  shopId: "C.C 1128465459",
  shopAddress: "CALLE 39#106-19",
  shopPhone: "3147992155",
  shopEmail: "ridod4527@gmail.com",
  shopBank: "Cuenta ahorros Bancolombia No 91237651460",
};

const emptyInvoiceItem = { description: "", discount: 0, quantity: 0, price: 0 };
const views = {
  dashboard: "dashboard",
  invoices: "invoices",
  invoiceForm: "invoiceForm",
  orders: "orders",
  orderForm: "orderForm",
  inventory: "inventory",
  settings: "settings",
  statistics: "statistics",
  users: "users",
};

const adminOnlyViews = [views.invoices, views.invoiceForm, views.settings, views.statistics, views.users];
const masterLogoSrc = "/master-motos-logo.jpeg";

const orderStatuses = [
  ["received", "Recibida"],
  ["working", "En taller"],
  ["ready", "Lista"],
  ["invoiced", "Facturada"],
];

function orderStatusLabel(status) {
  return orderStatuses.find(([value]) => value === status)?.[1] || "Recibida";
}

function findInvoiceForOrder(order, invoices) {
  return invoices.find((invoice) =>
    (order.invoiceNumber && Number(invoice.invoiceNumber) === Number(order.invoiceNumber)) ||
    (order.id && invoice.sourceOrderId === order.id) ||
    (order.orderNumber && Number(invoice.sourceOrderNumber) === Number(order.orderNumber)),
  );
}

function orderBillingState(order, invoices) {
  const relatedInvoice = findInvoiceForOrder(order, invoices);

  if (!relatedInvoice) {
    if ((order.status || "received") !== "invoiced") {
      return {
        className: `status-${order.status || "received"}`,
        label: orderStatusLabel(order.status),
      };
    }

    return {
      className: "status-ready",
      label: "Por facturar",
      invoiceNumber: "",
      paymentInfo: "",
    };
  }

  const balance = Number(relatedInvoice?.totals?.balance) || 0;
  const invoiceNumber = relatedInvoice?.invoiceNumber;
  if (balance > 0) {
    return {
      className: "status-due",
      label: `Facturada - Debe ${formatMoney(balance)}`,
      invoiceNumber,
      paymentInfo: `Falta por pagar ${formatMoney(balance)}`,
    };
  }

  return {
    className: "status-paid",
    label: "Facturada - Pagada",
    invoiceNumber,
    paymentInfo: "",
  };
}

const currency = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

function formatMoney(value) {
  return currency.format(Number(value) || 0);
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function formatNumberInput(value) {
  const digits = onlyDigits(value);
  return digits ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "";
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function createId(prefix = "item") {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizePlate(value) {
  return String(value || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 6);
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function partDisplayName(part) {
  return `${part.name} -- ${part.code}`;
}

function printableItemName(description) {
  return String(description || "").split(" -- ")[0].trim();
}

function nextInvoiceNumber(invoices, meta) {
  const stored = Number(meta.nextInvoiceNumber);
  const maxSaved = invoices.reduce(
    (max, invoice) => Math.max(max, Number(invoice.invoiceNumber) || 0),
    0,
  );
  return Math.max(stored || 1, maxSaved + 1, 1);
}

function nextOrderNumber(orders, meta) {
  const stored = Number(meta.nextOrderNumber);
  const maxSaved = orders.reduce(
    (max, order) => Math.max(max, Number(order.orderNumber) || 0),
    0,
  );
  return Math.max(stored || 1, maxSaved + 1, 1);
}

function makeInvoice(number) {
  return {
    id: "",
    invoiceNumber: number,
    invoiceDate: today(),
    dueDate: today(),
    paymentMethod: "efectivo",
    customerName: "",
    customerId: "",
    customerPhone: "",
    customerAddress: "",
    motorcycle: "",
    plate: "",
    note: "",
    observations: "",
    items: [{ ...emptyInvoiceItem }],
    payments: [],
    paymentAmount: "",
    paymentDate: today(),
    sourceOrderId: "",
    sourceOrderNumber: "",
  };
}

function makeOrder(number) {
  return {
    id: "",
    orderNumber: number,
    orderDate: today(),
    attendant: "",
    customerName: "",
    customerPhone: "",
    motorcycle: "",
    plate: "",
    reason: "",
    observations: "",
    status: "received",
    invoiceNumber: "",
    invoicedAt: "",
  };
}

function makePart() {
  return { id: "", code: "", name: "", price: 0, stock: 0 };
}

function calculateItem(item) {
  const quantity = Number(item.quantity) || 0;
  const price = Number(item.price) || 0;
  const discount = Number(item.discount) || 0;
  return Math.max(quantity * price - discount, 0);
}

function normalizePayments(invoice) {
  if (Array.isArray(invoice.payments)) {
    return invoice.payments
      .map((payment) => ({
        id: payment.id || createId("payment"),
        date: payment.date || invoice.invoiceDate || today(),
        amount: Number(payment.amount) || 0,
      }))
      .filter((payment) => payment.amount > 0);
  }

  const legacyAmount = Number(invoice.payments || invoice.totals?.payments) || 0;
  if (!legacyAmount) return [];
  return [{
    id: "legacy-payment",
    date: invoice.invoiceDate || String(invoice.createdAt || "").slice(0, 10) || today(),
    amount: legacyAmount,
  }];
}

function paymentTotal(payments) {
  return (Array.isArray(payments) ? payments : []).reduce(
    (sum, payment) => sum + (Number(payment.amount) || 0),
    0,
  );
}

function paymentSummary(invoice) {
  const payments = normalizePayments(invoice);
  return {
    first: payments[0] || null,
    last: payments.at(-1) || null,
    total: paymentTotal(payments),
  };
}

function calculateTotals(items, payments) {
  const subtotal = items.reduce((sum, item) => sum + calculateItem(item), 0);
  const paid = paymentTotal(payments);
  return {
    subtotal,
    payments: paid,
    total: subtotal,
    balance: Math.max(subtotal - paid, 0),
  };
}

function invoiceFromStored(invoice) {
  return {
    ...makeInvoice(invoice.invoiceNumber || 1),
    ...invoice,
    payments: normalizePayments(invoice),
    paymentAmount: "",
    paymentDate: today(),
    items: invoice.items?.length ? invoice.items : [{ ...emptyInvoiceItem }],
  };
}

function orderFromStored(order) {
  return { ...makeOrder(order.orderNumber || 1), ...order };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const monthShortNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// Cuantos registros se pintan de una en las listas largas antes de "Mostrar mas".
const LIST_PAGE_SIZE = 40;

const statsPeriods = [
  ["day", "Diario"],
  ["week", "Semanal"],
  ["month", "Mensual"],
  ["year", "Anual"],
];

const WORKSHOP_TIMEZONE = "America/Bogota";

function parseLocalDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function nowInWorkshopTimezone() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: WORKSHOP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return new Date(
    Number(lookup.year),
    Number(lookup.month) - 1,
    Number(lookup.day),
    Number(lookup.hour) % 24,
    Number(lookup.minute),
    Number(lookup.second),
  );
}

function startOfWeek(date) {
  const result = new Date(date);
  const day = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - day);
  return result;
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function bucketKeyFor(date, granularity) {
  if (granularity === "day") return formatDateKey(date);
  if (granularity === "week") return formatDateKey(startOfWeek(date));
  if (granularity === "month") return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  return String(date.getFullYear());
}

function bucketLabelFor(key, granularity) {
  if (granularity === "year") return key;
  if (granularity === "month") {
    const [year, month] = key.split("-");
    return `${monthShortNames[Number(month) - 1]} ${year.slice(2)}`;
  }
  const date = new Date(`${key}T00:00:00`);
  return `${date.getDate()} ${monthShortNames[date.getMonth()]}`;
}

function formatBucketRangeLabel(key, granularity) {
  if (granularity === "year") return key;
  if (granularity === "month") {
    const [year, month] = key.split("-");
    return `${monthShortNames[Number(month) - 1]} ${year}`;
  }
  if (granularity === "day") {
    const date = new Date(`${key}T00:00:00`);
    return `${date.getDate()} ${monthShortNames[date.getMonth()]}`;
  }
  const start = new Date(`${key}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startLabel = `${start.getDate()} ${monthShortNames[start.getMonth()]}`;
  const endLabel = `${end.getDate()} ${monthShortNames[end.getMonth()]}`;
  return `${startLabel} - ${endLabel}`;
}

function shiftBucket(date, granularity, amount) {
  const result = new Date(date);
  if (granularity === "day") result.setDate(result.getDate() + amount);
  else if (granularity === "week") result.setDate(result.getDate() + amount * 7);
  else if (granularity === "month") result.setMonth(result.getMonth() + amount);
  else result.setFullYear(result.getFullYear() + amount);
  return result;
}

function buildPeriodBreakdown(granularity, anchorDate) {
  if (granularity === "day") {
    const key = formatDateKey(anchorDate);
    return {
      subGranularity: "day",
      buckets: [{ key, label: bucketLabelFor(key, "day"), rangeLabel: formatBucketRangeLabel(key, "day") }],
    };
  }
  if (granularity === "week") {
    const start = startOfWeek(anchorDate);
    const buckets = [];
    for (let i = 0; i < 7; i += 1) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const key = formatDateKey(date);
      buckets.push({ key, label: bucketLabelFor(key, "day"), rangeLabel: formatBucketRangeLabel(key, "day") });
    }
    return { subGranularity: "day", buckets };
  }
  if (granularity === "month") {
    const year = anchorDate.getFullYear();
    const month = anchorDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const buckets = [];
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      const key = formatDateKey(date);
      buckets.push({ key, label: String(day), rangeLabel: formatBucketRangeLabel(key, "day") });
    }
    return { subGranularity: "day", buckets };
  }
  const year = anchorDate.getFullYear();
  const buckets = [];
  for (let month = 0; month < 12; month += 1) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}`;
    buckets.push({ key, label: monthShortNames[month], rangeLabel: formatBucketRangeLabel(key, "month") });
  }
  return { subGranularity: "month", buckets };
}

function aggregateByBucket(records, dateField, granularity, buckets, valueFn) {
  const totals = new Map(buckets.map((bucket) => [bucket.key, 0]));
  for (const record of records) {
    const date = parseLocalDate(record[dateField]);
    if (!date) continue;
    const key = bucketKeyFor(date, granularity);
    if (totals.has(key)) totals.set(key, totals.get(key) + valueFn(record));
  }
  return buckets.map((bucket) => ({
    label: bucket.label,
    rangeLabel: bucket.rangeLabel,
    value: totals.get(bucket.key) || 0,
  }));
}

async function loadStorage() {
  const response = await fetch("/api/data", { cache: "no-store", credentials: "same-origin" });
  if (response.status === 401) throw new AuthRequiredError();
  if (!response.ok) throw new Error("No se pudo leer la base local.");
  return response.json();
}

async function persistStorage(payload) {
  const response = await fetch("/api/data", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (response.status === 401) throw new AuthRequiredError();
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "No se pudo guardar en la base de datos.");
  }
}

class AuthRequiredError extends Error {
  constructor() {
    super("Tu sesion expiro. Vuelve a iniciar sesion.");
  }
}

async function fetchAuthStatus() {
  const response = await fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin" });
  return response.json();
}

async function loginRequest(username, password) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "No se pudo iniciar sesion.");
  return data;
}

async function logoutRequest() {
  await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
}

export default function App() {
  const [activeView, setActiveView] = useState(views.dashboard);
  const [storageReady, setStorageReady] = useState(false);
  const [authStatus, setAuthStatus] = useState("checking");
  const [authDisplayName, setAuthDisplayName] = useState("");
  const [role, setRole] = useState("admin");
  const [loginError, setLoginError] = useState("");
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [orders, setOrders] = useState([]);
  const [parts, setParts] = useState([]);
  const [settings, setSettings] = useState(defaultSettings);
  const [meta, setMeta] = useState({});
  const [invoice, setInvoice] = useState(makeInvoice(1));
  const [invoiceBaseline, setInvoiceBaseline] = useState(makeInvoice(1));
  const [invoiceRecordExists, setInvoiceRecordExists] = useState(false);
  const [order, setOrder] = useState(makeOrder(1));
  const [orderBaseline, setOrderBaseline] = useState(makeOrder(1));
  const [orderRecordExists, setOrderRecordExists] = useState(false);
  const [partForm, setPartForm] = useState(makePart());
  const [users, setUsers] = useState([]);
  const [partFormBaseline, setPartFormBaseline] = useState(makePart());
  const [settingsBaseline, setSettingsBaseline] = useState({ settings: defaultSettings, nextInvoiceNumber: undefined });
  const [historyQuery, setHistoryQuery] = useState("");
  const [orderQuery, setOrderQuery] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [inventoryQuery, setInventoryQuery] = useState("");
  const [printMarkup, setPrintMarkup] = useState("");
  const [savePrompt, setSavePrompt] = useState(null);
  const [quickPayment, setQuickPayment] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem("masterMotosSidebarCollapsed") === "true",
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [savingAction, setSavingAction] = useState(null);

  const currentInvoiceNumber = useMemo(
    () => nextInvoiceNumber(invoices, meta),
    [invoices, meta],
  );
  const currentOrderNumber = useMemo(() => nextOrderNumber(orders, meta), [orders, meta]);
  const invoiceTotals = useMemo(
    () => calculateTotals(invoice.items, invoice.payments),
    [invoice.items, invoice.payments],
  );

  const invoiceIsDirty = useMemo(
    () => JSON.stringify(invoice) !== JSON.stringify(invoiceBaseline),
    [invoice, invoiceBaseline],
  );
  const orderIsDirty = useMemo(
    () => JSON.stringify(order) !== JSON.stringify(orderBaseline),
    [order, orderBaseline],
  );
  const partFormIsDirty = useMemo(
    () => JSON.stringify(partForm) !== JSON.stringify(partFormBaseline),
    [partForm, partFormBaseline],
  );
  const settingsIsDirty = useMemo(
    () => JSON.stringify({ settings, nextInvoiceNumber: meta.nextInvoiceNumber }) !== JSON.stringify(settingsBaseline),
    [settings, meta.nextInvoiceNumber, settingsBaseline],
  );

  function isCurrentViewDirty() {
    if (activeView === views.orderForm) return orderIsDirty;
    if (activeView === views.invoiceForm) return invoiceIsDirty;
    if (activeView === views.inventory) return partFormIsDirty;
    if (activeView === views.settings) return settingsIsDirty;
    return false;
  }

  function showAlert(message) {
    return new Promise((resolve) => {
      setDialog({ kind: "alert", message, resolve });
    });
  }

  function showConfirm(message) {
    return new Promise((resolve) => {
      setDialog({ kind: "confirm", message, resolve });
    });
  }

  function resolveDialog(result) {
    if (dialog) dialog.resolve(result);
    setDialog(null);
  }

  async function confirmDiscard(isDirty) {
    return !isDirty || (await showConfirm("Tienes cambios sin guardar. Deseas continuar sin guardarlos?"));
  }

  useEffect(() => {
    function handleBeforeUnload(event) {
      if (!isCurrentViewDirty()) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  });

  const dataPayload = (next = {}) => ({
    invoices: next.invoices ?? invoices,
    orders: next.orders ?? orders,
    parts: next.parts ?? parts,
    settings: next.settings ?? settings,
    meta: next.meta ?? meta,
  });

  function loadInitialData() {
    loadStorage()
      .then((data) => {
        const loadedInvoices = (Array.isArray(data.invoices) ? data.invoices : [])
          .sort((a, b) => Number(b.invoiceNumber) - Number(a.invoiceNumber));
        const loadedOrders = (Array.isArray(data.orders) ? data.orders : [])
          .sort((a, b) => Number(b.orderNumber) - Number(a.orderNumber));
        const loadedParts = Array.isArray(data.parts) ? data.parts : [];
        const loadedMeta = data.meta || {};
        setInvoices(loadedInvoices);
        setOrders(loadedOrders);
        setParts(loadedParts);
        const loadedSettings = data.settings || defaultSettings;
        setSettings(loadedSettings);
        setMeta(loadedMeta);
        const freshInvoice = makeInvoice(nextInvoiceNumber(loadedInvoices, loadedMeta));
        setInvoice(freshInvoice);
        setInvoiceBaseline(freshInvoice);
        setInvoiceRecordExists(false);
        const freshOrder = makeOrder(nextOrderNumber(loadedOrders, loadedMeta));
        setOrder(freshOrder);
        setOrderBaseline(freshOrder);
        setOrderRecordExists(false);
        setSettingsBaseline({ settings: loadedSettings, nextInvoiceNumber: loadedMeta.nextInvoiceNumber });
        setPartFormBaseline(makePart());
        setStorageReady(true);
      })
      .catch((error) => {
        if (error instanceof AuthRequiredError) {
          setAuthStatus("required");
          return;
        }
        showAlert("Abre el aplicativo con npm start. Asi puede guardar y leer la base de datos.");
        setInvoice(makeInvoice(1));
        setOrder(makeOrder(1));
      });
  }

  useEffect(() => {
    fetchAuthStatus()
      .then((data) => {
        if (!data.authRequired) {
          setAuthStatus("disabled");
          loadInitialData();
          return;
        }
        if (data.ok) {
          setAuthDisplayName(data.displayName || data.username || "");
          setRole(data.role || "admin");
          setAuthStatus("authenticated");
          loadInitialData();
          return;
        }
        setAuthStatus("required");
      })
      .catch(() => setAuthStatus("required"));
  }, []);

  useEffect(() => {
    if (role !== "admin" && adminOnlyViews.includes(activeView)) {
      setActiveView(views.dashboard);
    }
  }, [role, activeView]);

  useEffect(() => {
    if (activeView === views.users && role === "admin") {
      loadUsers().catch((error) => handleActionError(error, "No se pudo cargar la lista de usuarios"));
    }
  }, [activeView, role]);

  function handleActionError(error, contextMessage) {
    if (error instanceof AuthRequiredError) {
      setAuthStatus("required");
      return;
    }
    showAlert(`${contextMessage}: ${error.message}`);
  }

  async function runSavingAction(key, action, errorContext) {
    setSavingAction(key);
    try {
      return await action();
    } catch (error) {
      handleActionError(error, errorContext);
      return null;
    } finally {
      setSavingAction(null);
    }
  }

  async function handleLogin(username, password) {
    setLoginSubmitting(true);
    setLoginError("");
    try {
      const data = await loginRequest(username, password);
      setAuthDisplayName(data.displayName || data.username || username);
      setRole(data.role || "admin");
      setAuthStatus("authenticated");
      loadInitialData();
    } catch (error) {
      setLoginError(error.message);
    } finally {
      setLoginSubmitting(false);
    }
  }

  async function handleLogout() {
    await logoutRequest();
    setAuthDisplayName("");
    setRole("admin");
    setAuthStatus("required");
    setStorageReady(false);
    setInvoices([]);
    setOrders([]);
    setParts([]);
  }

  useEffect(() => {
    localStorage.setItem("masterMotosSidebarCollapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  async function showView(view) {
    if (view === activeView) return;
    if (!(await confirmDiscard(isCurrentViewDirty()))) return;
    setActiveView(view);
  }

  async function startNewInvoice() {
    if (!(await confirmDiscard(invoiceIsDirty))) return;
    const fresh = makeInvoice(currentInvoiceNumber);
    setInvoice(fresh);
    setInvoiceBaseline(fresh);
    setInvoiceRecordExists(false);
    setActiveView(views.invoiceForm);
  }

  async function startNewOrder() {
    if (!(await confirmDiscard(orderIsDirty))) return;
    const fresh = makeOrder(currentOrderNumber);
    setOrder(fresh);
    setOrderBaseline(fresh);
    setOrderRecordExists(false);
    setActiveView(views.orderForm);
  }

  async function openOrder(sourceOrder) {
    if (!(await confirmDiscard(orderIsDirty))) return;
    const loaded = orderFromStored(sourceOrder);
    setOrder(loaded);
    setOrderBaseline(loaded);
    setOrderRecordExists(true);
    setActiveView(views.orderForm);
  }

  async function openInvoice(sourceInvoice) {
    if (!(await confirmDiscard(invoiceIsDirty))) return;
    const loaded = invoiceFromStored(sourceInvoice);
    setInvoice(loaded);
    setInvoiceBaseline(loaded);
    setInvoiceRecordExists(true);
    setActiveView(views.invoiceForm);
  }

  async function startInvoiceFromOrder(sourceOrder) {
    if (!(await confirmDiscard(invoiceIsDirty))) return;
    const orderData = orderFromStored(sourceOrder);
    const fresh = {
      ...makeInvoice(currentInvoiceNumber),
      sourceOrderId: orderData.id,
      sourceOrderNumber: orderData.orderNumber,
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      motorcycle: orderData.motorcycle,
      plate: orderData.plate,
      note: `Ingreso No. ${orderData.orderNumber}`,
      observations: orderData.observations,
      items: [{
        description: orderData.reason,
        discount: 0,
        quantity: 1,
        price: 0,
      }],
    };
    setInvoice(fresh);
    setInvoiceBaseline(fresh);
    setInvoiceRecordExists(false);
    setActiveView(views.invoiceForm);
  }

  async function openInvoiceFromOrder(sourceOrder) {
    const relatedInvoice = findInvoiceForOrder(sourceOrder, invoices);
    if (relatedInvoice) {
      await openInvoice(relatedInvoice);
      return;
    }
    await startInvoiceFromOrder(sourceOrder);
  }

  function updateInvoiceField(name, value) {
    setInvoice((current) => {
      const next = {
        ...current,
        [name]: name === "plate" ? normalizePlate(value) : value,
      };
      if (name === "invoiceDate" && !current.dueDate) next.dueDate = value;
      return next;
    });
  }

  function findPartByEntry(value) {
    const normalized = normalizeText(value);
    if (!normalized) return null;
    return (
      parts.find((item) => normalizeText(partDisplayName(item)) === normalized) ||
      parts.find((item) => normalizeText(item.code) === normalized) ||
      parts.find((item) => normalizeText(item.name) === normalized) ||
      null
    );
  }

  function updateInvoiceItem(index, field, value) {
    setInvoice((current) => {
      const items = current.items.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const nextItem = { ...item, [field]: value };
        if (field === "description") {
          const matched = findPartByEntry(value);
          if (matched) {
            nextItem.description = partDisplayName(matched);
            if (Number(nextItem.quantity) === 0) nextItem.quantity = 1;
            if (Number(nextItem.price) === 0) nextItem.price = matched.price;
          }
        }
        return nextItem;
      });
      return { ...current, items };
    });
  }

  function addInvoiceItem() {
    setInvoice((current) => ({
      ...current,
      items: [...current.items, { ...emptyInvoiceItem }],
    }));
  }

  function removeInvoiceItem(index) {
    setInvoice((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  async function addInvoicePayment() {
    const amount = Number(invoice.paymentAmount) || 0;
    const currentPayments = normalizePayments(invoice);
    const totals = calculateTotals(invoice.items, currentPayments);
    if (amount <= 0) {
      await showAlert("Ingresa un valor de pago mayor a cero.");
      return;
    }
    if (totals.total <= 0) {
      await showAlert("Agrega primero un valor a la factura antes de registrar pagos.");
      return;
    }
    if (totals.balance <= 0) {
      await showAlert("La factura ya esta pagada. No se pueden registrar mas pagos.");
      return;
    }
    if (amount > totals.balance) {
      await showAlert(`El pago no puede superar el saldo pendiente de ${formatMoney(totals.balance)}.`);
      return;
    }
    setInvoice((current) => ({
      ...current,
      payments: [
        ...normalizePayments(current),
        {
          id: createId("payment"),
          date: current.paymentDate || today(),
          amount,
        },
      ],
      paymentAmount: "",
      paymentDate: current.paymentDate || today(),
    }));
  }

  function removeInvoicePayment(paymentId) {
    setInvoice((current) => ({
      ...current,
      payments: normalizePayments(current).filter((payment) => payment.id !== paymentId),
    }));
  }

  function collectInvoice(current = invoice) {
    const items = current.items
      .map((item) => ({
        description: String(item.description || "").trim(),
        discount: Number(item.discount) || 0,
        quantity: Number(item.quantity) || 0,
        price: Number(item.price) || 0,
        subtotal: calculateItem(item),
      }))
      .filter((item) => item.description || item.price > 0);
    return {
      id: current.id || createId("invoice"),
      invoiceNumber: Number(current.invoiceNumber),
      invoiceDate: current.invoiceDate,
      dueDate: current.dueDate,
      paymentMethod: String(current.paymentMethod || "").trim(),
      customerName: String(current.customerName || "").trim(),
      customerId: String(current.customerId || "").trim(),
      customerPhone: String(current.customerPhone || "").trim(),
      customerAddress: String(current.customerAddress || "").trim(),
      motorcycle: String(current.motorcycle || "").trim(),
      plate: normalizePlate(current.plate),
      note: String(current.note || "").trim(),
      observations: String(current.observations || "").trim(),
      items,
      payments: normalizePayments(current),
      totals: calculateTotals(items, current.payments),
      sourceOrderId: current.sourceOrderId || "",
      sourceOrderNumber: current.sourceOrderNumber || "",
      createdAt: current.createdAt || new Date().toISOString(),
    };
  }

  async function saveInvoice({ silent = false } = {}) {
    if (!storageReady) throw new Error("La base local no esta lista.");
    const nextInvoice = collectInvoice();
    if (!nextInvoice.invoiceNumber || !nextInvoice.customerName) {
      await showAlert("La factura necesita numero y cliente.");
      return null;
    }
    if (!nextInvoice.items.length) {
      await showAlert("Agrega al menos un repuesto o servicio antes de guardar.");
      return null;
    }

    const nextInvoices = [...invoices];
    const existingIndex = nextInvoices.findIndex(
      (item) => Number(item.invoiceNumber) === Number(nextInvoice.invoiceNumber),
    );
    if (existingIndex >= 0) nextInvoices[existingIndex] = { ...nextInvoice, id: nextInvoices[existingIndex].id };
    else nextInvoices.push(nextInvoice);
    nextInvoices.sort((a, b) => Number(b.invoiceNumber) - Number(a.invoiceNumber));

    let nextOrders = orders;
    if (nextInvoice.sourceOrderId || nextInvoice.sourceOrderNumber) {
      nextOrders = orders.map((item) => {
        const matchesOrder =
          (nextInvoice.sourceOrderId && item.id === nextInvoice.sourceOrderId) ||
          (nextInvoice.sourceOrderNumber && Number(item.orderNumber) === Number(nextInvoice.sourceOrderNumber));
        if (!matchesOrder) return item;
        return {
          ...item,
          status: "invoiced",
          invoiceNumber: nextInvoice.invoiceNumber,
          invoicedAt: nextInvoice.invoiceDate,
        };
      });
    }

    const nextMeta = {
      ...meta,
      nextInvoiceNumber:
        Number(nextInvoice.invoiceNumber) >= currentInvoiceNumber
          ? Number(nextInvoice.invoiceNumber) + 1
          : meta.nextInvoiceNumber,
    };

    await persistStorage(dataPayload({ invoices: nextInvoices, orders: nextOrders, meta: nextMeta }));
    setInvoices(nextInvoices);
    setOrders(nextOrders);
    setMeta(nextMeta);
    const savedInvoice = invoiceFromStored(nextInvoice);
    setInvoice(savedInvoice);
    setInvoiceBaseline(savedInvoice);
    setInvoiceRecordExists(true);
    if (!silent) setSavePrompt({ type: "invoice", record: savedInvoice });
    return nextInvoice;
  }

  async function printCurrentInvoice(format = "letter") {
    const saved = await saveInvoice({ silent: true });
    if (!saved) return;
    setPrintMarkup(renderPrintInvoice(saved, settings, format));
    setTimeout(() => window.print(), 0);
  }

  function openQuickPayment(targetInvoice) {
    setQuickPayment({ invoice: targetInvoice, amount: "", date: today() });
  }

  async function registerQuickPayment(targetInvoice, rawAmount, rawDate) {
    if (!storageReady) throw new Error("La base local no esta lista.");
    const amount = Number(rawAmount) || 0;
    const currentPayments = normalizePayments(targetInvoice);
    const totals = calculateTotals(targetInvoice.items || [], currentPayments);
    if (amount <= 0) {
      await showAlert("Ingresa un valor de abono mayor a cero.");
      return false;
    }
    if (totals.balance <= 0) {
      await showAlert("Esta factura ya esta pagada.");
      return false;
    }
    if (amount > totals.balance) {
      await showAlert(`El abono no puede superar el saldo pendiente de ${formatMoney(totals.balance)}.`);
      return false;
    }

    const nextPayments = [...currentPayments, { id: createId("payment"), date: rawDate || today(), amount }];
    const updatedInvoice = {
      ...targetInvoice,
      payments: nextPayments,
      totals: calculateTotals(targetInvoice.items || [], nextPayments),
    };
    const nextInvoices = invoices.map((item) => (item.id === targetInvoice.id ? updatedInvoice : item));

    await persistStorage(dataPayload({ invoices: nextInvoices }));
    setInvoices(nextInvoices);
    // Si la factura abierta en el formulario es la misma, refrescala.
    if (invoice.id === targetInvoice.id) {
      const refreshed = invoiceFromStored(updatedInvoice);
      setInvoice(refreshed);
      setInvoiceBaseline(refreshed);
    }
    return true;
  }

  async function confirmQuickPayment() {
    if (!quickPayment) return;
    const { invoice: target, amount, date } = quickPayment;
    const ok = await runSavingAction(
      "quickPayment",
      () => registerQuickPayment(target, amount, date),
      "No se pudo registrar el abono",
    );
    if (ok) setQuickPayment(null);
  }

  function dismissSavePrompt() {
    if (!savePrompt) return;
    const target = savePrompt.type === "order" ? views.orders : views.invoices;
    setSavePrompt(null);
    setActiveView(target);
  }

  function confirmSavePromptPrint() {
    if (!savePrompt) return;
    if (savePrompt.type === "order") {
      setPrintMarkup(renderPrintOrder(savePrompt.record, settings));
    } else {
      setPrintMarkup(renderPrintInvoice(savePrompt.record, settings, "letter"));
    }
    const target = savePrompt.type === "order" ? views.orders : views.invoices;
    setSavePrompt(null);
    setActiveView(target);
    setTimeout(() => window.print(), 0);
  }

  function collectOrder(current = order) {
    const relatedInvoice = findInvoiceForOrder(current, invoices);
    const hasRealInvoice = Boolean(relatedInvoice);
    const status = current.status === "invoiced" && !hasRealInvoice ? "ready" : current.status || "received";
    return {
      id: current.id || createId("order"),
      orderNumber: Number(current.orderNumber),
      orderDate: current.orderDate,
      attendant: String(current.attendant || "").trim(),
      customerName: String(current.customerName || "").trim(),
      customerPhone: String(current.customerPhone || "").trim(),
      motorcycle: String(current.motorcycle || "").trim(),
      plate: normalizePlate(current.plate),
      reason: String(current.reason || "").trim(),
      observations: String(current.observations || "").trim(),
      status,
      invoiceNumber: status === "invoiced" ? current.invoiceNumber || relatedInvoice?.invoiceNumber || "" : "",
      invoicedAt: status === "invoiced" ? current.invoicedAt || relatedInvoice?.invoiceDate || "" : "",
      createdAt: current.createdAt || new Date().toISOString(),
    };
  }

  async function saveOrder({ silent = false } = {}) {
    if (!storageReady) throw new Error("La base local no esta lista.");
    const nextOrder = collectOrder();
    if (!nextOrder.customerName || !nextOrder.motorcycle || !nextOrder.reason || !nextOrder.attendant) {
      await showAlert("La orden necesita cliente, moto, motivo de ingreso y persona que atiende.");
      return null;
    }

    const nextOrders = [...orders];
    const existingIndex = nextOrders.findIndex(
      (item) => Number(item.orderNumber) === Number(nextOrder.orderNumber),
    );
    if (existingIndex >= 0) nextOrders[existingIndex] = { ...nextOrder, id: nextOrders[existingIndex].id };
    else nextOrders.push(nextOrder);
    nextOrders.sort((a, b) => Number(b.orderNumber) - Number(a.orderNumber));

    const nextMeta = {
      ...meta,
      nextOrderNumber:
        Number(nextOrder.orderNumber) >= currentOrderNumber
          ? Number(nextOrder.orderNumber) + 1
          : meta.nextOrderNumber,
    };

    await persistStorage(dataPayload({ orders: nextOrders, meta: nextMeta }));
    setOrders(nextOrders);
    setMeta(nextMeta);
    const savedOrder = orderFromStored(nextOrder);
    setOrder(savedOrder);
    setOrderBaseline(savedOrder);
    setOrderRecordExists(true);
    if (!silent) setSavePrompt({ type: "order", record: savedOrder });
    return nextOrder;
  }

  async function updateOrderStatus(sourceOrder, nextStatus) {
    if (!storageReady) throw new Error("La base local no esta lista.");
    const relatedInvoice = findInvoiceForOrder(sourceOrder, invoices);
    if (relatedInvoice && nextStatus !== "invoiced") {
      await showAlert("Esta orden ya tiene factura. Para mantener la concordancia queda como Facturada.");
      return;
    }
    if (nextStatus === "invoiced" && !relatedInvoice) {
      await showAlert("Para marcar una orden como facturada primero debes crear la factura.");
      return;
    }

    const matches = (item) =>
      item.id === sourceOrder.id || Number(item.orderNumber) === Number(sourceOrder.orderNumber);
    const applyStatus = (item) => ({
      ...item,
      status: nextStatus,
      invoiceNumber: nextStatus === "invoiced" ? relatedInvoice?.invoiceNumber || item.invoiceNumber || "" : "",
      invoicedAt: nextStatus === "invoiced" ? relatedInvoice?.invoiceDate || item.invoicedAt || "" : "",
    });

    const prevOrders = orders;
    const prevOrder = order;
    const nextOrders = orders.map((item) => (matches(item) ? applyStatus(item) : item));

    // Optimista: la UI cambia de una vez y la red va por detras.
    setOrders(nextOrders);
    setOrder((current) => (matches(current) ? applyStatus(current) : current));

    try {
      await persistStorage(dataPayload({ orders: nextOrders }));
    } catch (error) {
      setOrders(prevOrders);
      setOrder(prevOrder);
      throw error;
    }
  }

  async function printCurrentOrder() {
    const saved = await saveOrder({ silent: true });
    if (!saved) return;
    setPrintMarkup(renderPrintOrder(saved, settings));
    setTimeout(() => window.print(), 0);
  }

  async function invoiceCurrentOrder() {
    const relatedInvoice = findInvoiceForOrder(order, invoices);
    if (relatedInvoice) {
      await openInvoiceFromOrder(order);
      return;
    }
    const saved = await saveOrder({ silent: true });
    if (saved) await startInvoiceFromOrder(saved);
  }

  async function savePart() {
    if (!storageReady) throw new Error("La base local no esta lista.");
    const nextPart = {
      id: partForm.id || createId("part"),
      code: String(partForm.code || "").trim(),
      name: String(partForm.name || "").trim(),
      price: Number(partForm.price) || 0,
      stock: Number(partForm.stock) || 0,
      createdAt: partForm.createdAt || new Date().toISOString(),
    };
    if (!nextPart.code || !nextPart.name) {
      await showAlert("El repuesto necesita codigo y nombre.");
      return;
    }

    const nextParts = [...parts];
    const existingIndex = nextParts.findIndex(
      (item) => item.id === nextPart.id || normalizeText(item.code) === normalizeText(nextPart.code),
    );
    if (existingIndex >= 0) nextParts[existingIndex] = { ...nextPart, id: nextParts[existingIndex].id };
    else nextParts.push(nextPart);
    nextParts.sort((a, b) => normalizeText(a.name).localeCompare(normalizeText(b.name)));

    await persistStorage(dataPayload({ parts: nextParts }));
    setParts(nextParts);
    setPartForm(makePart());
    setPartFormBaseline(makePart());
    await showAlert("Repuesto guardado en inventario.");
  }

  async function editPart(item) {
    if (!(await confirmDiscard(partFormIsDirty))) return;
    setPartForm(item);
    setPartFormBaseline(item);
  }

  async function deletePart(partId) {
    if (!(await showConfirm("Eliminar este repuesto del inventario?"))) return;
    const nextParts = parts.filter((item) => item.id !== partId);
    await persistStorage(dataPayload({ parts: nextParts }));
    setParts(nextParts);
  }

  async function saveSettings() {
    if (!storageReady) throw new Error("La base local no esta lista.");
    const number = Number(meta.nextInvoiceNumber);
    const nextMeta = {
      ...meta,
      nextInvoiceNumber: Number.isInteger(number) && number > 0 ? number : currentInvoiceNumber,
    };
    await persistStorage(dataPayload({ settings, meta: nextMeta }));
    setMeta(nextMeta);
    setSettingsBaseline({ settings, nextInvoiceNumber: nextMeta.nextInvoiceNumber });
    await showAlert("Datos del taller guardados.");
  }

  async function loadUsers() {
    const response = await fetch("/api/users", { credentials: "same-origin", cache: "no-store" });
    if (response.status === 401) throw new AuthRequiredError();
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "No se pudo cargar la lista de usuarios.");
    setUsers(data.users || []);
  }

  async function createUserAccount({ username, password, displayName, role: newRole }) {
    const response = await fetch("/api/users", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, displayName, role: newRole }),
    });
    if (response.status === 401) throw new AuthRequiredError();
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "No se pudo crear el usuario.");
    await loadUsers();
  }

  async function deleteUserAccount(id) {
    if (!(await showConfirm("Eliminar este usuario?"))) return;
    const response = await fetch(`/api/users/${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (response.status === 401) throw new AuthRequiredError();
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "No se pudo eliminar el usuario.");
    await loadUsers();
  }

  async function exportExcel() {
    const ExcelJS = (await import("exceljs")).default;
    const billedTotal = invoices.reduce((sum, item) => sum + (Number(item.totals?.total) || 0), 0);
    const paidTotal = invoices.reduce((sum, item) => sum + (Number(item.totals?.payments) || 0), 0);
    const balanceTotal = invoices.reduce((sum, item) => sum + (Number(item.totals?.balance) || 0), 0);
    const todayLabel = new Date().toLocaleDateString("es-CO");

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Master Motos Medellin";
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.subject = "Reporte de facturas";
    workbook.title = "Reporte de facturas Master Motos";

    const colors = {
      dark: "0B1F14",
      green: "12A33A",
      greenDark: "08752B",
      greenSoft: "E8F6EC",
      lime: "D9FF4C",
      white: "FFFFFF",
      line: "C6D7CB",
      muted: "66766B",
    };
    const moneyFormat = '"$"#,##0;[Red]-"$"#,##0';
    const border = {
      top: { style: "thin", color: { argb: colors.line } },
      left: { style: "thin", color: { argb: colors.line } },
      bottom: { style: "thin", color: { argb: colors.line } },
      right: { style: "thin", color: { argb: colors.line } },
    };
    const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.dark } };
    const greenFill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.green } };
    const softFill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.greenSoft } };

    const decorateSheet = (sheet) => {
      sheet.views = [{ state: "frozen", ySplit: 6, showGridLines: false }];
      sheet.pageSetup = {
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: { left: 0.35, right: 0.35, top: 0.55, bottom: 0.55, header: 0.2, footer: 0.2 },
      };
      sheet.properties.defaultRowHeight = 20;
    };

    const paintTitle = (sheet, lastColumn) => {
      sheet.mergeCells(`A1:${lastColumn}1`);
      sheet.mergeCells(`A2:${lastColumn}2`);
      sheet.getRow(1).height = 30;
      sheet.getCell("A1").value = "Master Motos Medellin";
      sheet.getCell("A1").font = { bold: true, size: 18, color: { argb: colors.white } };
      sheet.getCell("A1").fill = headerFill;
      sheet.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };
      sheet.getCell("A2").value = `Reporte de facturas | Generado ${todayLabel}`;
      sheet.getCell("A2").font = { bold: true, size: 11, color: { argb: colors.dark } };
      sheet.getCell("A2").fill = softFill;
      sheet.getCell("A2").alignment = { vertical: "middle", horizontal: "left" };
    };

    const styleRange = (sheet, startRow, endRow, startCol, endCol) => {
      for (let rowNumber = startRow; rowNumber <= endRow; rowNumber += 1) {
        const row = sheet.getRow(rowNumber);
        for (let colNumber = startCol; colNumber <= endCol; colNumber += 1) {
          const cell = row.getCell(colNumber);
          cell.border = border;
          cell.alignment = { vertical: "middle", horizontal: colNumber >= startCol ? "left" : "center" };
        }
      }
    };

    const styleHeaderRow = (row) => {
      row.height = 24;
      row.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: colors.white } };
        cell.fill = greenFill;
        cell.border = border;
        cell.alignment = { vertical: "middle", horizontal: "center" };
      });
    };

    const columnName = (columnNumber) => {
      let name = "";
      let current = columnNumber;
      while (current > 0) {
        const remainder = (current - 1) % 26;
        name = String.fromCharCode(65 + remainder) + name;
        current = Math.floor((current - 1) / 26);
      }
      return name;
    };

    const summarySheet = workbook.addWorksheet("Resumen");
    decorateSheet(summarySheet);
    paintTitle(summarySheet, "F");
    summarySheet.columns = [
      { key: "label", width: 24 },
      { key: "value", width: 18 },
      { key: "space1", width: 3 },
      { key: "label2", width: 24 },
      { key: "value2", width: 18 },
      { key: "space2", width: 3 },
    ];
    summarySheet.addRows([
      [],
      ["Indicador", "Valor", "", "Indicador", "Valor"],
      ["Facturas", invoices.length, "", "Total facturado", billedTotal],
      ["Total abonos", paidTotal, "", "Total saldo", balanceTotal],
    ]);
    styleHeaderRow(summarySheet.getRow(4));
    styleRange(summarySheet, 5, 6, 1, 5);
    ["B5", "E5", "B6", "E6"].forEach((address) => {
      const cell = summarySheet.getCell(address);
      cell.numFmt = address === "B5" ? "#,##0" : moneyFormat;
      cell.font = { bold: true, size: 12, color: { argb: colors.greenDark } };
      cell.alignment = { horizontal: "right", vertical: "middle" };
    });
    ["A5", "D5", "A6", "D6"].forEach((address) => {
      summarySheet.getCell(address).font = { bold: true, color: { argb: colors.dark } };
      summarySheet.getCell(address).fill = softFill;
    });

    const invoicesSheet = workbook.addWorksheet("Facturas");
    decorateSheet(invoicesSheet);
    const maxPaymentCount = Math.max(1, ...invoices.map((item) => normalizePayments(item).length));
    const invoiceBaseColumns = [
      { header: "Numero", key: "number", width: 10 },
      { header: "Fecha", key: "date", width: 13 },
      { header: "Cliente", key: "customer", width: 30 },
      { header: "NIT / CC", key: "customerId", width: 16 },
      { header: "Telefono", key: "phone", width: 16 },
      { header: "Moto", key: "motorcycle", width: 20 },
      { header: "Placa", key: "plate", width: 12 },
      { header: "Total", key: "total", width: 15 },
      { header: "Abonos", key: "payments", width: 15 },
      { header: "Saldo", key: "balance", width: 15 },
    ];
    const invoicePaymentColumns = Array.from({ length: maxPaymentCount }, (_, index) => [
      { header: `Pago ${index + 1}`, key: `payment${index + 1}`, width: 16 },
      { header: `Fecha pago ${index + 1}`, key: `paymentDate${index + 1}`, width: 18 },
    ]).flat();
    invoicesSheet.columns = [...invoiceBaseColumns, ...invoicePaymentColumns];
    invoicesSheet.spliceRows(1, 1);
    paintTitle(invoicesSheet, columnName(invoiceBaseColumns.length + invoicePaymentColumns.length));
    invoicesSheet.addTable({
      name: "TablaFacturas",
      ref: "A4",
      headerRow: true,
      totalsRow: true,
      style: { theme: "TableStyleMedium4", showRowStripes: true },
      columns: [
        { name: "Numero" },
        { name: "Fecha" },
        { name: "Cliente" },
        { name: "NIT / CC" },
        { name: "Telefono" },
        { name: "Moto" },
        { name: "Placa" },
        { name: "Total", totalsRowFunction: "sum" },
        { name: "Abonos", totalsRowFunction: "sum" },
        { name: "Saldo", totalsRowFunction: "sum" },
        ...Array.from({ length: maxPaymentCount }, (_, index) => [
          { name: `Pago ${index + 1}`, totalsRowFunction: "sum" },
          { name: `Fecha pago ${index + 1}` },
        ]).flat(),
      ],
      rows: invoices.map((item) => {
        const payments = normalizePayments(item);
        const paymentCells = Array.from({ length: maxPaymentCount }, (_, index) => [
          Number(payments[index]?.amount) || 0,
          payments[index]?.date || "",
        ]).flat();
        return [
          Number(item.invoiceNumber) || item.invoiceNumber || "",
          item.invoiceDate || "",
          item.customerName || "",
          item.customerId || "",
          item.customerPhone || "",
          item.motorcycle || "",
          item.plate || "",
          Number(item.totals?.total) || 0,
          Number(item.totals?.payments) || 0,
          Number(item.totals?.balance) || 0,
          ...paymentCells,
        ];
      }),
    });
    styleHeaderRow(invoicesSheet.getRow(4));
    invoicesSheet.eachRow((row, rowNumber) => {
      if (rowNumber >= 5) {
        row.eachCell((cell) => {
          cell.border = border;
          cell.alignment = { vertical: "middle", horizontal: "left" };
        });
        const moneyColumns = [
          8,
          9,
          10,
          ...Array.from({ length: maxPaymentCount }, (_, index) => 11 + index * 2),
        ];
        moneyColumns.forEach((col) => {
          row.getCell(col).numFmt = moneyFormat;
          row.getCell(col).alignment = { horizontal: "right", vertical: "middle" };
        });
      }
    });
    const invoiceTotalsRow = invoicesSheet.getRow(invoices.length + 5);
    invoiceTotalsRow.font = { bold: true, color: { argb: colors.dark } };
    invoiceTotalsRow.eachCell((cell) => {
      cell.fill = softFill;
      cell.border = border;
    });

    const paymentsSheet = workbook.addWorksheet("Pagos");
    decorateSheet(paymentsSheet);
    paymentsSheet.columns = [
      { header: "Factura", key: "invoice", width: 10 },
      { header: "Cliente", key: "customer", width: 30 },
      { header: "Fecha pago", key: "date", width: 14 },
      { header: "Cuota", key: "payment", width: 16 },
      { header: "Valor", key: "amount", width: 16 },
      { header: "Saldo factura", key: "balance", width: 16 },
    ];
    paymentsSheet.spliceRows(1, 1);
    paintTitle(paymentsSheet, "F");
    paymentsSheet.addTable({
      name: "TablaPagos",
      ref: "A4",
      headerRow: true,
      totalsRow: true,
      style: { theme: "TableStyleMedium4", showRowStripes: true },
      columns: [
        { name: "Factura" },
        { name: "Cliente" },
        { name: "Fecha pago" },
        { name: "Cuota" },
        { name: "Valor", totalsRowFunction: "sum" },
        { name: "Saldo factura", totalsRowFunction: "sum" },
      ],
      rows: invoices.flatMap((item) =>
        normalizePayments(item).map((payment, index) => [
          Number(item.invoiceNumber) || item.invoiceNumber || "",
          item.customerName || "",
          payment.date || "",
          `Pago ${index + 1}`,
          Number(payment.amount) || 0,
          Number(item.totals?.balance) || 0,
        ]),
      ),
    });
    styleHeaderRow(paymentsSheet.getRow(4));
    paymentsSheet.eachRow((row, rowNumber) => {
      if (rowNumber >= 5) {
        row.eachCell((cell) => {
          cell.border = border;
          cell.alignment = { vertical: "middle", horizontal: "left" };
        });
        [5, 6].forEach((col) => {
          row.getCell(col).numFmt = moneyFormat;
          row.getCell(col).alignment = { horizontal: "right", vertical: "middle" };
        });
      }
    });

    const detailSheet = workbook.addWorksheet("Detalle");
    decorateSheet(detailSheet);
    detailSheet.columns = [
      { header: "Factura", key: "invoice", width: 10 },
      { header: "Fecha", key: "date", width: 13 },
      { header: "Cliente", key: "customer", width: 30 },
      { header: "Placa", key: "plate", width: 12 },
      { header: "Descripcion", key: "description", width: 48 },
      { header: "Dto", key: "discount", width: 13 },
      { header: "Cantidad", key: "quantity", width: 10 },
      { header: "Precio", key: "price", width: 14 },
      { header: "Subtotal", key: "subtotal", width: 15 },
    ];
    detailSheet.spliceRows(1, 1);
    paintTitle(detailSheet, "I");
    const detailRows = invoices.flatMap((invoiceItem) =>
      (invoiceItem.items || []).map((line) => [
        Number(invoiceItem.invoiceNumber) || invoiceItem.invoiceNumber || "",
        invoiceItem.invoiceDate || "",
        invoiceItem.customerName || "",
        invoiceItem.plate || "",
        line.description || "",
        Number(line.discount) || 0,
        Number(line.quantity) || 0,
        Number(line.price) || 0,
        Number(line.subtotal) || 0,
      ]),
    );
    detailSheet.addTable({
      name: "TablaDetalle",
      ref: "A4",
      headerRow: true,
      totalsRow: true,
      style: { theme: "TableStyleMedium4", showRowStripes: true },
      columns: [
        { name: "Factura" },
        { name: "Fecha" },
        { name: "Cliente" },
        { name: "Placa" },
        { name: "Descripcion" },
        { name: "Dto", totalsRowFunction: "sum" },
        { name: "Cantidad", totalsRowFunction: "sum" },
        { name: "Precio" },
        { name: "Subtotal", totalsRowFunction: "sum" },
      ],
      rows: detailRows,
    });
    styleHeaderRow(detailSheet.getRow(4));
    detailSheet.eachRow((row, rowNumber) => {
      if (rowNumber >= 5) {
        row.eachCell((cell) => {
          cell.border = border;
          cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
        });
        [6, 8, 9].forEach((col) => {
          row.getCell(col).numFmt = moneyFormat;
          row.getCell(col).alignment = { horizontal: "right", vertical: "middle" };
        });
        row.getCell(7).numFmt = "#,##0";
        row.getCell(7).alignment = { horizontal: "right", vertical: "middle" };
      }
    });
    const detailTotalsRow = detailSheet.getRow(detailRows.length + 5);
    detailTotalsRow.font = { bold: true, color: { argb: colors.dark } };
    detailTotalsRow.eachCell((cell) => {
      cell.fill = softFill;
      cell.border = border;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `facturas-Master-motos-${today()}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const filteredInvoices = useMemo(() => {
    const needle = historyQuery.toLowerCase().trim();
    return invoices.filter((item) =>
      [item.invoiceNumber, item.customerName, item.motorcycle, item.plate].join(" ").toLowerCase().includes(needle),
    );
  }, [invoices, historyQuery]);

  const filteredOrders = useMemo(() => {
    const needle = orderQuery.toLowerCase().trim();
    return orders
      .filter((item) =>
        [item.orderNumber, item.customerName, item.motorcycle, item.plate, item.attendant]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
      .filter((item) => {
        if (orderStatusFilter === "all") return true;
        const hasInvoice = Boolean(findInvoiceForOrder(item, invoices));
        const normalizedStatus = hasInvoice ? "invoiced" : item.status === "invoiced" ? "ready" : item.status || "received";
        return normalizedStatus === orderStatusFilter;
      });
  }, [orders, invoices, orderQuery, orderStatusFilter]);

  const filteredParts = useMemo(() => {
    const needle = inventoryQuery.toLowerCase().trim();
    return parts.filter((item) => [item.code, item.name].join(" ").toLowerCase().includes(needle));
  }, [parts, inventoryQuery]);

  if (authStatus === "checking") {
    return <div className="auth-loading">Cargando...</div>;
  }

  if (authStatus === "required") {
    return (
      <LoginScreen
        onLogin={handleLogin}
        error={loginError}
        submitting={loginSubmitting}
      />
    );
  }

  function navigateAndCloseMobile(view) {
    showView(view);
    setMobileNavOpen(false);
  }

  return (
    <>
      <div
        className={`app-shell ${sidebarCollapsed ? "sidebar-is-collapsed" : ""} ${mobileNavOpen ? "mobile-nav-open" : ""}`}
      >
        <div className="mobile-topbar">
          <button
            type="button"
            className="mobile-nav-toggle"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu size={22} strokeWidth={2.4} />
          </button>
          <span className="mobile-topbar-title">Master Motos</span>
        </div>
        {mobileNavOpen && (
          <div className="sidebar-backdrop" onClick={() => setMobileNavOpen(false)} />
        )}
        <Sidebar
          activeView={activeView}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          showView={navigateAndCloseMobile}
          role={role}
          authDisplayName={authStatus === "authenticated" ? authDisplayName : ""}
          onLogout={authStatus === "authenticated" ? handleLogout : null}
          onCloseMobile={() => setMobileNavOpen(false)}
        />
        <main className="workspace">
          {activeView === views.dashboard && (
            <Dashboard
              invoices={invoices}
              orders={orders}
              parts={parts}
              showView={showView}
              startNewInvoice={startNewInvoice}
              startNewOrder={startNewOrder}
              role={role}
            />
          )}
          {activeView === views.invoiceForm && (
            <InvoiceForm
              invoice={invoice}
              totals={invoiceTotals}
              parts={parts}
              updateField={updateInvoiceField}
              updateItem={updateInvoiceItem}
              addItem={addInvoiceItem}
              removeItem={removeInvoiceItem}
              addPayment={addInvoicePayment}
              removePayment={removeInvoicePayment}
              saveInvoice={() => runSavingAction("invoice", () => saveInvoice(), "No se guardo la factura")}
              printInvoice={() => runSavingAction("printInvoice", () => printCurrentInvoice(), "No se pudo imprimir la factura")}
              invoiceRecordExists={invoiceRecordExists}
              invoiceIsDirty={invoiceIsDirty}
              savingAction={savingAction}
            />
          )}
          {activeView === views.invoices && (
            <InvoiceHistory
              invoices={filteredInvoices}
              query={historyQuery}
              setQuery={setHistoryQuery}
              openInvoice={openInvoice}
              onQuickPayment={openQuickPayment}
              exportExcel={exportExcel}
              startNewInvoice={startNewInvoice}
            />
          )}
          {activeView === views.orderForm && (
            <OrderForm
              order={order}
              invoices={invoices}
              setOrder={setOrder}
              createInvoiceFromOrder={() => runSavingAction("createInvoiceFromOrder", () => invoiceCurrentOrder(), "No se pudo crear la factura")}
              saveOrder={() => runSavingAction("order", () => saveOrder(), "No se guardo la orden")}
              printOrder={() => runSavingAction("printOrder", () => printCurrentOrder(), "No se pudo imprimir la orden")}
              orderRecordExists={orderRecordExists}
              orderIsDirty={orderIsDirty}
              role={role}
              savingAction={savingAction}
            />
          )}
          {activeView === views.orders && (
            <OrderHistory
              orders={filteredOrders}
              invoices={invoices}
              query={orderQuery}
              setQuery={setOrderQuery}
              statusFilter={orderStatusFilter}
              setStatusFilter={setOrderStatusFilter}
              openOrder={openOrder}
              createInvoiceFromOrder={startInvoiceFromOrder}
              openInvoiceFromOrder={openInvoiceFromOrder}
              updateOrderStatus={(item, status) => updateOrderStatus(item, status).catch((error) => handleActionError(error, "No se actualizo el estado"))}
              startNewOrder={startNewOrder}
              role={role}
            />
          )}
          {activeView === views.inventory && (
            <Inventory
              partForm={partForm}
              setPartForm={setPartForm}
              parts={filteredParts}
              query={inventoryQuery}
              setQuery={setInventoryQuery}
              savePart={() => runSavingAction("part", () => savePart(), "No se guardo el repuesto")}
              editPart={editPart}
              deletePart={(id) => deletePart(id).catch((error) => handleActionError(error, "No se elimino el repuesto"))}
              partFormIsDirty={partFormIsDirty}
              savingAction={savingAction}
            />
          )}
          {activeView === views.settings && (
            <Settings
              settings={settings}
              setSettings={setSettings}
              meta={meta}
              setMeta={setMeta}
              nextInvoice={currentInvoiceNumber}
              saveSettings={() => runSavingAction("settings", () => saveSettings(), "No se guardo la configuracion")}
              settingsIsDirty={settingsIsDirty}
              savingAction={savingAction}
            />
          )}
          {activeView === views.users && role === "admin" && (
            <UsersView
              users={users}
              onCreate={async (form) => {
                try {
                  await createUserAccount(form);
                } catch (error) {
                  if (error instanceof AuthRequiredError) {
                    setAuthStatus("required");
                    return;
                  }
                  throw error;
                }
              }}
              onDelete={(id) => deleteUserAccount(id).catch((error) => handleActionError(error, "No se elimino el usuario"))}
            />
          )}
          {activeView === views.statistics && role === "admin" && (
            <Statistics invoices={invoices} orders={orders} />
          )}
        </main>
      </div>
      {savePrompt && (
        <div className="modal-backdrop" role="presentation">
          <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="savePromptTitle">
            <span className="modal-kicker">{savePrompt.type === "order" ? "Orden guardada" : "Factura guardada"}</span>
            <h2 id="savePromptTitle">
              {savePrompt.type === "order"
                ? `Orden No. ${savePrompt.record.orderNumber} guardada`
                : `Factura No. ${savePrompt.record.invoiceNumber} guardada`}
            </h2>
            <p>Quieres imprimirla ahora?</p>
            <div className="modal-actions">
              <button className="primary-button" type="button" onClick={confirmSavePromptPrint}>Si, imprimir</button>
              <button className="ghost-button" type="button" onClick={dismissSavePrompt}>No</button>
            </div>
          </section>
        </div>
      )}
      {quickPayment && (
        <div className="modal-backdrop" role="presentation">
          <section className="confirm-modal form-modal" role="dialog" aria-modal="true" aria-labelledby="quickPaymentTitle">
            <span className="modal-kicker">Cobro rapido</span>
            <h2 id="quickPaymentTitle">Registrar abono</h2>
            <p>
              Factura No. {quickPayment.invoice.invoiceNumber} - {quickPayment.invoice.customerName || "Sin cliente"}
            </p>
            <p className="quick-payment-balance">
              Saldo pendiente: <strong>{formatMoney(quickPayment.invoice.totals?.balance)}</strong>
            </p>
            <div className="form-grid">
              <Field label="Valor del abono">
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={quickPayment.amount}
                  autoFocus
                  onChange={(event) => setQuickPayment((current) => ({ ...current, amount: event.target.value }))}
                />
              </Field>
              <Field label="Fecha">
                <input
                  type="date"
                  value={quickPayment.date}
                  onChange={(event) => setQuickPayment((current) => ({ ...current, date: event.target.value }))}
                />
              </Field>
            </div>
            <div className="modal-actions">
              <ActionButton
                className="primary-button"
                onClick={confirmQuickPayment}
                loading={savingAction === "quickPayment"}
                loadingLabel="Guardando..."
              >
                Guardar abono
              </ActionButton>
              <button className="ghost-button" type="button" onClick={() => setQuickPayment(null)} disabled={savingAction === "quickPayment"}>Cancelar</button>
            </div>
          </section>
        </div>
      )}
      {dialog && (
        <div className="modal-backdrop" role="presentation">
          <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="appDialogTitle">
            <span className="modal-kicker">{dialog.kind === "confirm" ? "Confirmar" : "Aviso"}</span>
            <h2 id="appDialogTitle">{dialog.kind === "confirm" ? "Confirmar accion" : "Aviso"}</h2>
            <p>{dialog.message}</p>
            <div className="modal-actions">
              {dialog.kind === "confirm" ? (
                <>
                  <button className="primary-button" type="button" onClick={() => resolveDialog(true)}>Si</button>
                  <button className="ghost-button" type="button" onClick={() => resolveDialog(false)}>No</button>
                </>
              ) : (
                <button className="primary-button" type="button" style={{ gridColumn: "1 / -1" }} onClick={() => resolveDialog(true)}>Aceptar</button>
              )}
            </div>
          </section>
        </div>
      )}
      <section id="printArea" aria-hidden="true" dangerouslySetInnerHTML={{ __html: printMarkup }} />
    </>
  );
}

function Sidebar({ activeView, collapsed, setCollapsed, showView, role, authDisplayName, onLogout, onCloseMobile }) {
  const isAdmin = role === "admin";
  const operationItems = [
    [Gauge, "Dashboard", views.dashboard],
    ...(isAdmin ? [[ReceiptText, "Factura", views.invoices]] : []),
    [ClipboardList, "Ingresos", views.orders],
  ];
  const workshopItems = [
    [Boxes, "Inventario", views.inventory],
    ...(isAdmin ? [[Wrench, "Ajustes", views.settings]] : []),
  ];
  const adminItems = isAdmin
    ? [
        [BarChart3, "Estadisticas", views.statistics],
        [Users, "Usuarios", views.users],
      ]
    : [];
  const renderItems = (items) => items.map(([Icon, label, view]) => (
    <button
      className={`nav-button ${activeView === view ? "is-active" : ""}`}
      key={view}
      type="button"
      title={collapsed ? label : undefined}
      onClick={() => showView(view)}
    >
      <span className="nav-icon"><Icon size={18} strokeWidth={2.4} /></span>
      <span className="nav-label">{label}</span>
    </button>
  ));
  return (
    <aside className="sidebar">
      <div className="brand-mark">
        <img className="brand-logo" src={masterLogoSrc} alt="Master Motos" />
        <div className="brand-copy">
          <strong>Master Motos</strong>
          <span>Medellin</span>
        </div>
        {onCloseMobile && (
          <button
            type="button"
            className="sidebar-mobile-close"
            onClick={onCloseMobile}
            aria-label="Cerrar menu"
          >
            <X size={20} strokeWidth={2.4} />
          </button>
        )}
      </div>
      <nav className="main-nav" aria-label="Principal">
        <div className="nav-group">
          <span className="nav-section-label">Operacion</span>
          {renderItems(operationItems)}
        </div>
        <div className="nav-group">
          <span className="nav-section-label">Taller</span>
          {renderItems(workshopItems)}
        </div>
        {adminItems.length > 0 && (
          <div className="nav-group">
            <span className="nav-section-label">Administracion</span>
            {renderItems(adminItems)}
          </div>
        )}
      </nav>
      <div className="sidebar-footer">
        {onLogout && (
          <div className="sidebar-account">
            <div className="sidebar-account-info">
              <span className="sidebar-avatar">{(authDisplayName || "?").charAt(0).toUpperCase()}</span>
              <span className="sidebar-account-name">{authDisplayName}</span>
            </div>
            <button
              aria-label="Cerrar sesion"
              className="sidebar-logout"
              title="Cerrar sesion"
              type="button"
              onClick={onLogout}
            >
              <LogOut size={16} strokeWidth={2.4} />
            </button>
          </div>
        )}
        <button
          aria-label={collapsed ? "Expandir menu" : "Contraer menu"}
          className="sidebar-toggle"
          title={collapsed ? "Expandir menu" : "Contraer menu"}
          type="button"
          onClick={() => setCollapsed((current) => !current)}
        >
          {collapsed ? <ChevronRight size={18} strokeWidth={2.5} /> : <ChevronLeft size={18} strokeWidth={2.5} />}
          <span>{collapsed ? "Expandir" : "Ocultar"}</span>
        </button>
      </div>
    </aside>
  );
}

function LoginScreen({ onLogin, error, submitting }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    onLogin(username, password);
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <img className="login-logo" src={masterLogoSrc} alt="Master Motos" />
        <h1>Master Motos</h1>
        <p>Inicia sesion para continuar</p>
        <label className="login-field">
          Cedula
          <input
            type="text"
            inputMode="numeric"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className="login-field">
          Contrasena
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && <p className="login-error">{error}</p>}
        <button type="submit" className="login-submit" disabled={submitting}>
          {submitting ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}

function PageHeader({ eyebrow, title, description, icon: Icon, children }) {
  return (
    <header className="page-header">
      <div className="page-heading">
        {Icon && (
          <div className="page-icon" aria-hidden="true">
            <Icon size={26} strokeWidth={2.4} />
          </div>
        )}
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          {description && <p className="page-description">{description}</p>}
        </div>
      </div>
      {children && <div className="header-actions">{children}</div>}
    </header>
  );
}

function Dashboard({ invoices, orders, parts, showView, startNewInvoice, startNewOrder, role }) {
  const isAdmin = role === "admin";
  const total = invoices.reduce((sum, item) => sum + (Number(item.totals?.total) || 0), 0);
  const pendingBalance = invoices.reduce((sum, item) => sum + (Number(item.totals?.balance) || 0), 0);
  const activeOrders = orders.filter((item) => !findInvoiceForOrder(item, invoices)).length;
  const invoicesWithDebt = invoices.filter((item) => (Number(item.totals?.balance) || 0) > 0).length;
  const recentInvoices = [...invoices].sort((a, b) => Number(b.invoiceNumber) - Number(a.invoiceNumber));
  const recentOrders = [...orders].sort((a, b) => Number(b.orderNumber) - Number(a.orderNumber));
  const recentParts = parts.slice(0, 3);
  const visibleInvoices = recentInvoices.slice(0, 3);
  const visibleOrders = recentOrders.slice(0, 3);
  return (
    <section className="module-view dashboard-view">
      <PageHeader
        eyebrow="Panel principal"
        title="Dashboard"
        description="Resumen operativo del taller, facturacion, ingresos e inventario."
        icon={Gauge}
      />
      <section className="dashboard-stats">
        {isAdmin && <Stat icon={ReceiptText} label="Facturas" value={invoices.length} />}
        <Stat icon={ClipboardList} label="Motos en taller" value={activeOrders} />
        {isAdmin && <Stat icon={WalletCards} label="Facturas con deuda" value={invoicesWithDebt} />}
        {isAdmin && <Stat icon={WalletCards} label="Cartera pendiente" value={formatMoney(pendingBalance)} />}
        {isAdmin && <Stat icon={WalletCards} label="Total facturado" value={formatMoney(total)} className="is-total-billed" />}
      </section>
      <section className="dashboard-board">
        <div className="board-heading">
          <div>
            <p className="eyebrow">Actividad reciente</p>
            <h2>Tablero operativo</h2>
          </div>
          <div className="board-actions">
            {isAdmin && <button className="small-button" type="button" onClick={() => showView(views.invoices)}>Facturas</button>}
            <button className="small-button" type="button" onClick={() => showView(views.orders)}>Ingresos</button>
            <button className="small-button" type="button" onClick={() => showView(views.inventory)}>Inventario</button>
          </div>
        </div>
        <div className="work-sections">
          {isAdmin && (
          <section className="work-section">
            <div className="work-section-title">
              <span>Facturado</span>
              <small>{visibleInvoices.length} recientes</small>
            </div>
            <div className="work-card-grid">
              {visibleInvoices.length ? visibleInvoices.map((item) => {
                const balance = Number(item.totals?.balance) || 0;
                return (
                  <article className="work-card work-card-invoice" key={`invoice-${item.id}`}>
                    <div className="work-card-top">
                      <span className="work-icon">Factura</span>
                      <span className="work-badge">No. {item.invoiceNumber}</span>
                    </div>
                    <div className="work-card-body">
                      <h3>{item.customerName || "Sin cliente"}</h3>
                      <p>{item.invoiceDate} - {item.plate || "Sin placa"}</p>
                      <span className={balance > 0 ? "payment-note" : "status-pill status-paid"}>
                        {balance > 0 ? `Debe ${formatMoney(balance)}` : "Pagada"}
                      </span>
                    </div>
                    <div className="work-card-footer">
                      <span>Total</span>
                      <strong>{formatMoney(item.totals?.total)}</strong>
                    </div>
                  </article>
                );
              }) : <p className="empty-state">No hay facturas recientes.</p>}
            </div>
          </section>
          )}

          <section className="work-section">
            <div className="work-section-title">
              <span>Ingresos</span>
              <small>{visibleOrders.length} recientes</small>
            </div>
            <div className="work-card-grid">
              {visibleOrders.length ? visibleOrders.map((item) => {
                const billing = orderBillingState(item, invoices);
                return (
                  <article className="work-card work-card-order" key={`order-${item.id}`}>
                    <div className="work-card-top">
                      <span className="work-icon">Ingreso</span>
                      <span className="work-badge">No. {item.orderNumber}</span>
                    </div>
                    <div className="work-card-body">
                      <h3>{item.motorcycle || "Sin moto"}</h3>
                      <p>{item.orderDate} - {item.customerName || "Sin cliente"}</p>
                      <span className={`status-pill ${billing.className}`}>{billing.label}</span>
                      {billing.paymentInfo && <span className="payment-note">{billing.paymentInfo}</span>}
                    </div>
                    <div className="work-card-footer">
                      <span>Atiende</span>
                      <strong>{item.attendant || "Sin atender"}</strong>
                    </div>
                  </article>
                );
              }) : <p className="empty-state">No hay ingresos recientes.</p>}
            </div>
          </section>

          <section className="work-section">
            <div className="work-section-title">
              <span>Inventario</span>
              <small>{recentParts.length} recientes</small>
            </div>
            <div className="work-card-grid">
              {recentParts.length ? recentParts.map((item) => (
                <article className="work-card work-card-part" key={`part-${item.id}`}>
                  <div className="work-card-top">
                    <span className="work-icon">Repuesto</span>
                    <span className="work-badge">{item.code}</span>
                  </div>
                  <div className="work-card-body">
                    <h3>{item.name}</h3>
                    <p>Stock disponible: {item.stock}</p>
                  </div>
                  <div className="work-card-footer">
                    <span>Precio</span>
                    <strong>{formatMoney(item.price)}</strong>
                  </div>
                </article>
              )) : <p className="empty-state">No hay repuestos registrados.</p>}
            </div>
          </section>
        </div>
      </section>
    </section>
  );
}

function Stat({ icon: Icon, label, value, className = "" }) {
  const isMoney = String(value).includes("$");
  return (
    <article className={`stat-card ${isMoney ? "is-money" : ""} ${className}`.trim()}>
      <div className="stat-icon" aria-hidden="true">{Icon && <Icon size={21} strokeWidth={2.4} />}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function InvoiceForm({ invoice, totals, parts, updateField, updateItem, addItem, removeItem, addPayment, removePayment, saveInvoice, printInvoice, invoiceRecordExists, invoiceIsDirty, savingAction }) {
  const payments = normalizePayments(invoice);
  const canPrint = invoiceRecordExists && !invoiceIsDirty;
  return (
    <section className="module-view form-view invoice-view">
      <PageHeader
        eyebrow="Facturacion de taller"
        title={<>Factura <span>No. {invoice.invoiceNumber}</span></>}
        description="Construye la factura con cliente, moto, repuestos, servicios y abonos."
        icon={ReceiptText}
      >
        <ActionButton
          className="ghost-button"
          onClick={printInvoice}
          disabled={!canPrint}
          loading={savingAction === "printInvoice"}
          loadingLabel="Imprimiendo..."
          title={canPrint ? undefined : "Guarda la factura antes de imprimir"}
        >
          Imprimir
        </ActionButton>
      </PageHeader>
      <form className="invoice-layout">
        <section className="panel">
          <div className="panel-title"><h2>Datos de factura</h2></div>
          <div className="form-grid">
            <Field label="Fecha"><input value={invoice.invoiceDate} type="date" onChange={(event) => updateField("invoiceDate", event.target.value)} /></Field>
            <Field label="Garantia hasta"><input value={invoice.dueDate} type="date" onChange={(event) => updateField("dueDate", event.target.value)} /></Field>
            <Field label="Forma de pago" wide>
              <div className="payment-method-toggle" role="group" aria-label="Forma de pago">
                {["efectivo", "transferencia"].map((method) => (
                  <button
                    className={normalizeText(invoice.paymentMethod || "efectivo") === method ? "is-active" : ""}
                    key={method}
                    type="button"
                    onClick={() => updateField("paymentMethod", method)}
                  >
                    {method === "efectivo" ? "Efectivo" : "Transferencia"}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </section>
        <section className="panel">
          <div className="panel-title"><h2>Cliente y moto</h2></div>
          <div className="form-grid customer-moto-grid">
            <Field label="Cliente" wide><input value={invoice.customerName} type="text" required onChange={(event) => updateField("customerName", event.target.value)} /></Field>
            <Field label="Telefono"><input value={invoice.customerPhone} type="tel" onChange={(event) => updateField("customerPhone", event.target.value)} /></Field>
            <Field label="Direccion" wide><input value={invoice.customerAddress} type="text" onChange={(event) => updateField("customerAddress", event.target.value)} /></Field>
            <Field label="Moto"><input value={invoice.motorcycle} type="text" onChange={(event) => updateField("motorcycle", event.target.value)} /></Field>
            <Field label="Placa"><input value={invoice.plate} type="text" onChange={(event) => updateField("plate", event.target.value)} /></Field>
          </div>
        </section>
        <section className="panel items-panel">
          <div className="panel-title">
            <h2>Repuestos y servicios</h2>
            <button className="small-button" type="button" onClick={addItem}>Agregar item</button>
          </div>
          <div className="items-table-wrap">
            <table className="items-table">
              <thead>
                <tr><th>Descripcion</th><th>Dto</th><th>Cant.</th><th>Precio</th><th>Subtotal</th><th /></tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => {
                  const matchedPart = parts.find((part) => normalizeText(partDisplayName(part)) === normalizeText(item.description));
                  return (
                    <tr key={index}>
                      <td>
                        <div className="item-description-wrap">
                          <input className="item-description" list="partsList" value={item.description} placeholder="Nombre o codigo" onChange={(event) => updateItem(index, "description", event.target.value)} />
                          <div className="matched-part">{matchedPart ? `Codigo ${matchedPart.code}` : ""}</div>
                        </div>
                      </td>
                      <td><input className="item-discount" type="number" min="0" step="100" value={item.discount} onChange={(event) => updateItem(index, "discount", event.target.value)} /></td>
                      <td><input className="item-quantity" type="number" min="0" step="1" value={item.quantity} onChange={(event) => updateItem(index, "quantity", event.target.value)} /></td>
                      <td><input className="item-price" type="number" min="0" step="100" value={item.price} onChange={(event) => updateItem(index, "price", event.target.value)} /></td>
                      <td className="line-total">{formatMoney(calculateItem(item))}</td>
                      <td><button className="remove-button" type="button" title="Eliminar item" onClick={() => removeItem(index)}>x</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <datalist id="partsList">
              {parts.map((part) => <option key={part.id} value={partDisplayName(part)}>{formatMoney(part.price)}</option>)}
            </datalist>
          </div>
        </section>
        <section className="bottom-grid">
          <div className="invoice-notes-column">
            <div className="panel">
              <div className="panel-title"><h2>Notas</h2></div>
              <Field label="Nota"><textarea value={invoice.note} rows="4" onChange={(event) => updateField("note", event.target.value)} /></Field>
              <Field label="Observaciones"><textarea value={invoice.observations} rows="4" onChange={(event) => updateField("observations", event.target.value)} /></Field>
            </div>
            <div className="invoice-bottom-actions">
              <ActionButton className="primary-button invoice-action-button" onClick={saveInvoice} disabled={!invoiceIsDirty} loading={savingAction === "invoice"}>Guardar</ActionButton>
            </div>
          </div>
          <div className="invoice-side-column">
            <div className="totals-panel">
              <TotalRow label="Subtotal" value={formatMoney(totals.subtotal)} />
              <div className="payment-register">
                <div className="payment-register-head">
                  <span>Pagos registrados</span>
                  <strong>{formatMoney(totals.payments)}</strong>
                </div>
                {payments.length ? (
                  <div className="payment-list">
                    {payments.map((payment, index) => (
                      <div className="payment-item" key={payment.id}>
                        <span>{`Abono ${index + 1}`}</span>
                        <strong>{formatMoney(payment.amount)}</strong>
                        <small>{payment.date}</small>
                        <button type="button" onClick={() => removePayment(payment.id)}>Quitar</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="payment-empty">Sin pagos registrados.</p>
                )}
                <div className="payment-entry">
                  <Field label="Fecha"><input value={invoice.paymentDate || today()} type="date" onChange={(event) => updateField("paymentDate", event.target.value)} /></Field>
                  <Field label="Valor"><input className="money-input" value={formatNumberInput(invoice.paymentAmount)} type="text" inputMode="numeric" pattern="[0-9.]*" placeholder="0" onChange={(event) => updateField("paymentAmount", onlyDigits(event.target.value))} /></Field>
                  <button className="small-button" type="button" onClick={addPayment}>Registrar pago</button>
                </div>
              </div>
              <TotalRow label="Total" value={formatMoney(totals.total)} className="total-final" />
              <TotalRow label="Saldo" value={formatMoney(totals.balance)} className="balance" />
            </div>
          </div>
        </section>
      </form>
    </section>
  );
}

function Field({ label, children, wide = false, className = "" }) {
  return <label className={`${wide ? "wide" : ""} ${className}`.trim()}>{label}{children}</label>;
}

function TotalRow({ label, value, className = "" }) {
  return <div className={`total-row ${className}`.trim()}><span>{label}</span><strong>{value}</strong></div>;
}

function ActionButton({ loading = false, loadingLabel = "Guardando...", className = "", children, disabled = false, ...rest }) {
  return (
    <button className={className} type="button" disabled={loading || disabled} {...rest}>
      {loading ? (
        <span className="btn-loading">
          <Loader2 size={16} className="btn-spin" />
          {loadingLabel}
        </span>
      ) : (
        children
      )}
    </button>
  );
}

function InvoiceHistory({ invoices, query, setQuery, openInvoice, onQuickPayment, exportExcel, startNewInvoice }) {
  const [visibleCount, setVisibleCount] = useState(LIST_PAGE_SIZE);
  useEffect(() => setVisibleCount(LIST_PAGE_SIZE), [query, invoices.length]);
  const visible = invoices.slice(0, visibleCount);
  return (
    <section className="module-view list-view invoices-view">
      <PageHeader
        eyebrow="Registro local"
        title="Facturas guardadas"
        description="Busca, abre y exporta el historial de facturacion del taller."
        icon={ReceiptText}
      >
        <button className="ghost-button" type="button" onClick={exportExcel}><Download size={17} /> Exportar Excel</button>
        <button className="primary-button" type="button" onClick={startNewInvoice}>Crear factura</button>
      </PageHeader>
      <div className="panel">
        <div className="search-row">
          <input value={query} type="search" placeholder="Buscar por cliente, placa o numero" onChange={(event) => setQuery(event.target.value)} />
        </div>
        <div className="history-list">
          {visible.length ? visible.map((item) => {
            const balance = Number(item.totals?.balance) || 0;
            return (
              <article className="history-item" key={item.id}>
                <strong>No. {item.invoiceNumber}</strong>
                <div>
                  <strong>{item.customerName} - {item.motorcycle}</strong>
                  <span>{item.invoiceDate} - {item.plate || "Sin placa"} - Saldo {formatMoney(item.totals?.balance)}</span>
                  <span className={balance > 0 ? "payment-note" : "status-pill status-paid"}>
                    {balance > 0 ? `Debe ${formatMoney(balance)}` : "Pagada"}
                  </span>
                </div>
                <div>
                  <strong>{formatMoney(item.totals?.total)}</strong>
                  {balance > 0 && (
                    <button className="small-button small-button-accent" type="button" onClick={() => onQuickPayment(item)}>Abonar</button>
                  )}
                  <button className="small-button" type="button" onClick={() => openInvoice(item)}>Abrir</button>
                </div>
              </article>
            );
          }) : <p className="empty-state">Todavia no hay facturas guardadas.</p>}
        </div>
        {invoices.length > visibleCount && (
          <div className="list-more">
            <button className="ghost-button" type="button" onClick={() => setVisibleCount((n) => n + LIST_PAGE_SIZE)}>
              Mostrar mas ({invoices.length - visibleCount} restantes)
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function OrderForm({ order, invoices, setOrder, createInvoiceFromOrder, saveOrder, printOrder, orderRecordExists, orderIsDirty, role, savingAction }) {
  const relatedInvoice = findInvoiceForOrder(order, invoices);
  const statusOptions = relatedInvoice ? orderStatuses.filter(([value]) => value === "invoiced") : orderStatuses.filter(([value]) => value !== "invoiced");
  const selectedStatus = relatedInvoice ? "invoiced" : order.status === "invoiced" ? "ready" : order.status || "received";
  const update = (field, value) => setOrder((current) => ({ ...current, [field]: field === "plate" ? normalizePlate(value) : value }));
  const canActOnSaved = orderRecordExists && !orderIsDirty;
  return (
    <section className="module-view form-view order-view">
      <PageHeader
        eyebrow="Recepcion de motos"
        title={<>Orden de ingreso <span>No. {order.orderNumber}</span></>}
        description="Registra la entrada de la moto, responsable, motivo y observaciones."
        icon={ClipboardList}
      >
        <ActionButton className="ghost-button" onClick={saveOrder} disabled={!orderIsDirty} loading={savingAction === "order"}>Guardar</ActionButton>
        {role === "admin" && (
        <ActionButton
          className="ghost-button"
          onClick={createInvoiceFromOrder}
          disabled={!relatedInvoice && !canActOnSaved}
          loading={savingAction === "createInvoiceFromOrder"}
          loadingLabel="Abriendo..."
          title={!relatedInvoice && !canActOnSaved ? "Guarda la orden antes de facturar" : undefined}
        >
          {relatedInvoice ? "Ver factura" : "Facturar"}
        </ActionButton>
        )}
        <ActionButton
          className="primary-button"
          onClick={printOrder}
          disabled={!canActOnSaved}
          loading={savingAction === "printOrder"}
          loadingLabel="Imprimiendo..."
          title={canActOnSaved ? undefined : "Guarda la orden antes de imprimir"}
        >
          Imprimir
        </ActionButton>
      </PageHeader>
      <form className="invoice-layout">
        <section className="panel">
          <div className="panel-title"><h2>Datos de ingreso</h2></div>
          <div className="form-grid">
            <Field label="Orden automatica"><input value={order.orderNumber} type="number" min="1" readOnly /></Field>
            <Field label="Fecha"><input value={order.orderDate} type="date" onChange={(event) => update("orderDate", event.target.value)} /></Field>
            <Field label="Estado">
              <select value={selectedStatus} onChange={(event) => update("status", event.target.value)}>
                {statusOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
              </select>
            </Field>
            <Field label="Atiende" wide><input value={order.attendant} type="text" placeholder="Persona que recibe la moto" onChange={(event) => update("attendant", event.target.value)} /></Field>
          </div>
        </section>
        <section className="panel">
          <div className="panel-title"><h2>Cliente y vehiculo</h2></div>
          <div className="form-grid">
            <Field label="Cliente" wide><input value={order.customerName} type="text" onChange={(event) => update("customerName", event.target.value)} /></Field>
            <Field label="Telefono"><input value={order.customerPhone} type="tel" onChange={(event) => update("customerPhone", event.target.value)} /></Field>
            <Field label="Placa"><input value={order.plate} type="text" onChange={(event) => update("plate", event.target.value)} /></Field>
            <Field label="Moto" wide><input value={order.motorcycle} type="text" placeholder="Ej: Pulsar N200" onChange={(event) => update("motorcycle", event.target.value)} /></Field>
          </div>
        </section>
        <section className="panel">
          <div className="panel-title"><h2>Trabajo solicitado</h2></div>
          <Field label="Motivo de ingreso"><textarea value={order.reason} rows="4" placeholder="Ej: Pulsar N200 por cambio de aceite" onChange={(event) => update("reason", event.target.value)} /></Field>
          <Field label="Observaciones de recepcion"><textarea value={order.observations} rows="4" placeholder="Estado, accesorios, pendientes o comentarios" onChange={(event) => update("observations", event.target.value)} /></Field>
        </section>
      </form>
    </section>
  );
}

function OrderHistory({
  orders,
  invoices,
  query,
  setQuery,
  statusFilter,
  setStatusFilter,
  openOrder,
  createInvoiceFromOrder,
  openInvoiceFromOrder,
  updateOrderStatus,
  startNewOrder,
  role,
}) {
  const [visibleCount, setVisibleCount] = useState(LIST_PAGE_SIZE);
  useEffect(() => setVisibleCount(LIST_PAGE_SIZE), [query, statusFilter, orders.length]);
  const visible = orders.slice(0, visibleCount);
  return (
    <section className="module-view list-view orders-view">
      <PageHeader
        eyebrow="Recepcion de motos"
        title="Ordenes de ingreso"
        description="Consulta las motos recibidas, responsables y motivos de ingreso."
        icon={ClipboardList}
      >
        <button className="primary-button" type="button" onClick={startNewOrder}><Plus size={17} /> Crear ingreso</button>
      </PageHeader>
      <section className="panel">
        <div className="search-row">
          <input value={query} type="search" placeholder="Buscar por cliente, moto, placa o quien atiende" onChange={(event) => setQuery(event.target.value)} />
          <select className="filter-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">Todos los estados</option>
            {orderStatuses.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
        </div>
        <div className="order-list">
          {visible.length ? visible.map((item) => (
            (() => {
              const billing = orderBillingState(item, invoices);
              const isInvoiced = Boolean(findInvoiceForOrder(item, invoices));
              const statusOptions = isInvoiced ? orderStatuses.filter(([value]) => value === "invoiced") : orderStatuses.filter(([value]) => value !== "invoiced");
              const selectedStatus = isInvoiced ? "invoiced" : item.status === "invoiced" ? "ready" : item.status || "received";
              return (
                <article className="history-item" key={item.id}>
                  <strong>No. {item.orderNumber}</strong>
                  <div>
                    <strong>{item.motorcycle} - {item.reason}</strong>
                    <span>{item.orderDate} - {item.customerName} - Atiende: {item.attendant}</span>
                    <span className={`status-pill ${billing.className}`}>
                      {billing.label}
                      {billing.invoiceNumber ? ` - Factura ${billing.invoiceNumber}` : ""}
                    </span>
                    {billing.paymentInfo && <span className="payment-note">{billing.paymentInfo}</span>}
                  </div>
                  <div className="history-actions">
                    <select
                      className="quick-status-select"
                      value={selectedStatus}
                      onChange={(event) => updateOrderStatus(item, event.target.value)}
                      aria-label={`Cambiar estado de la orden ${item.orderNumber}`}
                    >
                      {statusOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                    </select>
                    <button className="small-button" type="button" onClick={() => openOrder(item)}>Abrir</button>
                    {role === "admin" && (
                      <button className="small-button" type="button" onClick={() => (isInvoiced ? openInvoiceFromOrder(item) : createInvoiceFromOrder(item))}>
                        {isInvoiced ? "Ver factura" : "Facturar"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })()
          )) : <p className="empty-state">Todavia no hay ordenes de ingreso guardadas.</p>}
        </div>
        {orders.length > visibleCount && (
          <div className="list-more">
            <button className="ghost-button" type="button" onClick={() => setVisibleCount((n) => n + LIST_PAGE_SIZE)}>
              Mostrar mas ({orders.length - visibleCount} restantes)
            </button>
          </div>
        )}
      </section>
    </section>
  );
}

function Inventory({ partForm, setPartForm, parts, query, setQuery, savePart, editPart, deletePart, partFormIsDirty, savingAction }) {
  const update = (field, value) => setPartForm((current) => ({ ...current, [field]: value }));
  return (
    <section className="module-view inventory-view">
      <PageHeader
        eyebrow="Catalogo de repuestos"
        title="Inventario"
        description="Administra codigos, precios de venta y existencias disponibles."
        icon={Boxes}
      >
        <ActionButton className="primary-button" onClick={savePart} disabled={!partFormIsDirty} loading={savingAction === "part"}>Guardar repuesto</ActionButton>
      </PageHeader>
      <section className="panel inventory-editor">
        <div className="panel-title">
          <h2>{partForm.id ? "Editar repuesto" : "Nuevo repuesto"}</h2>
          <span className="panel-chip">{parts.length} registrados</span>
        </div>
        <div className="form-grid">
          <Field label="Codigo"><input value={partForm.code} type="text" placeholder="Ej: 002k" onChange={(event) => update("code", event.target.value)} /></Field>
          <Field label="Repuesto" wide><input value={partForm.name} type="text" placeholder="Ej: Balineras" onChange={(event) => update("name", event.target.value)} /></Field>
          <Field label="Precio venta"><input value={partForm.price} type="number" min="0" step="100" onChange={(event) => update("price", event.target.value)} /></Field>
          <Field label="Stock"><input value={partForm.stock} type="number" min="0" step="1" onChange={(event) => update("stock", event.target.value)} /></Field>
        </div>
      </section>
      <section className="panel inventory-register">
        <div className="search-row">
          <input value={query} type="search" placeholder="Buscar por repuesto o codigo" onChange={(event) => setQuery(event.target.value)} />
        </div>
        <div className="inventory-list">
          {parts.length ? parts.map((item) => (
            <article className="inventory-item" key={item.id}>
              <span className="inventory-code">{item.code}</span>
              <div>
                <strong>{item.name}</strong>
                <span>{formatMoney(item.price)} - Stock: {item.stock}</span>
              </div>
              <div>
                <button className="small-button" type="button" onClick={() => editPart(item)}>Editar</button>
                <button className="small-button" type="button" onClick={() => deletePart(item.id)}>Eliminar</button>
              </div>
            </article>
          )) : <p className="empty-state">Todavia no hay repuestos en inventario.</p>}
        </div>
      </section>
    </section>
  );
}

function Settings({ settings, setSettings, meta, setMeta, nextInvoice, saveSettings, settingsIsDirty, savingAction }) {
  const update = (field, value) => setSettings((current) => ({ ...current, [field]: value }));
  return (
    <section className="module-view settings-view">
      <PageHeader
        eyebrow="Configuracion"
        title="Datos del taller"
        description="Controla los datos legales, contacto, cuenta bancaria y consecutivo."
        icon={Wrench}
      >
        <ActionButton className="primary-button" onClick={saveSettings} disabled={!settingsIsDirty} loading={savingAction === "settings"}>Guardar datos</ActionButton>
      </PageHeader>
      <section className="panel">
        <div className="panel-title">
          <h2>Informacion comercial</h2>
          <span className="panel-chip">Factura No. {meta.nextInvoiceNumber || nextInvoice}</span>
        </div>
        <div className="form-grid">
          <Field label="Nombre legal"><input value={settings.shopOwner || ""} type="text" onChange={(event) => update("shopOwner", event.target.value)} /></Field>
          <Field label="Cedula / NIT"><input value={settings.shopId || ""} type="text" onChange={(event) => update("shopId", event.target.value)} /></Field>
          <Field label="Direccion" wide><input value={settings.shopAddress || ""} type="text" onChange={(event) => update("shopAddress", event.target.value)} /></Field>
          <Field label="Telefono"><input value={settings.shopPhone || ""} type="text" onChange={(event) => update("shopPhone", event.target.value)} /></Field>
          <Field label="Correo"><input value={settings.shopEmail || ""} type="email" onChange={(event) => update("shopEmail", event.target.value)} /></Field>
          <Field label="Cuenta bancaria" wide><input value={settings.shopBank || ""} type="text" onChange={(event) => update("shopBank", event.target.value)} /></Field>
          <Field label="Proxima factura"><input value={meta.nextInvoiceNumber || nextInvoice} type="number" min="1" step="1" onChange={(event) => setMeta((current) => ({ ...current, nextInvoiceNumber: event.target.value }))} /></Field>
        </div>
      </section>
    </section>
  );
}

function UsersView({ users, onCreate, onDelete }) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", displayName: "", role: "user" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  function openModal() {
    setForm({ username: "", password: "", displayName: "", role: "user" });
    setError("");
    setShowModal(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await onCreate(form);
      setShowModal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="module-view users-view">
      <PageHeader
        eyebrow="Administracion"
        title="Usuarios"
        description="Crea accesos para tu equipo. Los usuarios sin rol administrador no ven facturacion, ganancias ni reportes."
        icon={Users}
      >
        <button className="primary-button" type="button" onClick={openModal}>
          <UserPlus size={16} strokeWidth={2.4} /> Crear usuario
        </button>
      </PageHeader>
      {showModal && (
        <div className="modal-backdrop" role="presentation">
          <section className="confirm-modal form-modal" role="dialog" aria-modal="true" aria-labelledby="createUserTitle">
            <span className="modal-kicker">Nuevo usuario</span>
            <h2 id="createUserTitle">Crear usuario</h2>
            <form className="form-grid" onSubmit={handleSubmit}>
              <Field label="Cedula">
                <input value={form.username} type="text" inputMode="numeric" required autoFocus onChange={(event) => update("username", event.target.value)} />
              </Field>
              <Field label="Nombre">
                <input value={form.displayName} type="text" onChange={(event) => update("displayName", event.target.value)} />
              </Field>
              <Field label="Contrasena">
                <input value={form.password} type="password" required onChange={(event) => update("password", event.target.value)} />
              </Field>
              <Field label="Rol">
                <select value={form.role} onChange={(event) => update("role", event.target.value)}>
                  <option value="user">Usuario (sin facturacion)</option>
                  <option value="admin">Administrador</option>
                </select>
              </Field>
              {error && <p className="login-error">{error}</p>}
              <div className="modal-actions">
                <button className="primary-button" type="submit" disabled={submitting}>
                  {submitting ? "Creando..." : "Crear usuario"}
                </button>
                <button className="ghost-button" type="button" onClick={() => setShowModal(false)}>Cancelar</button>
              </div>
            </form>
          </section>
        </div>
      )}
      <section className="panel">
        <div className="panel-title">
          <h2>Usuarios existentes</h2>
          <span className="panel-chip">{users.length} registrados</span>
        </div>
        <div className="inventory-list">
          {users.length ? users.map((user) => (
            <article className="inventory-item" key={user.id}>
              <span className="inventory-code">{user.username}</span>
              <div>
                <strong>{user.displayName || user.username}</strong>
                <span>{user.role === "admin" ? "Administrador" : "Usuario"}</span>
              </div>
              <div>
                <button className="small-button" type="button" onClick={() => onDelete(user.id)}>
                  <Trash2 size={14} strokeWidth={2.4} /> Eliminar
                </button>
              </div>
            </article>
          )) : <p className="empty-state">Todavia no hay usuarios creados.</p>}
        </div>
      </section>
    </section>
  );
}

const chartAxisTick = { fontSize: 11.5, fill: "#898781", fontWeight: 600 };
const chartCategoryTick = { fontSize: 12.5, fill: "#1a2b20", fontWeight: 700 };
const chartGridColor = "#ecebe4";
const chartAxisLine = { stroke: "#d8d6cc" };
const ordinalBlueRamp = ["#a9cdf5", "#6da7ec", "#2a78d6", "#0d4d94"];

function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload || !payload.length) return null;
  const heading = payload[0]?.payload?.rangeLabel || label;
  return (
    <div className="chart-tooltip">
      {heading && <div className="chart-tooltip-label">{heading}</div>}
      {payload.map((entry, index) => (
        <div className="chart-tooltip-row" key={entry.dataKey || entry.name || index}>
          <span className="chart-tooltip-dot" style={{ background: entry.color || entry.fill || entry.payload?.fill }} />
          <span className="chart-tooltip-name">{entry.name || "Valor"}</span>
          <strong className="chart-tooltip-value">{formatter ? formatter(entry.value) : entry.value}</strong>
        </div>
      ))}
    </div>
  );
}

function ChartPanelTitle({ icon: Icon, title }) {
  return (
    <div className="panel-title chart-panel-title">
      <span className="chart-title-icon"><Icon size={16} strokeWidth={2.4} /></span>
      <h2>{title}</h2>
    </div>
  );
}

function RevenueChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="statsRevenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a78d6" stopOpacity={0.32} />
            <stop offset="100%" stopColor="#2a78d6" stopOpacity={0.01} />
          </linearGradient>
          <linearGradient id="statsRevenueLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1c5cab" />
            <stop offset="100%" stopColor="#3987e5" />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={chartGridColor} vertical={false} />
        <XAxis dataKey="label" tick={chartAxisTick} axisLine={chartAxisLine} tickLine={false} />
        <YAxis
          tick={chartAxisTick}
          axisLine={false}
          tickLine={false}
          width={72}
          tickFormatter={(value) => formatMoney(value)}
        />
        <Tooltip
          content={<ChartTooltip formatter={(value) => formatMoney(value)} />}
          cursor={{ stroke: "#c3c2b7", strokeWidth: 1, strokeDasharray: "3 3" }}
        />
        <Area
          type="monotone"
          dataKey="value"
          name="Facturado"
          stroke="url(#statsRevenueLine)"
          strokeWidth={2.5}
          fill="url(#statsRevenueFill)"
          dot={{ r: 3, fill: "#1c5cab", strokeWidth: 0 }}
          activeDot={{ r: 5, fill: "#1c5cab", stroke: "#fff", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function OrdersPeriodChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="statsOrdersFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1baf7a" />
            <stop offset="100%" stopColor="#0d8a5c" />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={chartGridColor} vertical={false} />
        <XAxis dataKey="label" tick={chartAxisTick} axisLine={chartAxisLine} tickLine={false} />
        <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} allowDecimals={false} width={30} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(27, 175, 122, 0.08)" }} />
        <Bar dataKey="value" name="Ordenes" fill="url(#statsOrdersFill)" radius={[4, 4, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}


function OrderStatusChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={chartGridColor} vertical={false} />
        <XAxis dataKey="label" tick={chartAxisTick} axisLine={chartAxisLine} tickLine={false} />
        <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} allowDecimals={false} width={30} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(11,11,11,0.03)" }} />
        <Bar dataKey="value" name="Ordenes" radius={[4, 4, 0, 0]} maxBarSize={48}>
          {data.map((entry, index) => (
            <Cell key={entry.label} fill={ordinalBlueRamp[index % ordinalBlueRamp.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function Statistics({ invoices, orders }) {
  const [granularity, setGranularity] = useState("day");
  const [selectedDate, setSelectedDate] = useState(() => nowInWorkshopTimezone());
  const dateInputRef = useRef(null);

  const breakdown = useMemo(
    () => buildPeriodBreakdown(granularity, selectedDate),
    [granularity, selectedDate],
  );

  const revenueSeries = useMemo(
    () => aggregateByBucket(invoices, "invoiceDate", breakdown.subGranularity, breakdown.buckets, (invoice) => Number(invoice.totals?.total) || 0),
    [invoices, breakdown],
  );

  const ordersSeries = useMemo(
    () => aggregateByBucket(orders, "orderDate", breakdown.subGranularity, breakdown.buckets, () => 1),
    [orders, breakdown],
  );

  const todayKey = bucketKeyFor(nowInWorkshopTimezone(), granularity);
  const currentKey = bucketKeyFor(selectedDate, granularity);
  const currentRangeLabel = formatBucketRangeLabel(currentKey, granularity);
  const isLatestPeriod = currentKey === todayKey;

  function changeGranularity(value) {
    setGranularity(value);
    setSelectedDate(nowInWorkshopTimezone());
  }

  function goToPreviousPeriod() {
    setSelectedDate((prev) => shiftBucket(prev, granularity, -1));
  }

  function goToNextPeriod() {
    setSelectedDate((prev) => {
      const next = shiftBucket(prev, granularity, 1);
      const now = nowInWorkshopTimezone();
      return next > now ? now : next;
    });
  }

  function openCalendarPicker() {
    const input = dateInputRef.current;
    if (!input) return;
    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
        return;
      } catch {
        // fall through to focus
      }
    }
    input.focus();
  }

  function handleCalendarChange(event) {
    const picked = parseLocalDate(event.target.value);
    if (!picked) return;
    const now = nowInWorkshopTimezone();
    setSelectedDate(picked > now ? now : picked);
  }

  const invoicesInPeriod = useMemo(
    () => invoices.filter((invoice) => {
      const date = parseLocalDate(invoice.invoiceDate);
      return date && bucketKeyFor(date, granularity) === currentKey;
    }),
    [invoices, currentKey, granularity],
  );
  const periodRevenue = invoicesInPeriod.reduce((sum, invoice) => sum + (Number(invoice.totals?.total) || 0), 0);
  const periodInvoiceCount = invoicesInPeriod.length;
  const averageTicket = periodInvoiceCount ? periodRevenue / periodInvoiceCount : 0;
  const pendingBalance = invoices.reduce((sum, invoice) => sum + (Number(invoice.totals?.balance) || 0), 0);

  const paymentTotals = useMemo(() => {
    let cash = 0;
    let transfer = 0;
    invoicesInPeriod.forEach((invoice) => {
      const method = normalizeText(invoice.paymentMethod || "efectivo");
      const total = Number(invoice.totals?.total) || 0;
      if (method === "transferencia") transfer += total;
      else cash += total;
    });
    return { cash, transfer };
  }, [invoicesInPeriod]);

  const ordersInPeriod = useMemo(
    () => orders.filter((order) => {
      const date = parseLocalDate(order.orderDate);
      return date && bucketKeyFor(date, granularity) === currentKey;
    }),
    [orders, currentKey, granularity],
  );
  const periodOrdersCount = ordersInPeriod.length;

  const statusSeries = useMemo(() => {
    const counts = { received: 0, working: 0, ready: 0, invoiced: 0 };
    ordersInPeriod.forEach((order) => {
      const billed = Boolean(findInvoiceForOrder(order, invoices));
      const status = billed ? "invoiced" : order.status === "invoiced" ? "ready" : order.status || "received";
      counts[status] = (counts[status] || 0) + 1;
    });
    return orderStatuses.map(([value, label]) => ({ label, value: counts[value] || 0 }));
  }, [ordersInPeriod, invoices]);

  return (
    <section className="module-view statistics-view">
      <PageHeader
        eyebrow="Analitica del taller"
        title="Estadisticas"
        description="Facturacion, ingresos y repuestos en el tiempo. Filtra por periodo para ver la tendencia."
        icon={BarChart3}
      />
      <div className="period-bar">
        <div className="period-toggle" role="group" aria-label="Periodo">
          {statsPeriods.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={granularity === value ? "is-active" : ""}
              onClick={() => changeGranularity(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="period-nav" role="group" aria-label="Navegar periodo">
          <button
            type="button"
            className="period-nav-btn"
            onClick={goToPreviousPeriod}
            aria-label="Periodo anterior"
          >
            <ChevronLeft size={16} strokeWidth={2.4} />
          </button>
          <button
            type="button"
            className="period-nav-label"
            onClick={openCalendarPicker}
            aria-label="Elegir fecha"
          >
            <CalendarDays size={14} strokeWidth={2.4} />
            {currentRangeLabel}
          </button>
          <input
            ref={dateInputRef}
            type="date"
            className="period-nav-date-input"
            value={formatDateKey(selectedDate)}
            max={formatDateKey(nowInWorkshopTimezone())}
            onChange={handleCalendarChange}
            aria-hidden="true"
            tabIndex={-1}
          />
          <button
            type="button"
            className="period-nav-btn"
            onClick={goToNextPeriod}
            disabled={isLatestPeriod}
            aria-label="Periodo siguiente"
          >
            <ChevronRight size={16} strokeWidth={2.4} />
          </button>
        </div>
      </div>

      <section className="dashboard-stats">
        <Stat icon={WalletCards} label={`Facturado (${currentRangeLabel})`} value={formatMoney(periodRevenue)} className="is-total-billed" />
        <Stat icon={ClipboardList} label={`Ordenes (${currentRangeLabel})`} value={periodOrdersCount} />
        <Stat icon={ReceiptText} label="Ticket promedio" value={formatMoney(averageTicket)} />
        <Stat icon={WalletCards} label="Cartera pendiente" value={formatMoney(pendingBalance)} />
      </section>

      <section className="stats-grid">
        <div className="panel chart-panel chart-panel-wide">
          <ChartPanelTitle icon={TrendingUp} title="Facturacion en el tiempo" />
          <RevenueChart data={revenueSeries} />
        </div>
        <div className="panel chart-panel chart-panel-wide">
          <ChartPanelTitle icon={ClipboardList} title="Ordenes por periodo" />
          <OrdersPeriodChart data={ordersSeries} />
        </div>
        <div className="panel chart-panel">
          <ChartPanelTitle icon={WalletCards} title="Formas de pago" />
          <div className="payment-method-stats">
            <Stat icon={WalletCards} label={`Efectivo (${currentRangeLabel})`} value={formatMoney(paymentTotals.cash)} />
            <Stat icon={Landmark} label={`Transferencia (${currentRangeLabel})`} value={formatMoney(paymentTotals.transfer)} />
          </div>
        </div>
        <div className="panel chart-panel">
          <ChartPanelTitle icon={Layers} title={`Ordenes por estado (${currentRangeLabel})`} />
          <OrderStatusChart data={statusSeries} />
        </div>
      </section>
    </section>
  );
}

function renderPrintPageStyle(format) {
  const page = format === "roll"
    ? "@page { size: 80mm auto; margin: 4mm; }"
    : "@page { size: letter; margin: 4mm 8mm 8mm; }";
  return `<style media="print">${page}</style>`;
}

function renderPrintInvoice(invoice, settings, format = "letter") {
  const payments = normalizePayments(invoice);
  const showPaymentBreakdown = payments.length > 1;
  const paymentRows = showPaymentBreakdown ? payments
    .map((payment, index) => `
      <p><strong>Abono ${index + 1}:</strong> ${formatMoney(payment.amount)} - ${escapeHtml(payment.date)}</p>
    `)
    .join("") : "";
  const hasDiscounts = invoice.items.some((item) => Number(item.discount) > 0);
  const items = invoice.items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(printableItemName(item.description))}</td>
          <td>${item.quantity}</td>
          ${hasDiscounts ? `<td>${formatMoney(item.discount)}</td>` : ""}
          <td>${formatMoney(item.price)}</td>
          <td>${formatMoney(item.subtotal)}</td>
        </tr>
      `,
    )
    .join("");

  if (format === "roll") {
    const rollItems = invoice.items
      .map(
        (item) => `
          <tr>
            <td>
              <strong>${escapeHtml(printableItemName(item.description))}</strong>
              <span>${item.quantity} x ${formatMoney(item.price)}${Number(item.discount) ? ` / Dto ${formatMoney(item.discount)}` : ""}</span>
            </td>
            <td>${formatMoney(item.subtotal)}</td>
          </tr>
        `,
      )
      .join("");

    return `
      ${renderPrintPageStyle("roll")}
      <article class="print-invoice print-roll">
        <header class="print-roll-header">
          <img class="print-roll-logo" src="${masterLogoSrc}" alt="Master Motos" />
          <strong>Master Motos</strong>
          <span>Medellin</span>
          <span>${escapeHtml(settings.shopPhone)}</span>
          <b>Factura No. ${invoice.invoiceNumber}</b>
          <span>${invoice.invoiceDate || ""}</span>
        </header>

        <section class="print-roll-block">
          <p><strong>Cliente:</strong> ${escapeHtml(invoice.customerName)}</p>
          <p><strong>Tel:</strong> ${escapeHtml(invoice.customerPhone || "Sin telefono")}</p>
          <p><strong>Moto:</strong> ${escapeHtml(invoice.motorcycle || "Sin moto")} ${invoice.plate ? `- ${escapeHtml(invoice.plate)}` : ""}</p>
        </section>

        <table class="print-roll-items">
          <tbody>${rollItems}</tbody>
        </table>

        <table class="print-roll-totals">
          <tbody>
            <tr><td>Subtotal</td><td>${formatMoney(invoice.totals.subtotal)}</td></tr>
            <tr><td>Abonos</td><td>${formatMoney(invoice.totals.payments)}</td></tr>
            <tr class="print-total-final"><td>Total</td><td>${formatMoney(invoice.totals.total)}</td></tr>
            <tr><td>Saldo</td><td>${formatMoney(invoice.totals.balance)}</td></tr>
          </tbody>
        </table>

        <section class="print-roll-block">
          <p><strong>Forma de pago:</strong> ${escapeHtml(invoice.paymentMethod || "No especificada")}</p>
          ${paymentRows}
          ${invoice.dueDate ? `<p><strong>Garantia hasta:</strong> ${escapeHtml(invoice.dueDate)}</p>` : ""}
          ${invoice.note ? `<div class="print-note-box"><span>Nota</span><p>${escapeHtml(invoice.note)}</p></div>` : ""}
          ${invoice.observations ? `<div class="print-note-box"><span>Observaciones</span><p>${escapeHtml(invoice.observations)}</p></div>` : ""}
        </section>

        <footer class="print-roll-footer">
          <span>Recibe: ${escapeHtml(settings.shopOwner)}</span>
          <span>Gracias por su compra</span>
        </footer>
      </article>
    `;
  }

  return `
    ${renderPrintPageStyle("letter")}
    <article class="print-invoice print-invoice-compact">
      <header class="print-compact-header">
        <div class="print-brand-block">
          <img class="print-brand-logo" src="${masterLogoSrc}" alt="Master Motos" />
          <div>
            <div class="print-brand-name">Master Motos</div>
            <div class="print-brand-subtitle">Medellin</div>
          </div>
        </div>
        <div class="print-document-id">
          <strong>Factura No. ${invoice.invoiceNumber}</strong>
          <span>${invoice.invoiceDate || ""}</span>
        </div>
      </header>

      <section class="print-info-grid">
        <div class="print-info-card">
          <span>Cliente</span>
          <strong>${escapeHtml(invoice.customerName)}</strong>
          <p>${escapeHtml(invoice.customerAddress || "Sin direccion")}</p>
          <p>${escapeHtml(invoice.customerPhone || "Sin telefono")}</p>
          <p>${escapeHtml(invoice.motorcycle || "Sin moto")} ${invoice.plate ? `- Placa ${escapeHtml(invoice.plate)}` : ""}</p>
        </div>
        <div class="print-info-card">
          <span>Recibe pago</span>
          <strong>${escapeHtml(settings.shopOwner)}</strong>
          <p>${escapeHtml(settings.shopId)}</p>
          <p>${escapeHtml(settings.shopPhone)} ${settings.shopEmail ? `- ${escapeHtml(settings.shopEmail)}` : ""}</p>
          <p>${escapeHtml(settings.shopBank)}</p>
          <p><strong>Forma de pago:</strong> ${escapeHtml(invoice.paymentMethod || "No especificada")}</p>
          ${paymentRows}
          ${invoice.dueDate ? `<p><strong>Garantia hasta:</strong> ${escapeHtml(invoice.dueDate)}</p>` : ""}
        </div>
      </section>

      <table class="print-items ${hasDiscounts ? "" : "no-discount"}">
        <thead>
          <tr><th>Descripcion</th><th>Cant.</th>${hasDiscounts ? "<th>Dto</th>" : ""}<th>Precio</th><th>Subtotal</th></tr>
        </thead>
        <tbody>${items}</tbody>
      </table>

      <section class="print-lower-grid">
        <div class="print-totals-box">
          <table class="print-totals">
            <tbody>
              <tr><td>Subtotal</td><td>${formatMoney(invoice.totals.subtotal)}</td></tr>
              <tr><td>Abonos</td><td>${formatMoney(invoice.totals.payments)}</td></tr>
              <tr class="print-total-final"><td>Total</td><td>${formatMoney(invoice.totals.total)}</td></tr>
              <tr><td>Saldo</td><td>${formatMoney(invoice.totals.balance)}</td></tr>
            </tbody>
          </table>
        </div>
        <div class="print-notes">
          ${invoice.note ? `<div class="print-note-box"><span>Nota</span><p>${escapeHtml(invoice.note)}</p></div>` : ""}
          ${invoice.observations ? `<div class="print-note-box"><span>Observaciones</span><p>${escapeHtml(invoice.observations)}</p></div>` : ""}
        </div>
      </section>

      <div class="print-footer">
        <div class="print-signature">Firma - ${escapeHtml(settings.shopOwner)}</div>
        <div class="print-signature">Recibido por</div>
      </div>
    </article>
  `;
}

function renderPrintOrder(order, settings) {
  return `
    ${renderPrintPageStyle("letter")}
    <article class="print-invoice print-invoice-compact print-order">
      <header class="print-compact-header">
        <div class="print-brand-block">
          <img class="print-brand-logo" src="${masterLogoSrc}" alt="Master Motos" />
          <div>
            <div class="print-brand-name">Master Motos</div>
            <div class="print-brand-subtitle">Medellin - Recepcion de motos</div>
          </div>
        </div>
        <div class="print-document-id">
          <strong>Orden No. ${order.orderNumber}</strong>
          <span>${escapeHtml(order.orderDate || "")}</span>
        </div>
      </header>

      <section class="print-info-grid">
        <div class="print-info-card">
          <span>Cliente y vehiculo</span>
          <strong>${escapeHtml(order.customerName || "Sin cliente")}</strong>
          <p>${escapeHtml(order.customerPhone || "Sin telefono")}</p>
          <p>${escapeHtml(order.motorcycle || "Sin moto")} ${order.plate ? `- Placa ${escapeHtml(order.plate)}` : ""}</p>
        </div>
        <div class="print-info-card">
          <span>Recibe taller</span>
          <strong>${escapeHtml(order.attendant || "Sin responsable")}</strong>
          <p>${escapeHtml(settings.shopOwner)}</p>
          <p>${escapeHtml(settings.shopPhone)} ${settings.shopEmail ? `- ${escapeHtml(settings.shopEmail)}` : ""}</p>
        </div>
      </section>

      <table class="print-order-table">
        <tbody>
          <tr>
            <th>Trabajo solicitado</th>
            <td>${escapeHtml(order.reason || "Sin motivo registrado")}</td>
          </tr>
          <tr>
            <th>Observaciones de recepcion</th>
            <td>${escapeHtml(order.observations || "Sin observaciones")}</td>
          </tr>
        </tbody>
      </table>

      <div class="print-footer">
        <div class="print-signature">Recibe taller - ${escapeHtml(order.attendant || "")}</div>
        <div class="print-signature">Entrega cliente</div>
      </div>
    </article>
  `;
}
