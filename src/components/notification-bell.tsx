import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { listNotifications, markNotificationRead } from "@/lib/procurement/procurement-store";

interface NotificationRow {
  id: string;
  title: string;
  body: string;
  href: string | null;
  read_at: string | null;
  created_at: string;
}

/** Owner-facing notification centre: polls app_notification and lets the
 *  owner jump straight to what changed (a proposal, a variation, collateral). */
export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);

  const refresh = useCallback(() => {
    listNotifications()
      .then((rows) => setNotifications(rows as unknown as NotificationRow[]))
      .catch(() => {
        // Best-effort: the bell just stays at its last known state.
      });
  }, []);

  useEffect(() => {
    refresh();
    const interval = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  const unreadCount = notifications.filter((item) => !item.read_at).length;

  async function markRead(item: NotificationRow) {
    if (item.read_at) return;
    try {
      await markNotificationRead(item.id);
      refresh();
    } catch {
      // Best-effort: worst case it's still shown as unread next time.
    }
  }

  return (
    <DropdownMenu onOpenChange={(next) => next && refresh()}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive ring-2 ring-card" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between font-semibold">
          Notifications
          {unreadCount > 0 && (
            <span className="text-xs font-normal text-muted-foreground">{unreadCount} unread</span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            No notifications yet.
          </p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {notifications.slice(0, 20).map((item) => (
              <NotificationItem key={item.id} item={item} onRead={() => void markRead(item)} />
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationItem({ item, onRead }: { item: NotificationRow; onRead: () => void }) {
  const unread = !item.read_at;
  const content = (
    <div className="flex w-full items-start gap-2">
      <span
        className={`mt-1.5 size-1.5 shrink-0 rounded-full ${unread ? "bg-primary" : "bg-transparent"}`}
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p className="text-sm font-medium">
          {item.title}
          {unread && <span className="sr-only"> (unread)</span>}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{item.body}</p>
      </div>
    </div>
  );

  if (item.href) {
    return (
      <DropdownMenuItem asChild onSelect={onRead} className={unread ? "bg-accent/40" : undefined}>
        <a href={item.href} className="items-start whitespace-normal py-2">
          {content}
        </a>
      </DropdownMenuItem>
    );
  }
  return (
    <DropdownMenuItem
      onSelect={(event) => {
        event.preventDefault();
        onRead();
      }}
      className={`items-start whitespace-normal py-2 ${unread ? "bg-accent/40" : ""}`}
    >
      {content}
    </DropdownMenuItem>
  );
}
