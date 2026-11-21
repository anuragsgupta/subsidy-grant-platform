import {
  getAllAssessments,
  getAssessmentByApplicationId,
  getCriteriaBySchemeId,
} from '../../../services/workflow-demo-data.service';
import type { WorkflowAssessment, WorkflowCriterion } from '../../../services/workflow-demo-data.service';

export const eligibilityService = {
  getAssessments(): Promise<WorkflowAssessment[]> {
    return Promise.resolve(getAllAssessments());
  },
  getAssessmentByApplicationId(applicationId: string): Promise<WorkflowAssessment | undefined> {
    return Promise.resolve(getAssessmentByApplicationId(applicationId));
  },
  getCriteriaBySchemeId(schemeId: string): Promise<WorkflowCriterion[]> {
    return Promise.resolve(getCriteriaBySchemeId(schemeId));
  },
};
