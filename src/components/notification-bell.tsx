"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
export function NotificationBell() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let alive = true;
    async function refresh() {
      if (document.visibilityState === "hidden") return;
      try {
        const r = await fetch("/api/notifications/statistics");
        if (r.ok && alive) setCount((await r.json()).data.unread);
      } catch {
        /* Keep last confirmed count. */
      }
    }
    void refresh();
    const timer = setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  return (
    <Link
      className="icon-btn notification-button"
      href="/notifications"
      aria-label={"站内通知，未读 " + count}
    >
      <Bell size={19} />
      {count > 0 && <b>{count}</b>}
    </Link>
  );
}
