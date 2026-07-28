import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Autocomplete,
  Button,
  Card,
  Label,
  ListBox,
  SearchField,
  TextArea,
  Typography,
  useFilter,
} from "@heroui/react";
import { useAuth } from "@/auth/useAuth";
import { ErrorAlert } from "@/components/ErrorAlert";
import { InlineLoader } from "@/components/PageLoader";
import { dossierContent } from "@/features/dossier/content";
import { useAppMutation } from "@/hooks/use-app-mutation";
import type { DossierContext } from "@/hooks/use-dossier";
import { queryKeys } from "@/lib/query-keys";
import { repositories } from "@/lib/repositories";

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
      <Card.Content className="flex flex-col gap-4 py-4">
        {commentsQuery.isPending ? <InlineLoader /> : null}

        {!commentsQuery.isPending && comments.length === 0 ? (
          <Typography.Paragraph color="muted" size="sm">
            {dossierContent.procedureDetail.comments.empty}
          </Typography.Paragraph>
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
                  <Typography type="body-xs" color="muted" weight="medium">
                    {access.firstNameOf(comment.authorId)}
                  </Typography>
                  <span>{comment.content}</span>
                </div>
                {comment.authorId === user?.id || access.can("comments:deleteAny") ? (
                  <Button variant="ghost" size="sm" onPress={() => remove.mutate(comment.id)}>
                    {dossierContent.procedureDetail.comments.deleteButton}
                  </Button>
                ) : null}
              </div>
            )}
          </div>
        ))}

        <ErrorAlert message={publish.errorMessage ?? remove.errorMessage} />

        <TextArea
          aria-label={dossierContent.procedureDetail.comments.placeholder}
          placeholder={dossierContent.procedureDetail.comments.placeholder}
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />

        <MentionPicker access={access} onSelect={addMention} />

        <Button
          variant="primary"
          isDisabled={content.trim() === "" || !access.can("comments:write")}
          isPending={publish.isPending}
          onPress={() => publish.mutate(undefined)}
        >
          {dossierContent.procedureDetail.comments.submitButton}
        </Button>
      </Card.Content>
    </Card>
  );
};

// HeroUI's Autocomplete is a discrete picker (its own trigger + popover), not an inline "@"
// trigger inside a textarea — that pattern isn't offered by the component. Composed here as a
// standalone "mention someone" picker next to the comment box.
const MentionPicker = ({
  access,
  onSelect,
}: {
  access: DossierContext;
  onSelect: (userId: string) => void;
}) => {
  const { contains } = useFilter({ sensitivity: "base" });

  return (
    <Autocomplete onChange={(key) => key && onSelect(String(key))}>
      <Label>{dossierContent.procedureDetail.comments.mentionLabel}</Label>
      <Autocomplete.Trigger>
        <Autocomplete.Value />
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      <Autocomplete.Popover>
        <Autocomplete.Filter filter={contains}>
          <SearchField autoFocus name="mention-search">
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input
                placeholder={dossierContent.procedureDetail.comments.mentionPlaceholder}
              />
            </SearchField.Group>
          </SearchField>
          <ListBox>
            {access.members
              .filter((member) => member.role !== "trusted_contact")
              .map((member) => (
                <ListBox.Item
                  key={member.userId}
                  id={member.userId}
                  textValue={access.firstNameOf(member.userId)}
                >
                  {access.firstNameOf(member.userId)}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
    </Autocomplete>
  );
};
