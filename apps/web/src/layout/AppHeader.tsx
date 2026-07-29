import { Link as RouterLink } from "react-router";
import { Toolbar } from "@heroui/react";
import { NotificationBell } from "@/features/notifications/NotificationBell";

export const AppHeader = () => (
  <Toolbar
    aria-label="Navigation principale"
    className="flex items-center justify-between border-b px-4 py-3"
  >
    <RouterLink className="link font-semibold" to="/mes-dossiers">
      Sorento
    </RouterLink>
    <NotificationBell />
  </Toolbar>
);
