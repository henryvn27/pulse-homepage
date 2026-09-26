import assert from "node:assert/strict";
import {
  defaultWidgetOrder,
  GITHUB_PROJECTS_URL,
  migrateLegacyPulsePreferences,
  moveItem,
  moveWidget,
  normalizeWidgetOrder,
} from "../src/customization.js";

assert.deepEqual(normalizeWidgetOrder(["linear", "linear", "unknown"]), ["projects", "reminders", "calendar"]);
assert.deepEqual(moveWidget(defaultWidgetOrder, "calendar", -1), ["calendar", "reminders", "projects"]);
assert.deepEqual(moveWidget(defaultWidgetOrder, "reminders", -1), defaultWidgetOrder);
assert.deepEqual(moveItem([{ id: 1 }, { id: 2 }], 2, -1).map(({ id }) => id), [2, 1]);

const values = new Map([
  ["pulse-shortcuts", JSON.stringify([
    { id: 1, label: "Linear", url: "https://linear.app", icon: "linear" },
    { id: 2, label: "GitHub", url: "https://github.com", icon: "github" },
  ])],
  ["pulse-widget-order", JSON.stringify(["linear", "calendar", "reminders"])],
  ["pulse-widget-visibility", JSON.stringify({ summary: false, linear: false, reminders: true })],
  ["pulse-linear-token", "test-token-that-must-be-removed"],
]);
const storage = {
  getItem: (key) => values.has(key) ? values.get(key) : null,
  setItem: (key, value) => values.set(key, value),
  removeItem: (key) => values.delete(key),
};
migrateLegacyPulsePreferences(storage);
assert.equal(values.has("pulse-linear-token"), false);
assert.deepEqual(JSON.parse(values.get("pulse-shortcuts")), [
  { id: 1, label: "Projects", url: GITHUB_PROJECTS_URL, icon: "projects" },
  { id: 2, label: "GitHub", url: "https://github.com", icon: "github" },
]);
assert.deepEqual(JSON.parse(values.get("pulse-widget-order")), ["projects", "calendar", "reminders"]);
assert.deepEqual(JSON.parse(values.get("pulse-widget-visibility")), { summary: false, projects: false, reminders: true });

console.log("Customization checks passed.");
