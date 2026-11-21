import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle, HelpCircle, Info } from 'lucide-react';
import { useAssessmentQuery } from '../hooks/useEligibility';
import { QueryState } from '../../../components/states/QueryState';
import { EmptyState } from '../../../components/states/EmptyState';
import { DemoBadge } from '../../../components/common/DemoBadge';
import { AssessmentDecisionBadge } from '../components/AssessmentDecisionBadge';
import { CriterionResultTable } from '../components/CriterionResultTable';

export default function EligibilityResultPage() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const { data: assessment, isLoading, isError, error, refetch } = useAssessmentQuery(applicationId ?? '');

  if (isLoading || isError) {
    return (
      <div className="p-6 space-y-4">
        <Link to="/eligibility" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-gov-blue">
          <ArrowLeft size={14} /> Back to Assessments
        </Link>
        <QueryState
          isLoading={isLoading}
          isError={isError}
          error={error}
          isEmpty={false}
          onRetry={() => refetch()}
          skeletonRows={6}
        >
          {null}
        </QueryState>
      </div>
    );
  }

  if (assessment === undefined) {
    return (
      <div className="p-6 space-y-4">
        <Link to="/eligibility" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-gov-blue">
          <ArrowLeft size={14} /> Back to Assessments
        </Link>
        <EmptyState message="Assessment not found for this application." />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Link to="/eligibility" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-gov-blue">
        <ArrowLeft size={14} /> Back to Assessments
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-text-primary font-mono">{assessment.applicationRef}</h1>
            <DemoBadge />
          </div>
          <p className="mt-0.5 text-sm text-text-secondary">{assessment.beneficiaryName} - {assessment.schemeName}</p>
        </div>
        <AssessmentDecisionBadge decision={assessment.decision} />
      </div>

      <section className="rounded-lg border border-gov-border bg-white">
        <div className="px-5 py-4 border-b border-gov-border">
          <h2 className="text-sm font-semibold text-text-primary">Assessment Summary</h2>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-text-secondary">Score</p>
              <p className="text-sm text-text-primary font-semibold">{assessment.score}/100</p>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Risk Tier</p>
              <p className="text-sm text-text-primary">{assessment.riskTier}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Assessed At</p>
              <p className="text-sm text-text-primary tabular-nums">{assessment.assessedAt.slice(0, 10)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Auto-Rejected</p>
              <p className="text-sm text-text-primary">{assessment.autoRejected ? 'Yes' : 'No'}</p>
            </div>
          </div>

          {assessment.decision === 'INELIGIBLE' && assessment.failedMandatoryDescriptions.length > 0 && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={16} className="text-red-600" />
                <p className="text-sm font-semibold text-red-700">Failed Mandatory Criteria</p>
              </div>
              <ul className="list-disc list-inside space-y-1">
                {assessment.failedMandatoryDescriptions.map((d, i) => (
                  <li key={i} className="text-sm text-red-600">{d}</li>
                ))}
              </ul>
            </div>
          )}

          {assessment.decision === 'REQUIRES_MANUAL_REVIEW' && (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2">
                <HelpCircle size={16} className="text-amber-600" />
                <p className="text-sm text-amber-700">This application requires manual review by a human reviewer before a final decision can be made.</p>
              </div>
            </div>
          )}

          {assessment.decision === 'INCOMPLETE_INFORMATION' && assessment.missingAttributes.length > 0 && (
            <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Info size={16} className="text-blue-600" />
                <p className="text-sm font-semibold text-blue-700">Missing Beneficiary Attributes</p>
              </div>
              <ul className="list-disc list-inside space-y-1">
                {assessment.missingAttributes.map((attr, i) => (
                  <li key={i} className="text-sm text-blue-600 font-mono">{attr}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-gov-border bg-white">
        <div className="px-5 py-4 border-b border-gov-border">
          <h2 className="text-sm font-semibold text-text-primary">Criterion Results</h2>
        </div>
        <div className="p-4">
          <CriterionResultTable results={assessment.criterionResults} />
        </div>
      </section>
    </div>
  );
}
