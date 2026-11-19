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
import { useChangeUserRegionsMutation } from '../hooks/useUsers';
import { useRegionsQuery } from '../../regions/hooks/useRegions';
import { changeRegionsSchema } from '../schemas/user.schema';
import { ApiError } from '../../../services/api-client';

interface ChangeRegionsDialogProps {
  userId: string;
  /** Currently bound region ids, used to pre-select. */
  currentRegionIds: number[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Dialog with a region multi-select; confirm calls PUT /users/{id}/regions. */
export function ChangeRegionsDialog({
  userId,
  currentRegionIds,
  open,
  onOpenChange,
}: ChangeRegionsDialogProps) {
  const mutation = useChangeUserRegionsMutation();
  const { data: regions = [] } = useRegionsQuery();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<{ regionIds: number[] }>({
    resolver: zodResolver(changeRegionsSchema),
    defaultValues: { regionIds: currentRegionIds },
  });

  const selected = watch('regionIds');

  function toggle(id: number) {
    const next = selected.includes(id)
      ? selected.filter((x) => x !== id)
      : [...selected, id];
    setValue('regionIds', next, { shouldValidate: true });
  }

  async function onSubmit(data: { regionIds: number[] }) {
    setSubmitError(null);
    try {
      await mutation.mutateAsync({ id: userId, regionIds: data.regionIds });
      toast.success('User regions updated.');
      onOpenChange(false);
    } catch (err) {
      if (
        err instanceof ApiError &&
        (err.errorCode === 'BUSINESS_RULE' || err.errorCode === 'INVALID_REGION_BINDING')
      ) {
        setSubmitError(err.message);
      } else if (err instanceof ApiError && err.errorCode === 'RESOURCE_NOT_FOUND') {
        setSubmitError('User not found.');
      } else {
        setSubmitError(err instanceof ApiError ? err.message : 'Unable to update regions.');
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage regions</DialogTitle>
          <DialogDescription>
            Select the regions this user is bound to.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="max-h-64 overflow-y-auto space-y-1 border border-gov-border rounded-md p-2">
            {regions.map((r) => (
              <label
                key={r.id}
                className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gov-blue/5 rounded px-1"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(r.id)}
                  onChange={() => toggle(r.id)}
                  className="h-4 w-4"
                />
                <span className="text-sm text-text-primary">
                  {r.name}{' '}
                  <span className="text-text-secondary">
                    ({r.code}, {r.type})
                  </span>
                </span>
              </label>
            ))}
          </div>

          {errors.regionIds && (
            <p className="text-sm text-red-600" role="alert">
              {errors.regionIds.message}
            </p>
          )}

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
