import { useQuery } from '@tanstack/react-query';
import { eligibilityService } from '../services/eligibility.service';

export const eligibilityKeys = {
  assessments: ['eligibility', 'assessments'] as const,
  assessment: (applicationId: string) => ['eligibility', 'assessment', applicationId] as const,
  criteria: (schemeId: string) => ['eligibility', 'criteria', schemeId] as const,
};

export function useAssessmentsQuery() {
  return useQuery({
    queryKey: eligibilityKeys.assessments,
    queryFn: eligibilityService.getAssessments,
    staleTime: Infinity,
  });
}

export function useAssessmentQuery(applicationId: string) {
  return useQuery({
    queryKey: eligibilityKeys.assessment(applicationId),
    queryFn: () => eligibilityService.getAssessmentByApplicationId(applicationId),
    staleTime: Infinity,
  });
}

export function useCriteriaQuery(schemeId: string) {
  return useQuery({
    queryKey: eligibilityKeys.criteria(schemeId),
    queryFn: () => eligibilityService.getCriteriaBySchemeId(schemeId),
    staleTime: Infinity,
  });
}
