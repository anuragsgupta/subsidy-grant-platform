import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Button } from '../../../components/ui/button';
import { auditQuerySchema } from '../schemas/audit.schema';
import type { AuditFilterValues } from '../schemas/audit.schema';

const EMPTY: AuditFilterValues = {
  referenceNo: '',
  entityType: '',
  entityId: '',
  actorId: '',
  from: '',
  to: '',
};

interface AuditFiltersProps {
  onApply: (values: AuditFilterValues) => void;
  onClear: () => void;
  isFetching?: boolean;
}

/** Filter form: reference number, entity, actor UUID, and date range. */
export function AuditFilters({ onApply, onClear, isFetching }: AuditFiltersProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AuditFilterValues>({
    resolver: zodResolver(auditQuerySchema),
    defaultValues: EMPTY,
  });

  const field = 'space-y-1';
  const labelCls = 'text-xs font-medium text-text-secondary';

  return (
    <form
      onSubmit={handleSubmit(onApply)}
      className="flex flex-wrap items-end gap-3"
      noValidate
    >
      <div className={field}>
        <Label className={labelCls} htmlFor="referenceNo">Reference no.</Label>
        <Input id="referenceNo" className="w-44 h-8" {...register('referenceNo')} />
      </div>
      <div className={field}>
        <Label className={labelCls} htmlFor="entityType">Entity type</Label>
        <Input id="entityType" className="w-40 h-8" {...register('entityType')} />
      </div>
      <div className={field}>
        <Label className={labelCls} htmlFor="entityId">Entity id</Label>
        <Input id="entityId" className="w-40 h-8" {...register('entityId')} />
      </div>
      <div className={field}>
        <Label className={labelCls} htmlFor="actorId">Actor id</Label>
        <Input id="actorId" className="w-52 h-8" placeholder="UUID" {...register('actorId')} />
        {errors.actorId && (
          <p className="text-xs text-red-600" role="alert">{errors.actorId.message}</p>
        )}
      </div>
      <div className={field}>
        <Label className={labelCls} htmlFor="from">From</Label>
        <Input id="from" type="date" className="w-40 h-8" {...register('from')} />
      </div>
      <div className={field}>
        <Label className={labelCls} htmlFor="to">To</Label>
        <Input id="to" type="date" className="w-40 h-8" {...register('to')} />
      </div>
      <div className="flex gap-2 pb-0.5">
        <Button type="submit" size="sm" disabled={isFetching}>Apply</Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            reset(EMPTY);
            onClear();
          }}
        >
          Clear
        </Button>
      </div>
    </form>
  );
}
