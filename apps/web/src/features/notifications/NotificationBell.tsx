import { Bell } from "@gravity-ui/icons";
import { useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Notification } from "@sorento/domain";
import { useAuth } from "@/auth/useAuth";
import { repositories } from "@/lib/repositories";
import { queryKeys } from "@/lib/query-keys";
import { notificationsContent } from "@/features/notifications/content";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const targetPath = (notification: Notification): string | null => {
  if (!notification.dossierId) return null;
  if (notification.type === "mention" || notification.type === "comment_on_assigned_procedure") {
    const procedureId = notification.payload["procedureId"];
    if (typeof procedureId === "string")
      return `/dossiers/${notification.dossierId}/demarches/${procedureId}`;
  }
  return `/dossiers/${notification.dossierId}`;
};

export const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: queryKeys.account.notifications(),
    queryFn: () => repositories.notifications.listForCurrentUser(),
    enabled: Boolean(user),
  });

  const notifications = notificationsQuery.data ?? [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.account.notifications() });

  const openNotification = async (notification: Notification) => {
    if (!notification.read) {
      await repositories.notifications.markRead(notification.id);
      invalidate();
    }
    const path = targetPath(notification);
    if (path) navigate(path);
  };

  const markAllRead = async () => {
    if (!user) return;
    await repositories.notifications.markAllRead(user.id);
    invalidate();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={notificationsContent.bell.label}
          className="relative"
          size="icon"
          variant="ghost"
        >
          <Bell />
          {unreadCount > 0 ? (
            <Badge className="text-tag absolute -right-1 -top-1" variant="destructive">
              {unreadCount}
            </Badge>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {notifications.length === 0 ? (
          <DropdownMenuItem disabled>{notificationsContent.bell.empty}</DropdownMenuItem>
        ) : (
          notifications.slice(0, 10).map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={cn(notification.read ? "text-muted-foreground" : "font-semibold")}
              onSelect={() => openNotification(notification)}
            >
              {notificationsContent.typeLabels[notification.type]}
            </DropdownMenuItem>
          ))
        )}
        {notifications.some((n) => !n.read) ? (
          <DropdownMenuItem onSelect={() => markAllRead()}>
            {notificationsContent.bell.markAllRead}
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
