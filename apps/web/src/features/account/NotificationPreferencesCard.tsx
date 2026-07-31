import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  defaultNotificationPreference,
  notificationTypeSchema,
  type NotificationType,
} from "@sorento/domain";
import { useAuth } from "@/auth/useAuth";
import { supabase } from "@/lib/supabase-client";
import { repositories } from "@/lib/repositories";
import { notificationsContent } from "@/features/notifications/content";
import { queryKeys } from "@/lib/query-keys";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Text } from "@/components/ui/typography";
import { Switch } from "@/components/ui/switch";
import { Field, FieldLabel } from "@/components/ui/field";

// "invitation" isn't a real per-user toggle in this implementation: invite-member emails
// the invitee directly, it never creates a notifications row for an existing user.
const CONFIGURABLE_TYPES: NotificationType[] = notificationTypeSchema.options.filter(
  (type) => type !== "invitation",
);

export const NotificationPreferencesCard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const preferencesQuery = useQuery({
    queryKey: queryKeys.account.notificationPreferences(),
    queryFn: () => repositories.notificationPreferences.listForCurrentUser(),
    enabled: Boolean(user),
  });
  const rolesQuery = useQuery({
    queryKey: queryKeys.account.membershipRoles(user?.id ?? ""),
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("memberships")
        .select("role")
        .eq("user_id", user.id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(user),
  });

  const overridesByType = useMemo(
    () => new Map((preferencesQuery.data ?? []).map((pref) => [pref.eventType, pref])),
    [preferencesQuery.data],
  );

  const setPreference = async (type: NotificationType, inApp: boolean, email: boolean) => {
    if (!user) return;
    await repositories.notificationPreferences.setPreference(user.id, type, inApp, email);
    queryClient.invalidateQueries({ queryKey: queryKeys.account.notificationPreferences() });
  };

  const viewerOnly =
    (rolesQuery.data?.length ?? 0) > 0 &&
    rolesQuery.data?.every((membership) => membership.role === "viewer");

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{notificationsContent.preferences.title}</CardTitle>
        <CardDescription>{notificationsContent.preferences.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {CONFIGURABLE_TYPES.map((type) => {
          const roleDefault = defaultNotificationPreference(type, viewerOnly === true);
          const effective = overridesByType.get(type) ?? {
            inApp: roleDefault.inApp,
            email: roleDefault.email,
          };

          return (
            <div key={type} className="flex flex-col gap-2 border-b pb-3">
              <Text size="sm" className="font-medium">
                {notificationsContent.typeLabels[type]}
              </Text>
              <div className="flex gap-6">
                <Field orientation="horizontal">
                  <Switch
                    checked={effective.inApp}
                    id={`${type}-inApp`}
                    onCheckedChange={(inApp) => setPreference(type, inApp, effective.email)}
                  />
                  <FieldLabel htmlFor={`${type}-inApp`}>
                    {notificationsContent.preferences.inAppColumn}
                  </FieldLabel>
                </Field>
                <Field orientation="horizontal">
                  <Switch
                    checked={effective.email}
                    id={`${type}-email`}
                    onCheckedChange={(email) => setPreference(type, effective.inApp, email)}
                  />
                  <FieldLabel htmlFor={`${type}-email`}>
                    {notificationsContent.preferences.emailColumn}
                  </FieldLabel>
                </Field>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
