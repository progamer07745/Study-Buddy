let installPrompt = null;

export function registerPwa() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
      console.error("Study Buddy service worker registration failed", error);
    });
  }, { once: true });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    window.dispatchEvent(new Event("study-buddy:pwa-install-ready"));
  });
  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    window.dispatchEvent(new Event("study-buddy:pwa-installed"));
  });
}

export async function promptPwaInstall() {
  if (!installPrompt) return false;
  await installPrompt.prompt();
  const { outcome } = await installPrompt.userChoice;
  installPrompt = null;
  return outcome === "accepted";
}

export function canPromptPwaInstall() {
  return Boolean(installPrompt);
}

export async function showLocalNotification(title, options = {}) {
  if (Notification.permission !== "granted" || !("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification(title, {
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    ...options,
  });
}
