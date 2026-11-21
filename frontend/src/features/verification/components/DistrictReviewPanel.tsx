import { useState } from 'react';
import { toast } from 'sonner';
import { verificationService } from '../services/verification.service';
import { ConfirmActionDialog } from './ConfirmActionDialog';
import { Button } from '../../../components/ui/button';
import type { WorkflowVerificationTask } from '../../../services/workflow-demo-data.service';

interface DistrictReviewPanelProps {
  task: WorkflowVerificationTask;
  onActionComplete?: () => void;
}

export function DistrictReviewPanel({ task, onActionComplete }: DistrictReviewPanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [action, setAction] = useState<'APPROVE' | 'REJECT' | 'REQUEST_CLARIFICATION'>('APPROVE');
  const [remark, setRemark] = useState('');

  function openDialog(a: 'APPROVE' | 'REJECT' | 'REQUEST_CLARIFICATION') {
    setAction(a);
    setRemark('');
    setDialogOpen(true);
  }

  async function handleConfirm() {
    try {
      await verificationService.submitDistrictReview(task.id, action, remark);
      const msg = action === 'APPROVE' ? 'Application approved and forwarded to finance.' : action === 'REJECT' ? 'Application rejected.' : 'Clarification requested. Application sent back to field officer.';
      toast.success(msg);
      setDialogOpen(false);
      onActionComplete?.();
    } catch {
      toast.error('Action failed. Please try again.');
    }
  }

  const dialogTitles: Record<string, string> = {
    APPROVE: 'Confirm Approval',
    REJECT: 'Confirm Rejection',
    REQUEST_CLARIFICATION: 'Confirm Clarification Request',
  };
  const dialogDescriptions: Record<string, string> = {
    APPROVE: 'Are you sure you want to approve this application? It will be forwarded to finance for disbursement authorization.',
    REJECT: 'Are you sure you want to reject this application? This action cannot be undone.',
    REQUEST_CLARIFICATION: 'Are you sure you want to request clarification? The application will be sent back to the field officer.',
  };
  const dialogLabels: Record<string, string> = {
    APPROVE: 'Approve',
    REJECT: 'Reject',
    REQUEST_CLARIFICATION: 'Request Clarification',
  };

  return (
    <div className="space-y-4">
      {/* Field verification report */}
      <div className="rounded-lg border border-gov-border bg-white">
        <div className="px-5 py-4 border-b border-gov-border">
          <h3 className="text-sm font-semibold text-text-primary">Field Verification Report</h3>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-text-secondary">Field Officer</p>
              <p className="text-sm text-text-primary">{task.fieldOfficerName ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Verified At</p>
              <p className="text-sm text-text-primary tabular-nums">{task.fieldVerifiedAt ? task.fieldVerifiedAt.slice(0, 10) : '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Finding</p>
              <p className="text-sm text-text-primary">{task.fieldFinding ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Recommendation</p>
              <p className="text-sm text-text-primary">{task.fieldRecommendation ?? '—'}</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-text-secondary">Remarks</p>
            <p className="text-sm text-text-primary mt-1">{task.fieldRemarks ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-text-secondary">Evidence</p>
            <p className="text-sm text-text-primary font-mono mt-1">{task.fieldEvidence ?? '—'}</p>
          </div>
        </div>
      </div>

      {/* Action controls */}
      <div className="rounded-lg border border-gov-border bg-white p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-3">District Review Actions</h3>
        <div className="flex items-center gap-3">
          <Button onClick={() => openDialog('APPROVE')}>Approve</Button>
          <Button variant="destructive" onClick={() => openDialog('REJECT')}>Reject</Button>
          <Button variant="outline" onClick={() => openDialog('REQUEST_CLARIFICATION')}>Request Clarification</Button>
        </div>
      </div>

      {/* Confirmation dialog */}
      <ConfirmActionDialog
        open={dialogOpen}
        onConfirm={handleConfirm}
        onCancel={() => setDialogOpen(false)}
        title={dialogTitles[action]}
        description={dialogDescriptions[action]}
        confirmLabel={dialogLabels[action]}
        variant={action === 'REJECT' ? 'destructive' : 'default'}
      />

      {/* Remark input rendered inside the dialog via a workaround — we use a separate input here */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDialogOpen(false)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-text-primary">{dialogTitles[action]}</h3>
            <p className="text-sm text-text-secondary">{dialogDescriptions[action]}</p>
            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              rows={3}
              placeholder="Add a remark (optional)…"
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-gov-blue focus:outline-none focus:ring-1 focus:ring-gov-blue"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setDialogOpen(false)} className="rounded-md border border-gov-border px-4 py-2 text-sm">Cancel</button>
              <button onClick={handleConfirm} className={`rounded-md px-4 py-2 text-sm text-white ${action === 'REJECT' ? 'bg-red-600' : 'bg-gov-blue'}`}>{dialogLabels[action]}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
