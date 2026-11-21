import {
  getAllVerificationTasks,
  getVerificationTaskById,
  updateFieldVerification,
  updateDistrictReview,
} from '../../../services/workflow-demo-data.service';
import type {
  WorkflowVerificationTask,
  FieldFinding,
  VerificationRecommendation,
} from '../../../services/workflow-demo-data.service';
import type { UserResponse } from '../../../types/auth';

export const verificationService = {
  getAll(): Promise<WorkflowVerificationTask[]> {
    return Promise.resolve(getAllVerificationTasks());
  },
  getById(id: string): Promise<WorkflowVerificationTask | undefined> {
    return Promise.resolve(getVerificationTaskById(id));
  },
  submitFieldVerification(
    taskId: string,
    data: { finding: FieldFinding; remarks: string; evidence: string; recommendation: VerificationRecommendation },
  ): Promise<void> {
    updateFieldVerification(taskId, data);
    return Promise.resolve();
  },
  submitDistrictReview(
    taskId: string,
    action: 'APPROVE' | 'REJECT' | 'REQUEST_CLARIFICATION',
    remark: string,
  ): Promise<void> {
    updateDistrictReview(taskId, action, remark);
    return Promise.resolve();
  },
};

export function getTasksForRole(
  tasks: WorkflowVerificationTask[],
  user: UserResponse,
): WorkflowVerificationTask[] {
  switch (user.role) {
    case 'FIELD_OFFICER':
      return tasks.filter(
        (t) => t.currentStage === 'FIELD_PENDING' && t.assignedOfficerId === user.id,
      );
    case 'DISTRICT_OFFICER':
      return tasks.filter(
        (t) =>
          t.currentStage === 'DISTRICT_REVIEW' &&
          (user.regionIds ?? []).includes(t.regionId ?? -1),
      );
    case 'ADMIN':
    default:
      return tasks;
  }
}
