const NATIVE_HOST = import.meta.env.VITE_NATIVE_HOST || "com.henry.Pulse";

const unavailableSource = (noun) => ({
  status: "setup",
  message: `Open the Pulse Safari extension to connect ${noun}.`,
});

export function hasNativeBridge() {
  return globalThis.location?.protocol === "safari-web-extension:"
    && typeof globalThis.browser?.runtime?.sendNativeMessage === "function";
}

async function sendNativeMessage(message) {
  if (!hasNativeBridge()) throw new Error("Pulse is running as a standalone file.");
  const response = await globalThis.browser.runtime.sendNativeMessage(NATIVE_HOST, message);
  return response?.message ?? response;
}

async function loadWeather() {
  const params = new URLSearchParams({
    latitude: "33.7748",
    longitude: "-84.2963",
    current: "temperature_2m,apparent_temperature,weather_code,is_day",
    daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset",
    temperature_unit: "fahrenheit",
    timezone: "America/New_York",
    forecast_days: "3",
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!response.ok) throw new Error(`Weather request failed (${response.status}).`);
  const data = await response.json();
  return { status: "ok", location: "Decatur", current: data.current, daily: data.daily };
}

async function loadNativeSources(force) {
  if (!hasNativeBridge()) {
    return {
      calendar: { ...unavailableSource("Calendar"), events: [] },
      reminders: { ...unavailableSource("Reminders"), reminders: [], total: 0 },
    };
  }

  try {
    const result = await sendNativeMessage({ action: "dashboard", force });
    if (result?.status === "error") throw new Error(result.message || "The Pulse extension could not load data.");
    return result.sources;
  } catch (error) {
    const source = { status: "error", message: error.message };
    return {
      calendar: { ...source, events: [] },
      reminders: { ...source, reminders: [], total: 0 },
    };
  }
}

export async function loadDashboardData(force = false) {
  const [nativeSources, weather] = await Promise.all([
    loadNativeSources(force),
    loadWeather().catch((error) => ({ status: "error", message: error.message })),
  ]);
  return {
    refreshing: false,
    updatedAt: Date.now() / 1000,
    mode: hasNativeBridge() ? "extension" : "standalone",
    sources: { ...nativeSources, weather },
  };
}

export async function setReminderStatus(id, completed) {
  if (typeof id !== "string" || !id || typeof completed !== "boolean") {
    throw new Error("A valid reminder and completion state are required.");
  }
  const result = await sendNativeMessage({ action: "setReminderStatus", id, completed });
  if (result?.status !== "ok") throw new Error(result?.message || "Apple Reminders could not be updated.");
  return result;
}
