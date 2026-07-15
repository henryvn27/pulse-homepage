export const defaultWidgetOrder = ["reminders", "calendar", "linear"];

export const defaultWidgetVisibility = {
  summary: true,
  reminders: true,
  calendar: true,
  linear: true,
};

export const widgetLabels = {
  reminders: "Reminders",
  calendar: "Calendar",
  linear: "Linear progress",
};

export function normalizeWidgetOrder(order) {
  const valid = Array.isArray(order) ? order.filter((key) => defaultWidgetOrder.includes(key)) : [];
  return [...new Set([...valid, ...defaultWidgetOrder])];
}

export function moveWidget(order, key, offset) {
  const normalized = normalizeWidgetOrder(order);
  return moveItem(normalized, key, offset);
}

export function moveItem(items, key, offset) {
  const next = [...items];
  const from = next.findIndex((item) => (typeof item === "object" ? item.id : item) === key);
  const to = from + offset;
  if (from < 0 || to < 0 || to >= next.length) return next;
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}
