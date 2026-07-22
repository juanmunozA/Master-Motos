function normalizeData(data = {}) {
  return {
    invoices: Array.isArray(data.invoices) ? data.invoices : [],
    orders: Array.isArray(data.orders) ? data.orders : [],
    parts: Array.isArray(data.parts) ? data.parts : [],
    settings: data.settings || null,
    meta: data.meta || {},
  };
}

module.exports = { normalizeData };
