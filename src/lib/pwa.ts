import { useEffect, useState } from "react";

/**
 * PWA plumbing: service worker registration and the Android install prompt.
 *
 * The worker is registered in production only. In dev it would cache Vite's
 * module graph and serve stale code after every edit, which is a miserable way
 * to work and hides real bugs.
 */

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function useServiceWorker() {
  useEffect(() => {
    if (import.meta.env.DEV) return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        // A failed worker registration must never break the page.
        console.warn("Service worker registration failed", error);
      });
    };

    // Wait for load so the worker never competes with the first paint.
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => window.removeEventListener("load", register);
  }, []);
}

/**
 * Chrome and Edge on Android fire `beforeinstallprompt` when the app is
 * installable. iOS Safari does not: there the user installs via Share > Add to
 * Home Screen, so `canInstall` stays false and no button is shown.
 */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  return { canInstall: Boolean(deferred) && !installed, installed, install };
}
