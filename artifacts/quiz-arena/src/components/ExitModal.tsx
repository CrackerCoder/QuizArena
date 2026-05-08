import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useT } from "@/lib/i18n";

export function ExitModal({
  open,
  onOpenChange,
  onConfirm,
  isGame = true,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: () => void;
  isGame?: boolean;
}) {
  const t = useT();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{isGame ? t("leaveGame") : t("goBack")}</AlertDialogTitle>
          <AlertDialogDescription>
            {isGame ? t("progressWillBeLost") : t("goBackDesc")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("stay")}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{t("leave")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
