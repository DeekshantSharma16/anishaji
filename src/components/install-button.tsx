import { Download } from "lucide-react";

import { useInstallPrompt } from "@/lib/pwa";

/**
 * Renders nothing unless the browser has told us the app is installable, so
 * there is never a dead button. iOS never fires that event, which is correct:
 * there the user installs through Share > Add to Home Screen.
 */
export function InstallButton({ className = "" }: { className?: string }) {
  const { canInstall, install } = useInstallPrompt();

  if (!canInstall) return null;

  return (
    <button
      type="button"
      onClick={install}
      className={`inline-flex items-center gap-2 rounded-full border border-contrast-foreground/25 px-4 py-2 text-sm transition-colors hover:border-clay hover:text-clay ${className}`}
    >
      <Download className="size-4" aria-hidden="true" />
      Install the app
    </button>
  );
}
