import { useEffect, useRef, useState } from "react";
import { Button } from "@cloudflare/kumo";
import type { Notification as StoredNotification } from "../lib/types";
export function NotificationBanner({
  notifications,
  connected,
  onDismiss
}: {
  notifications: StoredNotification[];
  connected: boolean;
  onDismiss: (ids: string[]) => Promise<{ ok: boolean; error?: string }>;
}) {
  const seen = useRef(new Set<string>());
  const [error, setError] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [permission, setPermission] = useState(
    typeof Notification === "undefined"
      ? "unsupported"
      : Notification.permission
  );
  useEffect(() => {
    if (
      typeof Notification === "undefined" ||
      Notification.permission !== "granted"
    )
      return;
    for (const item of notifications) {
      if (seen.current.has(item.id)) continue;
      seen.current.add(item.id);
      try {
        new Notification(item.message, { tag: item.id });
      } catch {
        /* Persisted banner remains available. */
      }
    }
  }, [notifications, permission]);
  return (
    <div className="border-b border-kumo-line bg-kumo-base px-4 py-2 min-w-0">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <span className="text-xs text-kumo-subtle">
          {notifications.length ? "Unread reminders" : "No unread reminders"}
        </span>
        {permission === "default" && (
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              try {
                setPermission(await Notification.requestPermission());
              } catch {
                setError(
                  "Browser notifications are unavailable. Reminders still appear here."
                );
              }
            }}
          >
            Enable browser notifications
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-kumo-danger">
          {error}
        </p>
      )}
      <ul
        aria-label="Unread notifications"
        aria-live="polite"
        className="space-y-2"
      >
        {notifications.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-3 justify-between py-2"
          >
            <span className="text-sm break-words min-w-0">{item.message}</span>
            <Button
              size="sm"
              variant="secondary"
              disabled={!connected || pending !== null}
              onClick={async () => {
                setPending(item.id);
                setError("");
                try {
                  const result = await onDismiss([item.id]);
                  if (!result.ok)
                    setError(result.error ?? "Could not dismiss reminder");
                } catch {
                  setError("Could not dismiss reminder. Please try again.");
                } finally {
                  setPending(null);
                }
              }}
              aria-label={`Dismiss ${item.message}`}
            >
              Dismiss
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
