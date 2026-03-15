import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const { user } = useAuth();
  const isSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  const [permission, setPermission] = useState<NotificationPermission>(
    isSupported ? Notification.permission : "denied"
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check if already subscribed on mount
  useEffect(() => {
    if (!isSupported || !user) return;
    navigator.serviceWorker.getRegistration("/sw.js").then((reg) => {
      if (!reg) return;
      reg.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub);
      });
    });
  }, [isSupported, user]);

  const subscribe = async () => {
    if (!isSupported || !user || !VAPID_PUBLIC_KEY) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const json = sub.toJSON();
      const endpoint = json.endpoint!;
      const p256dh = (json.keys as any)?.p256dh ?? "";
      const auth_key = (json.keys as any)?.auth ?? "";

      await (supabase as any).from("push_subscriptions").upsert(
        { user_id: user.id, endpoint, p256dh, auth_key, user_agent: navigator.userAgent },
        { onConflict: "user_id,endpoint" }
      );

      setIsSubscribed(true);
    } catch (err) {
      console.error("Push subscribe error:", err);
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    if (!isSupported || !user) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      if (!reg) return;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await (supabase as any)
          .from("push_subscriptions")
          .delete()
          .eq("user_id", user.id)
          .eq("endpoint", sub.endpoint);
      }
      setIsSubscribed(false);
    } catch (err) {
      console.error("Push unsubscribe error:", err);
    } finally {
      setLoading(false);
    }
  };

  return { isSupported, permission, isSubscribed, loading, subscribe, unsubscribe };
}
