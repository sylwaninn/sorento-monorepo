import { SorentoBrand } from "@/components/SorentoBrand";
import { NotificationBell } from "@/features/notifications/NotificationBell";

export const AppHeader = () => (
  <nav
    // The one piece of furniture that exists only once a session does, so the public journeys
    // can assert a signed-out visitor never sees it. Named here rather than through a class,
    // which is a styling decision and free to change.
    data-slot="app-header"
    aria-label="Navigation principale"
    className="bg-card flex items-center justify-between border-b px-4 py-3"
  >
    <SorentoBrand href="/mes-dossiers" />
    <NotificationBell />
  </nav>
);
