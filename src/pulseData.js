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

async function loadLinear(token) {
  if (!token) return { status: "setup", issues: [], message: "Add a Linear personal API key in Connections." };
  const completedAfter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const query = `query PulseDashboard {
    viewer {
      name
      active: assignedIssues(first: 250, orderBy: updatedAt, filter: { state: { type: { nin: ["completed", "canceled"] } } }) {
        nodes {
          id identifier title priority url updatedAt dueDate
          state { name type color }
          team { name key }
          project { name color }
        }
      }
      completed: assignedIssues(first: 250, filter: { completedAt: { gte: "${completedAfter}" } }) {
        nodes { id }
      }
    }
  }`;
  const response = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: { Authorization: token, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const payload = await response.json();
  if (!response.ok || payload.errors?.length) {
    throw new Error(payload.errors?.[0]?.message || `Linear request failed (${response.status}).`);
  }
  const viewer = payload.data.viewer;
  const issues = viewer.active.nodes
    .sort((left, right) => {
      const started = Number(right.state?.type === "started") - Number(left.state?.type === "started");
      return started || (left.priority || 99) - (right.priority || 99) || new Date(right.updatedAt) - new Date(left.updatedAt);
    });
  const started = issues.filter((issue) => issue.state?.type === "started").length;
  return {
    status: "ok",
    viewer: viewer.name,
    issues: issues.slice(0, 14),
    focus: issues[0] || null,
    summary: {
      active: issues.length,
      started,
      queued: issues.length - started,
      completedLast7Days: viewer.completed.nodes.length,
      projects: new Set(issues.map((issue) => issue.project?.name).filter(Boolean)).size,
    },
  };
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

export async function loadDashboardData(force = false, linearToken = "") {
  const [nativeSources, linear, weather] = await Promise.all([
    loadNativeSources(force),
    loadLinear(linearToken).catch((error) => ({ status: "error", issues: [], message: error.message })),
    loadWeather().catch((error) => ({ status: "error", message: error.message })),
  ]);
  return {
    refreshing: false,
    updatedAt: Date.now() / 1000,
    mode: hasNativeBridge() ? "extension" : "standalone",
    sources: { ...nativeSources, linear, weather },
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
