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
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Button } from '../../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { useUpdateSettingMutation } from '../hooks/useSettings';
import { updateSettingSchema } from '../schemas/setting.schema';
import { ApiError } from '../../../services/api-client';
import type { SettingResponse } from '../types/setting.types';

interface EditSettingFormProps {
  setting: SettingResponse;
  onDone: () => void;
}

function EditSettingForm({ setting, onDone }: EditSettingFormProps) {
  const mutation = useUpdateSettingMutation();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<{ value: string }>({
    resolver: zodResolver(updateSettingSchema(setting.valueType)),
    defaultValues: { value: setting.value },
  });

  const value = watch('value');

  async function onSubmit(data: { value: string }) {
    setSubmitError(null);
    try {
      await mutation.mutateAsync({ key: setting.key, value: data.value });
      toast.success(`Setting "${setting.key}" updated.`);
      onDone();
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors && err.fieldErrors.length > 0) {
        for (const fe of err.fieldErrors) setError('value', { message: fe.message });
      } else if (err instanceof ApiError && err.errorCode === 'RESOURCE_NOT_FOUND') {
        setSubmitError('Setting not found.');
      } else {
        setSubmitError(err instanceof ApiError ? err.message : 'Unable to update setting.');
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <DialogDescription>
        {setting.description ?? 'No description provided.'}
      </DialogDescription>

      <div className="space-y-1.5">
        <Label htmlFor="setting-value">
          Value <span className="text-text-secondary text-xs font-normal">({setting.valueType})</span>
        </Label>

        {setting.valueType === 'BOOL' ? (
          <Select
            value={value}
            onValueChange={(v) => setValue('value', v, { shouldValidate: true })}
          >
            <SelectTrigger id="setting-value">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Enabled</SelectItem>
              <SelectItem value="false">Disabled</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Input
            id="setting-value"
            type="text"
            inputMode={
              setting.valueType === 'INT' ? 'numeric' : setting.valueType === 'MONEY' ? 'decimal' : 'text'
            }
            aria-invalid={!!errors.value}
            {...register('value')}
          />
        )}

        {errors.value && (
          <p className="text-sm text-red-600" role="alert">
            {errors.value.message}
          </p>
        )}
      </div>

      {submitError && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2" role="alert">
          <p className="text-sm text-red-700">{submitError}</p>
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={isSubmitting}>
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
  );
}

interface EditSettingDialogProps {
  setting: SettingResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditSettingDialog({ setting, open, onOpenChange }: EditSettingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit setting</DialogTitle>
        </DialogHeader>
        {setting && (
          <EditSettingForm key={setting.key} setting={setting} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
