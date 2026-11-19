import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { useSetUserStatusMutation } from '../hooks/useUsers';
import { ApiError } from '../../../services/api-client';

interface StatusChangeDialogProps {
  userId: string;
  fullName: string;
  /** The desired new active state (opposite of current). */
  active: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Confirmation dialog for activating / deactivating a user. */
export function StatusChangeDialog({
  userId,
  fullName,
  active,
  open,
  onOpenChange,
}: StatusChangeDialogProps) {
  const mutation = useSetUserStatusMutation();
  const action = active ? 'Activate' : 'Deactivate';

  async function onConfirm() {
    try {
      await mutation.mutateAsync({ id: userId, active });
      toast.success(`User ${active ? 'activated' : 'deactivated'}.`);
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Unable to update user status.';
      toast.error(msg);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{action} user</DialogTitle>
          <DialogDescription>
            Are you sure you want to {action.toLowerCase()}{' '}
            <strong className="text-text-primary">{fullName}</strong>?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant={active ? 'default' : 'destructive'}
            onClick={onConfirm}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" />
                {action}…
              </>
            ) : (
              action
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
