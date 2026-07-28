import { Bell } from "@gravity-ui/icons";
import { useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Dropdown, Label } from "@heroui/react";
import type { Notification } from "@sorento/domain";
import { useAuth } from "@/auth/useAuth";
import { repositories } from "@/lib/repositories";
import { queryKeys } from "@/lib/query-keys";
import { notificationsContent } from "@/features/notifications/content";

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
    <Dropdown>
      <Button aria-label={notificationsContent.bell.label} variant="ghost" isIconOnly>
        <Badge.Anchor>
          <Bell />
          {unreadCount > 0 ? (
            <Badge color="danger" size="sm">
              {unreadCount}
            </Badge>
          ) : null}
        </Badge.Anchor>
      </Button>
      <Dropdown.Popover>
        <Dropdown.Menu
          onAction={(key) => {
            if (key === "mark-all-read") {
              markAllRead();
              return;
            }
            const notification = notifications.find((n) => n.id === key);
            if (notification) openNotification(notification);
          }}
        >
          {notifications.length === 0 ? (
            <Dropdown.Item id="empty" textValue={notificationsContent.bell.empty} isDisabled>
              <Label>{notificationsContent.bell.empty}</Label>
            </Dropdown.Item>
          ) : (
            notifications.slice(0, 10).map((notification) => (
              <Dropdown.Item
                key={notification.id}
                id={notification.id}
                textValue={notificationsContent.typeLabels[notification.type]}
              >
                <Label className={notification.read ? "text-muted" : "font-semibold"}>
                  {notificationsContent.typeLabels[notification.type]}
                </Label>
              </Dropdown.Item>
            ))
          )}
          {notifications.some((n) => !n.read) ? (
            <Dropdown.Item id="mark-all-read" textValue={notificationsContent.bell.markAllRead}>
              <Label>{notificationsContent.bell.markAllRead}</Label>
            </Dropdown.Item>
          ) : null}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
};
