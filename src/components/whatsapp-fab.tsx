import { MessageCircle } from "lucide-react";

import { whatsappLink } from "@/lib/site-config";
import { track, events } from "@/lib/analytics";

export function WhatsAppFab() {
  return (
    <a
      href={whatsappLink("Hello, I'd like to ask about a session.")}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track(events.whatsappClicked, { position: "fab" })}
      aria-label="Message the practice on WhatsApp"
      className="fixed bottom-24 right-4 z-40 grid size-12 place-items-center rounded-full bg-moss text-moss-foreground shadow-deep transition-transform hover:scale-105 md:bottom-6"
    >
      <MessageCircle className="size-5" />
    </a>
  );
}
