import assert from "node:assert/strict";
import { defaultWidgetOrder, moveItem, moveWidget, normalizeWidgetOrder } from "../src/customization.js";

assert.deepEqual(normalizeWidgetOrder(["linear", "linear", "unknown"]), ["linear", "reminders", "calendar"]);
assert.deepEqual(moveWidget(defaultWidgetOrder, "calendar", -1), ["calendar", "reminders", "linear"]);
assert.deepEqual(moveWidget(defaultWidgetOrder, "reminders", -1), defaultWidgetOrder);
assert.deepEqual(moveItem([{ id: 1 }, { id: 2 }], 2, -1).map(({ id }) => id), [2, 1]);

console.log("Customization checks passed.");
