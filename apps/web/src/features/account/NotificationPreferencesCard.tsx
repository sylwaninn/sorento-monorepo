import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, Switch, Typography } from "@heroui/react";
import { DEFAULT_NOTIFICATION_PREFERENCES, type NotificationType } from "@sorento/domain";
import { NotificationPreferenceRepository } from "@sorento/supabase-client";
import { useAuth } from "@/auth/useAuth";
import { supabase } from "@/lib/supabase-client";
import { notificationsContent } from "@/features/notifications/content";

// "invitation" isn't a real per-user toggle in this implementation: invite-member emails
// the invitee directly, it never creates a notifications row for an existing user.
const CONFIGURABLE_TYPES = (
  Object.keys(DEFAULT_NOTIFICATION_PREFERENCES) as NotificationType[]
).filter((type) => type !== "invitation");

export const NotificationPreferencesCard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const preferencesQuery = useQuery({
    queryKey: ["notification-preferences", user?.id],
    queryFn: () => new NotificationPreferenceRepository(supabase).listForCurrentUser(),
    enabled: Boolean(user),
  });

  const overridesByType = useMemo(
    () => new Map((preferencesQuery.data ?? []).map((pref) => [pref.eventType, pref])),
    [preferencesQuery.data],
  );

  const setPreference = async (type: NotificationType, inApp: boolean, email: boolean) => {
    if (!user) return;
    await new NotificationPreferenceRepository(supabase).setPreference(user.id, type, inApp, email);
    queryClient.invalidateQueries({ queryKey: ["notification-preferences", user.id] });
  };

  return (
    <Card className="w-full max-w-md">
      <Card.Header>
        <Card.Title>{notificationsContent.preferences.title}</Card.Title>
        <Card.Description>{notificationsContent.preferences.description}</Card.Description>
      </Card.Header>
      <Card.Content className="flex flex-col gap-4">
        {CONFIGURABLE_TYPES.map((type) => {
          const effective = overridesByType.get(type) ?? {
            inApp: DEFAULT_NOTIFICATION_PREFERENCES[type].inApp,
            email: DEFAULT_NOTIFICATION_PREFERENCES[type].email,
          };

          return (
            <div key={type} className="flex flex-col gap-2 border-b pb-3">
              <Typography type="body-sm" weight="medium">
                {notificationsContent.typeLabels[type]}
              </Typography>
              <div className="flex gap-6">
                <Switch
                  isSelected={effective.inApp}
                  onChange={(inApp) => setPreference(type, inApp, effective.email)}
                >
                  <Switch.Content>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                    {notificationsContent.preferences.inAppColumn}
                  </Switch.Content>
                </Switch>
                <Switch
                  isSelected={effective.email}
                  onChange={(email) => setPreference(type, effective.inApp, email)}
                >
                  <Switch.Content>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                    {notificationsContent.preferences.emailColumn}
                  </Switch.Content>
                </Switch>
              </div>
            </div>
          );
        })}
      </Card.Content>
    </Card>
  );
};
