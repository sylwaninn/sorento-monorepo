import { sharedContent } from "@/components/content";
import { dossierContent } from "@/features/dossier/content";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const { list } = dossierContent.members;

export interface TransferOwnershipDialogProps {
  memberName: string;
  onConfirm: () => void;
}

export const TransferOwnershipDialog = ({
  memberName,
  onConfirm,
}: TransferOwnershipDialogProps) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="ghost" size="sm">
        {list.transferButton}
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent className="sm:max-w-100">
      <AlertDialogHeader>
        <AlertDialogTitle>{list.transferConfirmTitle}</AlertDialogTitle>
      </AlertDialogHeader>
      <AlertDialogDescription>
        {list.transferConfirmDescription} ({memberName})
      </AlertDialogDescription>
      <AlertDialogFooter>
        <AlertDialogCancel>{sharedContent.cancel}</AlertDialogCancel>
        <AlertDialogAction variant="destructive" onClick={onConfirm}>
          {list.transferConfirmButton}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
