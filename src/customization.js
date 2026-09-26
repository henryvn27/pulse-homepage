export const GITHUB_PROJECTS_URL = "https://github.com/users/henryvn27/projects";

export const defaultWidgetOrder = ["reminders", "calendar", "projects"];

export const defaultWidgetVisibility = {
  summary: true,
  reminders: true,
  calendar: true,
  projects: true,
};

export const widgetLabels = {
  reminders: "Reminders",
  calendar: "Calendar",
  projects: "Projects",
};

export function normalizeWidgetOrder(order) {
  const migrated = Array.isArray(order) ? order.map((key) => key === "linear" ? "projects" : key) : [];
  const valid = migrated.filter((key) => defaultWidgetOrder.includes(key));
  return [...new Set([...valid, ...defaultWidgetOrder])];
}

function migrateShortcut(shortcut) {
  if (!shortcut || typeof shortcut.url !== "string") return shortcut;
  try {
    const host = new URL(shortcut.url).hostname.toLowerCase();
    if (host !== "linear.app" && !host.endsWith(".linear.app")) return shortcut;
    return { ...shortcut, label: "Projects", url: GITHUB_PROJECTS_URL, icon: "projects" };
  } catch {
    return shortcut;
  }
}

function migrateStoredJson(storage, key, migrate) {
  try {
    const raw = storage.getItem(key);
    if (raw === null) return;
    const before = JSON.parse(raw);
    const after = migrate(before);
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      storage.setItem(key, JSON.stringify(after));
    }
  } catch {
    // Preserve malformed or unavailable local state rather than replacing it.
  }
}

export function migrateLegacyPulsePreferences(storage) {
  if (!storage) return;

  migrateStoredJson(storage, "pulse-shortcuts", (shortcuts) => (
    Array.isArray(shortcuts) ? shortcuts.map(migrateShortcut) : shortcuts
  ));
  migrateStoredJson(storage, "pulse-widget-order", normalizeWidgetOrder);
  migrateStoredJson(storage, "pulse-widget-visibility", (visibility) => {
    if (!visibility || typeof visibility !== "object" || Array.isArray(visibility)) return visibility;
    const migrated = { ...visibility };
    if (migrated.projects === undefined && migrated.linear !== undefined) {
      migrated.projects = migrated.linear;
    }
    delete migrated.linear;
    return migrated;
  });

  try {
    // Remove only the credential this app stored for its retired Linear client.
    storage.removeItem("pulse-linear-token");
  } catch {
    // The dashboard still works if browser storage is unavailable.
  }
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
