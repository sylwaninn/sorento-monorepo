import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { isMentionable } from "@sorento/core";
import { useAuth } from "@/auth/useAuth";
import { ErrorAlert } from "@/components/ErrorAlert";
import { InlineLoader } from "@/components/PageLoader";
import { dossierContent } from "@/features/dossier/content";
import { useAppMutation } from "@/hooks/use-app-mutation";
import type { DossierContext } from "@/hooks/use-dossier";
import { queryKeys } from "@/lib/query-keys";
import { repositories } from "@/lib/repositories";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Text } from "@/components/ui/typography";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface CommentsTabProps {
  dossierId: string;
  procedureId: string;
  access: DossierContext;
}

export const CommentsTab = ({ dossierId, procedureId, access }: CommentsTabProps) => {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [mentions, setMentions] = useState<string[]>([]);

  const commentsQuery = useQuery({
    queryKey: queryKeys.dossiers.comments(dossierId, procedureId),
    queryFn: () => repositories.comments.listForDossier(dossierId, procedureId),
  });

  const invalidates = [
    queryKeys.dossiers.comments(dossierId, procedureId),
    queryKeys.dossiers.comments(dossierId),
  ];

  const publish = useAppMutation({
    mutationFn: async () => {
      if (!user) throw new Error("unauthenticated");
      // Mentions are stored as user references, so a notification survives a first-name change.
      return repositories.comments.create({ dossierId, procedureId, content, mentions }, user.id);
    },
    invalidates,
    onSuccess: () => {
      setContent("");
      setMentions([]);
    },
  });

  const remove = useAppMutation({
    mutationFn: (commentId: string) => repositories.comments.softDelete(commentId),
    invalidates,
  });

  const addMention = (userId: string) => {
    if (!mentions.includes(userId)) setMentions((previous) => [...previous, userId]);
    const firstName = access.firstNameOf(userId);
    setContent(
      (previous) =>
        `${previous}${previous === "" || previous.endsWith(" ") ? "" : " "}@${firstName} `,
    );
  };

  const comments = commentsQuery.data ?? [];

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-4">
        {commentsQuery.isPending ? <InlineLoader /> : null}

        {!commentsQuery.isPending && comments.length === 0 ? (
          <Text tone="muted" size="sm">
            {dossierContent.procedureDetail.comments.empty}
          </Text>
        ) : null}

        {comments.map((comment) => (
          <div key={comment.id} className="border-b pb-2 text-sm">
            {/* Deleted comments leave a visible trace: honest history matters in a family. */}
            {comment.deletedAt !== null ? (
              <span className="text-muted italic">
                {dossierContent.procedureDetail.comments.deleted}
              </span>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col">
                  <Text className="text-caption font-medium" tone="muted">
                    {access.firstNameOf(comment.authorId)}
                  </Text>
                  <span>{comment.content}</span>
                </div>
                {comment.authorId === user?.id || access.can("comments:deleteAny") ? (
                  <Button variant="ghost" size="sm" onClick={() => remove.mutate(comment.id)}>
                    {dossierContent.procedureDetail.comments.deleteButton}
                  </Button>
                ) : null}
              </div>
            )}
          </div>
        ))}

        <ErrorAlert message={publish.errorMessage ?? remove.errorMessage} />

        <Textarea
          aria-label={dossierContent.procedureDetail.comments.placeholder}
          placeholder={dossierContent.procedureDetail.comments.placeholder}
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />

        <MentionPicker access={access} onSelect={addMention} />

        <Button
          variant="default"
          disabled={content.trim() === "" || !access.can("comments:write")}
          pending={publish.isPending}
          onClick={() => publish.mutate(undefined)}
        >
          {dossierContent.procedureDetail.comments.submitButton}
        </Button>
      </CardContent>
    </Card>
  );
};

/**
 * A discrete picker beside the comment box rather than an inline "@" inside the textarea: a
 * dossier holds a handful of members, so a list to choose from beats a search nobody needs.
 */
const MentionPicker = ({
  access,
  onSelect,
}: {
  access: DossierContext;
  onSelect: (userId: string) => void;
}) => {
  const id = useId();

  return (
    <Field>
      <FieldLabel htmlFor={id}>{dossierContent.procedureDetail.comments.mentionLabel}</FieldLabel>
      <Select onValueChange={onSelect} value="">
        <SelectTrigger id={id}>
          <SelectValue placeholder={dossierContent.procedureDetail.comments.mentionPlaceholder} />
        </SelectTrigger>
        <SelectContent>
          {access.members
            .filter((member) => isMentionable(member.role))
            .map((member) => (
              <SelectItem key={member.userId} value={member.userId}>
                {access.firstNameOf(member.userId)}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </Field>
  );
};
