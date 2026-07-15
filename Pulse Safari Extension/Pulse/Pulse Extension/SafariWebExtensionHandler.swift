import EventKit
import Foundation
import SafariServices

final class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    private let store = EKEventStore()
    private let iso = ISO8601DateFormatter()

    func beginRequest(with context: NSExtensionContext) {
        let request = context.inputItems.first as? NSExtensionItem
        let message = request?.userInfo?[SFExtensionMessageKey] as? [String: Any] ?? [:]

        Task {
            let result = await handle(message)
            let response = NSExtensionItem()
            response.userInfo = [SFExtensionMessageKey: result]
            context.completeRequest(returningItems: [response])
        }
    }

    private func handle(_ message: [String: Any]) async -> [String: Any] {
        switch message["action"] as? String {
        case "dashboard":
            let eventsAllowed = await requestEventsAccess()
            let remindersAllowed = await requestRemindersAccess()
            let reminders = remindersAllowed ? await fetchReminders() : []
            return [
                "status": "ok",
                "sources": [
                    "calendar": calendarPayload(allowed: eventsAllowed),
                    "reminders": remindersPayload(allowed: remindersAllowed, reminders: reminders),
                ],
            ]
        case "setReminderStatus":
            guard let identifier = message["id"] as? String,
                  !identifier.isEmpty,
                  identifier.count <= 256,
                  let completed = message["completed"] as? Bool else {
                return ["status": "error", "message": "A valid reminder and completion state are required."]
            }
            guard await requestRemindersAccess() else {
                return ["status": "permission", "message": "Allow Reminders access in System Settings → Privacy & Security."]
            }
            return setReminderStatus(identifier: identifier, completed: completed)
        default:
            return ["status": "error", "message": "Unknown Pulse action."]
        }
    }

    private func requestEventsAccess() async -> Bool {
        if #available(macOS 14.0, *) {
            return (try? await store.requestFullAccessToEvents()) ?? false
        }
        return await withCheckedContinuation { continuation in
            store.requestAccess(to: .event) { allowed, _ in continuation.resume(returning: allowed) }
        }
    }

    private func requestRemindersAccess() async -> Bool {
        if #available(macOS 14.0, *) {
            return (try? await store.requestFullAccessToReminders()) ?? false
        }
        return await withCheckedContinuation { continuation in
            store.requestAccess(to: .reminder) { allowed, _ in continuation.resume(returning: allowed) }
        }
    }

    private func fetchReminders() async -> [EKReminder] {
        await withCheckedContinuation { continuation in
            let predicate = store.predicateForIncompleteReminders(withDueDateStarting: nil, ending: nil, calendars: nil)
            store.fetchReminders(matching: predicate) { continuation.resume(returning: $0 ?? []) }
        }
    }

    private func calendarPayload(allowed: Bool) -> [String: Any] {
        guard allowed else {
            return ["status": "permission", "events": [], "message": "Allow Calendar access in System Settings → Privacy & Security."]
        }
        let calendar = Calendar.current
        let start = calendar.startOfDay(for: Date())
        let end = calendar.date(byAdding: .day, value: 3, to: start)!
        let ignored = Set(["Birthdays", "US Holidays", "Christian Holidays", "Siri Suggestions", "Scheduled Reminders"])
        let calendars = store.calendars(for: .event).filter { !ignored.contains($0.title) }
        let events = store.events(matching: store.predicateForEvents(withStart: start, end: end, calendars: calendars))
            .sorted { $0.startDate < $1.startDate }
            .prefix(20)
            .map { event -> [String: Any] in
                [
                    "id": event.eventIdentifier ?? UUID().uuidString,
                    "title": event.title ?? "Untitled event",
                    "start": iso.string(from: event.startDate),
                    "end": iso.string(from: event.endDate),
                    "allDay": event.isAllDay,
                    "calendar": event.calendar.title,
                ]
            }
        return ["status": "ok", "events": Array(events)]
    }

    private func remindersPayload(allowed: Bool, reminders: [EKReminder]) -> [String: Any] {
        guard allowed else {
            return ["status": "permission", "reminders": [], "total": 0, "message": "Allow Reminders access in System Settings → Privacy & Security."]
        }
        let now = Date()
        let sorted = reminders.sorted { left, right in
            let leftDate = left.dueDateComponents.flatMap { Calendar.current.date(from: $0) }
            let rightDate = right.dueDateComponents.flatMap { Calendar.current.date(from: $0) }
            switch (leftDate, rightDate) {
            case let (left?, right?): return left < right
            case (_?, nil): return true
            case (nil, _?): return false
            default: return (left.title ?? "") < (right.title ?? "")
            }
        }
        let rows = sorted.prefix(16).map { reminder -> [String: Any] in
            let due = reminder.dueDateComponents.flatMap { Calendar.current.date(from: $0) }
            return [
                "id": reminder.calendarItemIdentifier,
                "title": reminder.title ?? "Untitled reminder",
                "list": reminder.calendar.title,
                "due": due.map { iso.string(from: $0) } ?? NSNull(),
                "overdue": due.map { $0 < now } ?? false,
                "priority": reminder.priority,
            ]
        }
        return ["status": "ok", "reminders": rows, "total": reminders.count]
    }

    private func setReminderStatus(identifier: String, completed: Bool) -> [String: Any] {
        guard let reminder = store.calendarItem(withIdentifier: identifier) as? EKReminder else {
            return ["status": "not_found", "message": "That reminder no longer exists."]
        }
        reminder.isCompleted = completed
        reminder.completionDate = completed ? Date() : nil
        do {
            try store.save(reminder, commit: true)
            return ["status": "ok", "id": identifier, "title": reminder.title ?? "Untitled reminder", "completed": completed]
        } catch {
            return ["status": "error", "message": error.localizedDescription]
        }
    }
}
