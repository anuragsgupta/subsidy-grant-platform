import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { useChangeUserRoleMutation } from '../hooks/useUsers';
import { useRolesQuery } from '../../roles/hooks/useRoles';
import { changeRoleSchema } from '../schemas/user.schema';
import { ApiError } from '../../../services/api-client';

interface ChangeRoleDialogProps {
  userId: string;
  /** Current role id, used to pre-select (resolved from the role name). */
  currentRoleId?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Dialog with a role select; confirm calls PUT /users/{id}/role. */
export function ChangeRoleDialog({
  userId,
  currentRoleId,
  open,
  onOpenChange,
}: ChangeRoleDialogProps) {
  const mutation = useChangeUserRoleMutation();
  const { data: roles = [] } = useRolesQuery();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<{ roleId: number }>({
    resolver: zodResolver(changeRoleSchema),
    defaultValues: { roleId: currentRoleId },
  });

  // The form remounts each time the dialog opens (content is portal-mounted),
  // so defaultValues reapplies the pre-selected role.
  const selected = watch('roleId');

  async function onSubmit(data: { roleId: number }) {
    setSubmitError(null);
    try {
      await mutation.mutateAsync({ id: userId, roleId: data.roleId });
      toast.success('User role updated.');
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors && err.fieldErrors.length > 0) {
        for (const fe of err.fieldErrors) setError('roleId', { message: fe.message });
      } else if (err instanceof ApiError && err.errorCode === 'RESOURCE_NOT_FOUND') {
        setSubmitError('User or role not found.');
      } else {
        setSubmitError(err instanceof ApiError ? err.message : 'Unable to change role.');
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change role</DialogTitle>
          <DialogDescription>Select a new role for this user.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Select
              value={selected ? String(selected) : ''}
              onValueChange={(v) => setValue('roleId', Number(v), { shouldValidate: true })}
            >
              <SelectTrigger aria-label="Role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.roleId && (
              <p className="text-sm text-red-600" role="alert">
                {errors.roleId.message}
              </p>
            )}
          </div>

          {submitError && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2" role="alert">
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Saving…
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
