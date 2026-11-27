"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Bell, Radio } from "lucide-react";

export function DriverLive({ pushKey }: { pushKey?: string }) {
  const router = useRouter();
  const [live, setLive] = useState(false);
  const [push, setPush] = useState<"enable" | "disable" | "busy">("enable");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return;
    const client = createBrowserClient(url, key, { cookieOptions: { secure: process.env.NODE_ENV === "production" } });
    const channel = client.channel("driver-reservations").on("postgres_changes", {
      event: "UPDATE", schema: "public", table: "driver_feed",
    }, () => router.refresh()).subscribe((status) => {
      setLive(status === "SUBSCRIBED");
      if (status === "SUBSCRIBED") router.refresh();
    });
    const fallback = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 30_000);
    function resume() { if (document.visibilityState === "visible") router.refresh(); }
    document.addEventListener("visibilitychange", resume);
    return () => {
      window.clearInterval(fallback);
      document.removeEventListener("visibilitychange", resume);
      void client.removeChannel(channel);
    };
  }, [router]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/admin-sw.js", { scope: "/admin" })
      .then((registration) => registration.pushManager?.getSubscription())
      .then((subscription) => { if (subscription) setPush("disable"); })
      .catch(() => undefined);
  }, []);

  async function changePush() {
    if (!pushKey || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setMessage("On iPhone, add the driver dashboard to your Home Screen in Safari, then enable alerts in the installed app.");
      return;
    }
    const previous = push;
    setPush("busy");
    setMessage("");
    try {
      const permission = previous === "enable" ? await Notification.requestPermission() : "granted";
      if (permission !== "granted") throw new Error("Permission denied");
      await navigator.serviceWorker.register("/admin-sw.js", { scope: "/admin" });
      const registration = await navigator.serviceWorker.ready;
      const current = await registration.pushManager.getSubscription();
      const subscription = current ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: pushKey });
      const response = await fetch("/api/admin/push", {
        method: previous === "enable" ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });
      if (!response.ok) {
        if (!current) await subscription.unsubscribe();
        throw new Error("Could not save subscription");
      }
      if (previous === "disable") await subscription.unsubscribe();
      setPush(previous === "enable" ? "disable" : "enable");
      setMessage(previous === "enable" ? "Ride alerts enabled on this device." : "Ride alerts disabled on this device.");
    } catch {
      setPush(previous);
      setMessage("Could not change ride alerts. Check this device’s notification permissions and try again.");
    }
  }

  return <div className="driver-live">
    <span><Radio size={15} aria-hidden="true" /> {live ? "Live updates" : "Auto-refresh"}</span>
    {pushKey && <button type="button" className="driver-link" disabled={push === "busy"} onClick={changePush}>
      <Bell size={15} aria-hidden="true" /> {push === "disable" ? "Disable alerts" : "Enable alerts"}
    </button>}
    {message && <p role="status">{message}</p>}
  </div>;
}
