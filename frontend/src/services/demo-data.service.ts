import type { UserResponse, UserRole } from '../types/auth';

export type SchemeStatus = 'DRAFT' | 'OPEN' | 'PAUSED' | 'CLOSED';
export type BeneficiaryType = 'INDIVIDUAL' | 'ORGANIZATION';
export type BeneficiaryStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING';
export type WorkflowStage =
  | 'SUBMITTED'
  | 'FIELD_PENDING'
  | 'DISTRICT_REVIEW'
  | 'SECOND_REVIEW'
  | 'FINANCE_REVIEW'
  | 'BUDGET_HOLD'
  | 'APPROVED'
  | 'REJECTED'
  | 'CLOSED'
  | 'TERMINATED';

export interface SchemeCriterion {
  attribute: string;
  operator: string;
  threshold: string | number;
  mandatory: boolean;
  description?: string;
}

export interface DemoScheme {
  id: string;
  code: string;
  name: string;
  description: string;
  status: SchemeStatus;
  minGrantAmount: number;
  maxGrantAmount: number;
  startDate: string;
  endDate: string;
  criteria: SchemeCriterion[];
}

export interface DemoBeneficiary {
  id: string;
  userId: string;
  referenceId: string;
  fullName: string;
  type: BeneficiaryType;
  regionId: number;
  regionName: string;
  email: string;
  phone: string;
  nationalId: string;
  ssn: string;
  status: BeneficiaryStatus;
}

export interface ApplicationTransition {
  stage: WorkflowStage;
  date: string;
  remark?: string;
}

export interface DemoApplication {
  id: string;
  referenceNo: string;
  beneficiaryId: string;
  schemeId: string;
  status: WorkflowStage;
  workflowStage: WorkflowStage;
  requestedAmount: number;
  submittedAt: string;
  assignedAt?: string;
  assignedOfficerId?: string;
  assignedOfficerName?: string;
  regionId: number;
  transitions: ApplicationTransition[];
}

export interface DemoActivity {
  applicationId: string;
  referenceNo: string;
  eventType: string;
  timestamp: string;
}

const makeScheme = (
  id: string,
  code: string,
  name: string,
  status: SchemeStatus,
  min: number,
  max: number,
): DemoScheme => ({
  id,
  code,
  name,
  description: `${name} supports eligible applicants with a targeted government grant.`,
  status,
  minGrantAmount: min,
  maxGrantAmount: max,
  startDate: '2025-01-01',
  endDate: '2027-12-31',
  criteria: [
    { attribute: 'annualIncome', operator: 'LESS_THAN_OR_EQUAL', threshold: 500000, mandatory: true, description: 'Annual household income must not exceed ₹5,00,000.' },
    { attribute: 'region', operator: 'IN', threshold: 'Eligible regions', mandatory: true },
    { attribute: 'age', operator: 'GREATER_THAN_OR_EQUAL', threshold: 18, mandatory: false, description: 'Applicant must be at least 18 years old.' },
  ],
});

export const demoSchemes: DemoScheme[] = [
  makeScheme('scheme-1', 'AGRI-2025', 'Small Farmer Support Grant', 'OPEN', 10000, 50000),
  makeScheme('scheme-2', 'EDU-2025', 'Higher Education Assistance', 'OPEN', 15000, 100000),
  makeScheme('scheme-3', 'WOMEN-2025', 'Women Entrepreneur Fund', 'PAUSED', 25000, 250000),
  makeScheme('scheme-4', 'RURAL-2024', 'Rural Enterprise Development', 'CLOSED', 20000, 150000),
  makeScheme('scheme-5', 'START-2026', 'Community Innovation Pilot', 'DRAFT', 50000, 500000),
];

const names = [
  'Aarav Sharma', 'Diya Patel', 'Kabir Singh', 'Ananya Rao', 'Vivaan Kumar',
  'Isha Mehta', 'Arjun Nair', 'Saanvi Das', 'Reyansh Gupta', 'Aadhya Reddy',
  'Rohan Joshi', 'Meera Iyer',
];

export const demoBeneficiaries: DemoBeneficiary[] = names.map((fullName, index) => ({
  id: `beneficiary-${String(index + 1).padStart(3, '0')}`,
  userId: index === 0 ? 'demo-beneficiary-user' : `demo-user-${index + 1}`,
  referenceId: `BEN-2025-${String(index + 1).padStart(4, '0')}`,
  fullName,
  type: index === 8 ? 'ORGANIZATION' : 'INDIVIDUAL',
  regionId: index % 3 + 1,
  regionName: ['North District', 'Central District', 'South District'][index % 3] ?? 'North District',
  email: `${fullName.toLowerCase().split(' ').join('.')}@example.gov.in`,
  phone: `+91 98${String(10000000 + index * 137).slice(0, 8)}`,
  nationalId: `****${String(12340000 + index).slice(-4)}`,
  ssn: `****${String(76540000 + index).slice(-4)}`,
  status: (['ACTIVE', 'ACTIVE', 'PENDING', 'INACTIVE'] as const)[index % 4] ?? 'ACTIVE',
}));

const stages: WorkflowStage[] = [
  'SUBMITTED', 'SUBMITTED', 'FIELD_PENDING', 'FIELD_PENDING',
  'DISTRICT_REVIEW', 'DISTRICT_REVIEW', 'SECOND_REVIEW', 'SECOND_REVIEW',
  'FINANCE_REVIEW', 'FINANCE_REVIEW', 'BUDGET_HOLD', 'BUDGET_HOLD',
  'APPROVED', 'APPROVED', 'REJECTED', 'CLOSED', 'TERMINATED',
];

export const demoApplications: DemoApplication[] = stages.map((stage, index) => {
  const beneficiary = demoBeneficiaries[index % demoBeneficiaries.length]!;
  const scheme = demoSchemes[index % demoSchemes.length]!;
  const submittedAt = new Date(Date.UTC(2025, 5 + Math.floor(index / 4), 2 + index, 10 + index % 8)).toISOString();
  const transitions: ApplicationTransition[] = [
    { stage: 'SUBMITTED', date: submittedAt, remark: 'Application submitted for review.' },
  ];
  if (stage !== 'SUBMITTED') {
    transitions.push({
      stage,
      date: new Date(Date.parse(submittedAt) + 86_400_000 * (index % 5 + 1)).toISOString(),
      remark: index % 3 === 0 ? 'Documents reviewed and recorded.' : '',
    });
  }
  return {
    id: `application-${String(index + 1).padStart(3, '0')}`,
    referenceNo: `APP-2025-${String(index + 1).padStart(6, '0')}`,
    beneficiaryId: beneficiary.id,
    schemeId: scheme.id,
    status: stage,
    workflowStage: stage,
    requestedAmount: 18000 + index * 7250,
    submittedAt,
    assignedAt: stage === 'FIELD_PENDING' ? submittedAt : undefined,
    assignedOfficerId: stage === 'FIELD_PENDING' ? 'demo-field-officer' : undefined,
    assignedOfficerName: stage === 'DISTRICT_REVIEW' ? 'Suresh Verma' : undefined,
    regionId: beneficiary.regionId,
    transitions,
  };
});

export const demoActivities: DemoActivity[] = [...demoApplications]
  .sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt))
  .slice(0, 10)
  .map((application, index) => ({
    applicationId: application.id,
    referenceNo: application.referenceNo,
    eventType: index === 0 ? 'Application updated' : `Moved to ${application.workflowStage}`,
    timestamp: new Date(Date.parse(application.submittedAt) + index * 3_600_000).toISOString(),
  }))
  .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));

export const demoUserIds = {
  beneficiary: 'demo-beneficiary-user',
  fieldOfficer: 'demo-field-officer',
  districtOfficer: 'demo-district-officer',
  financeApprover: 'demo-finance-approver',
} as const;

const delay = <T>(value: T): Promise<T> =>
  new Promise((resolve) => window.setTimeout(() => resolve(value), 80));

export const demoDataService = {
  listSchemes: () => delay([...demoSchemes]),
  getScheme: (id: string) => delay(demoSchemes.find((scheme) => scheme.id === id) ?? null),
  listBeneficiaries: () => delay([...demoBeneficiaries]),
  getBeneficiary: (id: string) => delay(demoBeneficiaries.find((beneficiary) => beneficiary.id === id)),
  getBeneficiaryForUser: (user: UserResponse) => delay(
    demoBeneficiaries.find((beneficiary) => beneficiary.userId === user.id)
      ?? (user.role === 'BENEFICIARY' ? demoBeneficiaries[0] : undefined),
  ),
  listApplications: () => delay([...demoApplications]),
  getApplication: (id: string) => delay(demoApplications.find((application) => application.id === id)),
  getActivity: () => delay([...demoActivities]),
  submitApplication: async (beneficiaryId: string, schemeId: string, requestedAmount: number) => {
    const scheme = demoSchemes.find((item) => item.id === schemeId);
    if (!scheme || scheme.status !== 'OPEN') throw new Error('This scheme is not accepting applications.');
    if (requestedAmount < scheme.minGrantAmount || requestedAmount > scheme.maxGrantAmount) {
      throw new Error('Requested amount is outside this scheme’s grant range.');
    }
    if (!demoBeneficiaries.some((item) => item.id === beneficiaryId)) {
      throw new Error('Beneficiary profile could not be found.');
    }
    const sequence = demoApplications.length + 1;
    const today = new Date().toISOString().slice(0, 10).split('-').join('');
    const application: DemoApplication = {
      id: `application-${String(sequence).padStart(3, '0')}`,
      referenceNo: `APP-${today}-${String(sequence).padStart(6, '0')}`,
      beneficiaryId,
      schemeId,
      status: 'SUBMITTED',
      workflowStage: 'SUBMITTED',
      requestedAmount,
      submittedAt: new Date().toISOString(),
      regionId: demoBeneficiaries.find((item) => item.id === beneficiaryId)!.regionId,
      transitions: [{ stage: 'SUBMITTED', date: new Date().toISOString(), remark: 'Application submitted.' }],
    };
    demoApplications.push(application);
    return application;
  },
};

export const isApplicationVisibleToRole = (
  application: DemoApplication,
  user: UserResponse,
  linkedBeneficiaryId?: string,
): boolean => {
  switch (user.role as UserRole) {
    case 'ADMIN':
      return true;
    case 'BENEFICIARY':
      return application.beneficiaryId === linkedBeneficiaryId;
    case 'FIELD_OFFICER':
      return application.workflowStage === 'FIELD_PENDING'
        && application.assignedOfficerId === (user.id === demoUserIds.fieldOfficer ? user.id : demoUserIds.fieldOfficer);
    case 'DISTRICT_OFFICER':
      return ['DISTRICT_REVIEW', 'SECOND_REVIEW'].includes(application.workflowStage)
        && user.regionIds.includes(application.regionId);
    case 'FINANCE_APPROVER':
      return ['FINANCE_REVIEW', 'BUDGET_HOLD'].includes(application.workflowStage);
    default:
      return false;
  }
};
