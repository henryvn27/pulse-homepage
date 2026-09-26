import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowCounterClockwise,
  ArrowClockwise,
  ArrowSquareOut,
  ArrowUp,
  CalendarBlank,
  Check,
  CheckCircle,
  Clock,
  CloudSun,
  Command,
  GithubLogo,
  ListChecks,
  NotionLogo,
  PlugsConnected,
  Plus,
  Sparkle,
  SlidersHorizontal,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { defaultWidgetOrder, defaultWidgetVisibility, GITHUB_PROJECTS_URL, migrateLegacyPulsePreferences, moveItem, moveWidget, normalizeWidgetOrder, widgetLabels } from "./customization.js";
import { hasNativeBridge, loadDashboardData, setReminderStatus } from "./pulseData.js";

const starterShortcuts = [
  { id: 1, label: "GitHub", url: "https://github.com", icon: "github" },
  { id: 2, label: "Projects", url: GITHUB_PROJECTS_URL, icon: "projects" },
  { id: 3, label: "Notion", url: "https://notion.so", icon: "notion" },
  { id: 4, label: "Calendar", url: "https://www.icloud.com/calendar/", icon: "calendar" },
];

const nativeMode = hasNativeBridge();
const emptyDashboard = {
  refreshing: true,
  updatedAt: 0,
  mode: nativeMode ? "extension" : "standalone",
  sources: {
    calendar: { status: nativeMode ? "loading" : "setup", events: [], message: "Open the Pulse Safari extension to connect Calendar." },
    reminders: { status: nativeMode ? "loading" : "setup", reminders: [], total: 0, message: "Open the Pulse Safari extension to connect Reminders." },
    weather: { status: "loading" },
  },
};

function useStoredState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => localStorage.setItem(key, JSON.stringify(value)), [key, value]);
  return [value, setValue];
}

try {
  migrateLegacyPulsePreferences(globalThis.localStorage);
} catch {
  // Private browsing or a browser policy may disable local storage.
}

function getGreeting(date) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatTime(value) {
  if (!value) return "No time";
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function formatDue(value, overdue) {
  if (!value) return "No due date";
  const due = new Date(value);
  const today = new Date();
  const sameDay = due.toDateString() === today.toDateString();
  if (overdue) return `Overdue · ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(due)}`;
  if (sameDay) return "Due today";
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(due);
}

function weatherLabel(code) {
  if (code === 0) return "Clear";
  if ([1, 2].includes(code)) return "Partly cloudy";
  if (code === 3) return "Cloudy";
  if ([45, 48].includes(code)) return "Foggy";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorms";
  return "Conditions available";
}

function sourceTone(status) {
  if (status === "ok") return "ok";
  if (status === "loading") return "loading";
  return "attention";
}

function ShortcutIcon({ name }) {
  const props = { size: 19, weight: "bold", "aria-hidden": true };
  if (name === "github") return <GithubLogo {...props} />;
  if (name === "projects") return <GithubLogo {...props} />;
  if (name === "notion") return <NotionLogo {...props} />;
  if (name === "calendar") return <CalendarBlank {...props} />;
  return <Command {...props} />;
}

function Modal({ title, children, onClose, eyebrow = null, closeDisabled = false }) {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const closeDisabledRef = useRef(closeDisabled);
  onCloseRef.current = onClose;
  closeDisabledRef.current = closeDisabled;

  useEffect(() => {
    const previousFocus = document.activeElement;
    const dialog = dialogRef.current;
    const focusableSelector = "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
    const focusable = () => [...dialog.querySelectorAll(focusableSelector)];
    const initialFocus = focusable()[0] || dialog;
    initialFocus.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !closeDisabledRef.current) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const controls = focusable();
      if (!controls.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus?.();
    };
  }, []);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={closeDisabled ? undefined : onClose}>
      <section ref={dialogRef} className="modal" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Close dialog" disabled={closeDisabled}><X size={18} /></button>
        </div>
        {children}
      </section>
    </div>
  );
}

function SourceState({ source, noun }) {
  if (source.status === "loading") return <span className="visually-hidden" role="status">Loading {noun}…</span>;
  if (source.status === "ok") return null;
  const StateIcon = source.status === "setup" ? PlugsConnected : WarningCircle;
  return <div className={`status-callout ${source.status === "setup" ? "setup" : "attention"}`}><StateIcon size={20} /><div><strong>{source.status === "setup" ? `${noun} needs setup` : `${noun} unavailable`}</strong><span>{source.message || "Open connections for details."}</span></div></div>;
}

function Skeleton({ className = "" }) {
  return <span className={`skeleton ${className}`} aria-hidden="true" />;
}

function SkeletonRows({ count, className }) {
  return <div className={`skeleton-rows ${className}`} aria-hidden="true">{Array.from({ length: count }, (_, index) => <div className="skeleton-row" key={index}><Skeleton className="skeleton-icon" /><span className="skeleton-copy"><Skeleton className="skeleton-line" /><Skeleton className="skeleton-line short" /></span></div>)}</div>;
}

export function App() {
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [shortcuts, setShortcuts] = useStoredState("pulse-shortcuts", starterShortcuts);
  const [name, setName] = useStoredState("pulse-name", "there");
  const [widgetVisibility, setWidgetVisibility] = useStoredState("pulse-widget-visibility", defaultWidgetVisibility);
  const [storedWidgetOrder, setWidgetOrder] = useStoredState("pulse-widget-order", defaultWidgetOrder);
  const [now, setNow] = useState(new Date());
  const [modal, setModal] = useState(null);
  const [shortcutDraft, setShortcutDraft] = useState({ label: "", url: "" });
  const [pendingReminder, setPendingReminder] = useState(null);
  const [undoReminder, setUndoReminder] = useState(null);
  const [reminderAction, setReminderAction] = useState({ busy: false, error: "" });

  const loadDashboard = useCallback(async (force = false) => {
    setDashboard((current) => ({ ...current, refreshing: true }));
    setDashboard(await loadDashboardData(force));
  }, []);

  useEffect(() => {
    loadDashboard();
    const clock = setInterval(() => setNow(new Date()), 30000);
    const refresh = setInterval(() => loadDashboard(), 120000);
    return () => { clearInterval(clock); clearInterval(refresh); };
  }, [loadDashboard]);

  const { calendar, reminders, weather } = dashboard.sources;
  const widgetOrder = normalizeWidgetOrder(storedWidgetOrder);
  const visibleWidgets = widgetOrder.filter((key) => widgetVisibility[key] !== false);
  const nextEvent = calendar.events?.find((event) => new Date(event.end) > now);
  const overdue = reminders.reminders?.filter((reminder) => reminder.overdue) || [];
  const nextReminder = reminders.reminders?.[0];
  const reminderRows = reminders.reminders?.slice(0, 6) || [];
  const eventRows = calendar.events?.slice(0, 4) || [];
  const shortcutRows = shortcuts.slice(0, 4);
  const briefLoading = [calendar, reminders].some((source) => source.status === "loading");
  const briefHasLiveData = [calendar, reminders].some((source) => source.status === "ok");
  const briefHasItems = Boolean(nextReminder || nextEvent);

  const addShortcut = (event) => {
    event.preventDefault();
    if (!shortcutDraft.label.trim() || !shortcutDraft.url.trim()) return;
    const url = shortcutDraft.url.startsWith("http") ? shortcutDraft.url : `https://${shortcutDraft.url}`;
    setShortcuts((current) => [...current, { id: Date.now(), label: shortcutDraft.label.trim(), url, icon: "command" }]);
    setShortcutDraft({ label: "", url: "" });
  };

  const updateReminderStatus = async (reminder, completed) => {
    setReminderAction({ busy: true, error: "" });
    try {
      await setReminderStatus(reminder.id, completed);
      await loadDashboard();
      setReminderAction({ busy: false, error: "" });
      return true;
    } catch (error) {
      setReminderAction({ busy: false, error: error.message });
      return false;
    }
  };

  const confirmReminder = async () => {
    if (!pendingReminder) return;
    const reminder = pendingReminder;
    if (await updateReminderStatus(reminder, true)) {
      setPendingReminder(null);
      setUndoReminder(reminder);
    }
  };

  const undoCompletedReminder = async () => {
    if (!undoReminder) return;
    if (await updateReminderStatus(undoReminder, false)) {
      setUndoReminder(null);
    }
  };

  const openReminderConfirmation = (reminder) => {
    setReminderAction({ busy: false, error: "" });
    setPendingReminder(reminder);
  };

  const openConnections = () => {
    setModal("connections");
  };

  const toggleWidget = (key) => {
    setWidgetVisibility((current) => ({ ...defaultWidgetVisibility, ...current, [key]: current[key] === false }));
  };

  const widgetLayoutClass = (key) => {
    if (visibleWidgets.length === 1) return "secondary-widget is-tall is-wide";
    if (visibleWidgets.length === 2) return "secondary-widget is-tall";
    return `secondary-widget${visibleWidgets[0] === key ? " is-featured" : ""}`;
  };

  return (
    <main className="app-shell">
      <div className="dashboard" id="top">
        <section className="hero">
          <div>
            <p className="date">{new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(now)} · {now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>
            <h1>{getGreeting(now)}, {name.trim() || "there"}<span className="period">.</span></h1>
            <p className="hero-copy">Your work, schedule, and loose ends in one calm place.</p>
          </div>
          <div className="hero-shortcuts" aria-label="Shortcuts">
            {shortcutRows.map((shortcut) => <a href={shortcut.url} target="_blank" rel="noreferrer" className="shortcut hero-shortcut" key={shortcut.id}><span><ShortcutIcon name={shortcut.icon} /></span><strong>{shortcut.label}</strong></a>)}
            <div className="shortcut-controls">{shortcuts.length > 4 && <span className="panel-count">+{shortcuts.length - 4}</span>}<button className="icon-button subtle" onClick={() => setModal("settings")} aria-label="Customize Pulse" title="Customize Pulse"><SlidersHorizontal size={17} /></button></div>
          </div>
        </section>

        {dashboard.mode === "standalone" && <div className="service-banner standalone-banner"><CheckCircle size={18} /><span><strong>No server needed.</strong> Time, weather, shortcuts, customization, and GitHub Projects run from this file. Use the Safari extension for Apple Calendar and Reminders.</span><button className="text-button" onClick={openConnections}>Connections</button></div>}

        {widgetVisibility.summary !== false && <section className="summary-strip" aria-label="Daily summary" aria-busy={dashboard.refreshing && dashboard.updatedAt === 0}>
          <div>
            <span className="summary-label">Needs attention</span>
            {reminders.status === "loading" ? <><Skeleton className="skeleton-summary-value" /><Skeleton className="skeleton-summary-detail" /></> : <><strong>{reminders.status === "ok" ? (overdue.length ? `${overdue.length} overdue` : "All clear") : "Connect"}</strong><small>{reminders.status === "ok" ? `${reminders.total} open reminders` : "Reminders are not connected"}</small></>}
          </div>
          <div>
            <span className="summary-label">Projects</span>
            <strong><a className="summary-project-link" href={GITHUB_PROJECTS_URL} target="_blank" rel="noreferrer">Open GitHub Projects <ArrowSquareOut size={14} /></a></strong>
            <small>Issues, status, priorities, and dependencies</small>
          </div>
          <div>
            <span className="summary-label">Next up</span>
            {reminders.status === "loading" ? <><Skeleton className="skeleton-summary-value next" /><Skeleton className="skeleton-summary-detail" /></> : <><strong className="summary-text">{reminders.status === "ok" ? (nextReminder?.title || "Reminders clear") : "Connect"}</strong><small>{reminders.status === "ok" ? (nextReminder ? `${nextReminder.list} · ${formatDue(nextReminder.due, nextReminder.overdue)}` : "Nothing left to do") : "Reminders are not connected"}</small></>}
          </div>
          <div className="weather-summary">{weather.status === "loading" ? <><span className="visually-hidden" role="status">Loading weather…</span><Skeleton className="skeleton-weather-icon" /><span><Skeleton className="skeleton-summary-value weather" /><Skeleton className="skeleton-summary-detail wide" /></span></> : <><CloudSun size={26} weight="duotone" /><span><strong>{weather.status === "ok" ? `${Math.round(weather.current.temperature_2m)}°` : "No data"}</strong><small>{weather.status === "ok" ? `${weather.location} · ${weatherLabel(weather.current.weather_code)}` : "Weather unavailable"}</small></span></>}</div>
        </section>}

        <div className="content-grid">
          <section className="panel brief-panel" aria-busy={briefLoading}>
            <div className="panel-heading brief-heading"><div><h2><Sparkle size={18} /> Daily brief</h2><p>What matters now</p></div></div>
            <div className="brief-list">
              {briefLoading && <SkeletonRows count={3} className="brief-skeletons" />}
              {!briefLoading && <>
                {!briefHasLiveData && <div className="brief-setup"><CloudSun size={20} /><span><strong>{weather.status === "ok" ? `${weatherLabel(weather.current.weather_code)} and ${Math.round(weather.current.temperature_2m)}° in ${weather.location}` : "Your local view is ready"}</strong><small>Open GitHub Projects for your task board; use the Safari extension for Calendar and Reminders.</small></span><a className="text-button" href={GITHUB_PROJECTS_URL} target="_blank" rel="noreferrer">Projects</a></div>}
                {nextReminder && <div>{nextReminder.overdue ? <WarningCircle size={20} /> : <ListChecks size={20} />}<span><strong>{nextReminder.overdue ? `Start with ${nextReminder.title}` : `Next: ${nextReminder.title}`}</strong><small>{nextReminder.list} · {formatDue(nextReminder.due, nextReminder.overdue)}</small></span></div>}
                {nextEvent && <div><Clock size={20} /><span><strong>{nextEvent.title}</strong><small>{nextEvent.allDay ? "All day" : `Next at ${formatTime(nextEvent.start)}`} · {nextEvent.calendar}</small></span></div>}
                {briefHasLiveData && !briefHasItems && <div><CheckCircle size={20} /><span><strong>No immediate pressure</strong><small>You have room to choose the next useful thing.</small></span></div>}
              </>}
            </div>
          </section>

          {widgetVisibility.reminders !== false && <section className={`panel reminders-panel ${widgetLayoutClass("reminders")}`} style={{ order: widgetOrder.indexOf("reminders") + 1 }} aria-busy={reminders.status === "loading"}>
            <div className="panel-heading"><div><h2><ListChecks size={18} /> Reminders</h2><p>Things to move</p></div>{reminders.status === "ok" && <span className="panel-count">{reminders.total} open</span>}</div>
            <SourceState source={reminders} noun="Reminders" />
            {reminders.status === "loading" && <SkeletonRows count={6} className="task-skeletons" />}
            {reminders.status === "ok" && <div className="task-list">
              {reminderRows.map((reminder) => <article className="task-row" key={reminder.id}><button className="task-check" onClick={() => openReminderConfirmation(reminder)} aria-label={`Complete ${reminder.title}`} title="Mark complete"><Check size={14} weight="bold" /></button><div className="task-copy"><strong>{reminder.title}</strong><span className={reminder.overdue ? "overdue" : ""}><i></i>{reminder.list} · {formatDue(reminder.due, reminder.overdue)}</span></div></article>)}
              {reminderRows.length === 0 && <div className="empty-state compact-empty"><CheckCircle size={28} weight="duotone" /><strong>No incomplete reminders.</strong></div>}
            </div>}
          </section>}

          {widgetVisibility.calendar !== false && <section className={`panel schedule-panel ${widgetLayoutClass("calendar")}`} style={{ order: widgetOrder.indexOf("calendar") + 1 }} aria-busy={calendar.status === "loading"}>
            <div className="panel-heading compact"><div><h2><CalendarBlank size={18} /> Calendar</h2><p>Up next</p></div><span className="day-tile"><b>{now.getDate()}</b><small>{now.toLocaleString("en-US", { month: "short" }).toUpperCase()}</small></span></div>
            <SourceState source={calendar} noun="Calendar" />
            {calendar.status === "loading" && <SkeletonRows count={4} className="event-skeletons" />}
            {calendar.status === "ok" && <div className="events">{eventRows.map((event, index) => <article className="event" key={event.id}><span className={`event-line tone-${index % 3}`}></span><time>{event.allDay ? "All day" : formatTime(event.start)}</time><div><strong>{event.title}</strong><small>{event.calendar}</small></div></article>)}{eventRows.length === 0 && <div className="empty-state mini-empty"><CheckCircle size={25} weight="duotone" /><strong>No events in the next three days.</strong></div>}</div>}
          </section>}

          {widgetVisibility.projects !== false && <section className={`panel projects-panel ${widgetLayoutClass("projects")}`} style={{ order: widgetOrder.indexOf("projects") + 1 }}>
            <div className="panel-heading"><div><h2><GithubLogo size={18} weight="bold" /> GitHub Projects</h2><p>Current work</p></div><a className="text-button" href={GITHUB_PROJECTS_URL} target="_blank" rel="noreferrer">Open boards <ArrowSquareOut size={15} /></a></div>
            <div className="projects-overview">
              <p>Issues, status, priorities, dependencies, and release context live in GitHub.</p>
              <a className="projects-focus" href={GITHUB_PROJECTS_URL} target="_blank" rel="noreferrer">
                <span className="projects-kicker">Portfolio tracker</span>
                <strong>Choose the next useful task</strong>
                <small>Open your project boards</small>
                <ArrowSquareOut size={14} />
              </a>
            </div>
          </section>}
        </div>
      </div>

      {modal === "shortcuts" && <Modal title="Manage shortcuts" onClose={() => setModal(null)}><div className="shortcut-manager">{shortcuts.map((shortcut, index) => <div key={shortcut.id}><span><ShortcutIcon name={shortcut.icon} /><strong>{shortcut.label}</strong></span><span className="shortcut-row-actions"><button onClick={() => setShortcuts((current) => moveItem(current, shortcut.id, -1))} disabled={index === 0} aria-label={`Move ${shortcut.label} up`}><ArrowUp size={14} /></button><button onClick={() => setShortcuts((current) => moveItem(current, shortcut.id, 1))} disabled={index === shortcuts.length - 1} aria-label={`Move ${shortcut.label} down`}><ArrowDown size={14} /></button><button onClick={() => setShortcuts((current) => current.filter((item) => item.id !== shortcut.id))} aria-label={`Remove ${shortcut.label}`}><X size={15} /></button></span></div>)}</div><form className="modal-form shortcut-form" onSubmit={addShortcut}><label>Name<input autoFocus autoComplete="off" value={shortcutDraft.label} onChange={(event) => setShortcutDraft({ ...shortcutDraft, label: event.target.value })} placeholder="Figma" /></label><label>Website<input inputMode="url" autoComplete="url" value={shortcutDraft.url} onChange={(event) => setShortcutDraft({ ...shortcutDraft, url: event.target.value })} placeholder="figma.com" /></label><button className="primary-button" type="submit">Add shortcut</button></form><div className="shortcut-utilities"><button className="secondary-button" onClick={openConnections}>Connections</button><button className="secondary-button" onClick={() => setModal("settings")}>Dashboard</button></div></Modal>}

      {modal === "settings" && <Modal title="Customize Pulse" eyebrow="Profile · dashboard · shortcuts" onClose={() => setModal(null)}>
        <div className="settings-section">
          <span className="settings-kicker">Profile</span>
          <label className="field-label">Greeting name<input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" /></label>
          <div className="setting-row"><span><strong>Appearance</strong><small>Matches Safari automatically.</small></span><b className="panel-count">Auto</b></div>
        </div>
        <div className="settings-section">
          <div className="settings-section-heading"><div><span className="settings-kicker">Dashboard</span><small>Daily Brief stays first. Choose what follows.</small></div><button className="text-button" type="button" onClick={() => { setWidgetVisibility(defaultWidgetVisibility); setWidgetOrder(defaultWidgetOrder); }}>Reset layout</button></div>
          <label className="widget-row pinned"><span><strong>Daily Brief</strong><small>Your primary overview</small></span><b className="panel-count">Always on</b></label>
          <label className="widget-row"><span><strong>Summary strip</strong><small>Attention, project boards, next up, and weather</small></span><input type="checkbox" checked={widgetVisibility.summary !== false} onChange={() => toggleWidget("summary")} /></label>
          {widgetOrder.map((key, index) => <div className="widget-row" key={key}><label><span><strong>{widgetLabels[key]}</strong><small>{widgetVisibility[key] === false ? "Hidden" : "Shown"}</small></span><input type="checkbox" checked={widgetVisibility[key] !== false} onChange={() => toggleWidget(key)} /></label><span className="widget-order-controls"><button type="button" onClick={() => setWidgetOrder((current) => moveWidget(current, key, -1))} disabled={index === 0} aria-label={`Move ${widgetLabels[key]} up`}><ArrowUp size={14} /></button><button type="button" onClick={() => setWidgetOrder((current) => moveWidget(current, key, 1))} disabled={index === widgetOrder.length - 1} aria-label={`Move ${widgetLabels[key]} down`}><ArrowDown size={14} /></button></span></div>)}
        </div>
        <div className="settings-actions"><button className="secondary-button" onClick={openConnections}>Connections</button><button className="secondary-button" onClick={() => setModal("shortcuts")}>Shortcuts</button><button className="primary-button" onClick={() => setModal(null)}>Done</button></div>
      </Modal>}

      {modal === "connections" && <Modal title="Live connections" onClose={() => setModal(null)}>
        <div className="connection-grid">{Object.entries(dashboard.sources).map(([key, source]) => <div className="connection-row" key={key}><span className={`connection-dot ${sourceTone(source.status)}`}></span><div><strong>{key[0].toUpperCase() + key.slice(1)}</strong><small>{source.status === "ok" ? "Connected and live" : source.message || "Refreshing…"}</small></div></div>)}</div>
        <div className="connection-help">
          <strong>{dashboard.mode === "extension" ? "On-demand connection" : "Standalone page"}</strong>
          <p>{dashboard.mode === "extension" ? "Calendar and Reminders load only while Pulse is open or refreshed. There is no localhost server or background daemon." : "GitHub Projects opens in Safari. Install the packaged extension when you also want Apple Calendar and Reminders."}</p>
          <a className="secondary-button projects-connection-link" href={GITHUB_PROJECTS_URL} target="_blank" rel="noreferrer">Open GitHub Projects <ArrowSquareOut size={15} /></a>
          <button className="secondary-button refresh-connections" type="button" onClick={() => loadDashboard(true)} disabled={dashboard.refreshing}>{dashboard.refreshing ? "Refreshing…" : "Refresh connections"}</button>
          <strong>Privacy</strong>
          <p>Pulse stores no GitHub credentials. Project access is handled by GitHub in Safari. Calendar and Reminders stay behind macOS permission controls.</p>
        </div>
      </Modal>}

      {pendingReminder && <Modal title="Complete reminder?" eyebrow="Apple Reminders" onClose={() => setPendingReminder(null)} closeDisabled={reminderAction.busy}><div className="reminder-confirm"><span className="confirm-icon"><CheckCircle size={27} weight="duotone" /></span><div><strong>{pendingReminder.title}</strong><p>This will mark the item complete in Apple Reminders and remove it from your open list.</p></div></div>{reminderAction.error && <p className="action-error" role="alert">{reminderAction.error}</p>}<div className="modal-actions"><button className="text-button" onClick={() => setPendingReminder(null)} disabled={reminderAction.busy}>Keep open</button><button className="primary-button" onClick={confirmReminder} disabled={reminderAction.busy}>{reminderAction.busy ? <><ArrowClockwise className="spin" size={15} /> Completing…</> : <><Check size={15} weight="bold" /> Complete reminder</>}</button></div></Modal>}

      {undoReminder && <div className="undo-toast" role="status" aria-live="polite"><CheckCircle size={22} weight="fill" /><span><strong>Reminder completed</strong><small>{undoReminder.title}</small>{reminderAction.error && <em>{reminderAction.error}</em>}</span><button className="undo-button" onClick={undoCompletedReminder} disabled={reminderAction.busy}><ArrowCounterClockwise className={reminderAction.busy ? "spin" : ""} size={15} /> {reminderAction.busy ? "Restoring…" : "Undo"}</button><button className="toast-close" onClick={() => setUndoReminder(null)} aria-label="Dismiss"><X size={15} /></button></div>}
    </main>
  );
}
