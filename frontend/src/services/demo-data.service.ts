/**
 * demo-data.service.ts
 *
 * Static fixture data and helper functions for the GSDTS frontend Phase 4 showcase.
 * All data is kept in-memory. No real API calls are made from this module.
 *
 * IMPORTANT: This module must remain isolated from production API services.
 * It is used only when the backend has not yet implemented the corresponding endpoint.
 */

import { format } from 'date-fns';

// ---------------------------------------------------------------------------
// Enums / union types
// ---------------------------------------------------------------------------

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

export type SchemeStatus = 'DRAFT' | 'OPEN' | 'PAUSED' | 'CLOSED';
export type BeneficiaryType = 'INDIVIDUAL' | 'ORGANIZATION' | 'BUSINESS';
export type BeneficiaryStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface DemoEligibilityCriterion {
  attribute: string;
  operator: 'EQ' | 'GTE' | 'LTE' | 'IN';
  threshold: string;
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
  eligibilityCriteria: DemoEligibilityCriterion[];
}

export interface DemoBeneficiary {
  id: string;
  referenceId: string;
  fullName: string;
  type: BeneficiaryType;
  regionId: number;
  regionName: string;
  email: string;
  phone: string;
  status: BeneficiaryStatus;
  nationalId: string;
  ssn: string;
  linkedUserId?: string;
}

export interface DemoApplicationEvent {
  stage: WorkflowStage;
  transitionDate: string;
  remark?: string;
}

export interface DemoApplication {
  id: string;
  referenceNumber: string;
  beneficiaryId: string;
  beneficiaryName: string;
  schemeId: string;
  schemeName: string;
  requestedAmount: number;
  status: WorkflowStage;
  submissionDate: string;
  assignedOfficerId?: string;
  regionId?: number;
  timeline: DemoApplicationEvent[];
}

export interface DemoActivityEvent {
  applicationRef: string;
  eventType: string;
  timestamp: string;
}

export interface DemoStats {
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  totalRequestedAmount: number;
  applicationsByStatus: { status: WorkflowStage; count: number }[];
  applicationsByRegionId: { regionId: number; count: number }[];
  recentActivity: DemoActivityEvent[];
}

// ---------------------------------------------------------------------------
// Reference number generator
// ---------------------------------------------------------------------------

let applicationCounter = 0;

export function generateReferenceNumber(counter: number): string {
  const dateStr = format(new Date(), 'yyyyMMdd');
  return `APP-${dateStr}-${String(counter).padStart(6, '0')}`;
}

// ---------------------------------------------------------------------------
// Scheme fixtures
// ---------------------------------------------------------------------------

const SCHEMES: DemoScheme[] = [
  {
    id: 'sch-001',
    code: 'AGR-001',
    name: 'Agricultural Modernisation Fund',
    description:
      'Supports smallholder farmers in adopting modern agricultural techniques, equipment and irrigation infrastructure to improve crop yields and rural livelihoods.',
    status: 'DRAFT',
    minGrantAmount: 50000,
    maxGrantAmount: 500000,
    startDate: '2025-04-01',
    endDate: '2025-12-31',
    eligibilityCriteria: [
      {
        attribute: 'farmerRegistrationStatus',
        operator: 'EQ',
        threshold: 'REGISTERED',
        mandatory: true,
        description: 'Applicant must be a registered farmer with the Ministry of Agriculture.',
      },
      {
        attribute: 'landHoldingAcres',
        operator: 'GTE',
        threshold: '1',
        mandatory: true,
        description: 'Applicant must own or lease at least 1 acre of agricultural land.',
      },
      {
        attribute: 'annualIncomeINR',
        operator: 'LTE',
        threshold: '300000',
        mandatory: false,
        description: 'Preferential consideration for applicants with annual income below ₹3,00,000.',
      },
    ],
  },
  {
    id: 'sch-002',
    code: 'RHS-002',
    name: 'Rural Housing Scheme',
    description:
      'Provides financial assistance to rural families for constructing or upgrading permanent pucca houses under the national rural housing mission.',
    status: 'OPEN',
    minGrantAmount: 120000,
    maxGrantAmount: 250000,
    startDate: '2024-10-01',
    endDate: '2026-03-31',
    eligibilityCriteria: [
      {
        attribute: 'housingCategory',
        operator: 'IN',
        threshold: 'HOMELESS,KUTCHA',
        mandatory: true,
        description: 'Applicant must currently live in a kutcha house or have no housing.',
      },
      {
        attribute: 'bplStatus',
        operator: 'EQ',
        threshold: 'TRUE',
        mandatory: true,
        description: 'Applicant must hold a valid Below Poverty Line (BPL) card.',
      },
      {
        attribute: 'ageYears',
        operator: 'GTE',
        threshold: '18',
        mandatory: true,
        description: 'Applicant must be at least 18 years old.',
      },
    ],
  },
  {
    id: 'sch-003',
    code: 'SBD-003',
    name: 'Small Business Development Grant',
    description:
      'Encourages micro and small enterprises to expand operations, adopt technology and create local employment through targeted financial support.',
    status: 'PAUSED',
    minGrantAmount: 25000,
    maxGrantAmount: 750000,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    eligibilityCriteria: [
      {
        attribute: 'enterpriseCategory',
        operator: 'IN',
        threshold: 'MICRO,SMALL',
        mandatory: true,
        description: 'Enterprise must be classified as Micro or Small under MSME norms.',
      },
      {
        attribute: 'udyamRegistered',
        operator: 'EQ',
        threshold: 'TRUE',
        mandatory: true,
        description: 'Enterprise must hold a valid Udyam Registration Certificate.',
      },
      {
        attribute: 'operatingYears',
        operator: 'GTE',
        threshold: '1',
        mandatory: false,
        description: 'Preferential consideration for enterprises operational for at least 1 year.',
      },
    ],
  },
  {
    id: 'sch-004',
    code: 'ESP-004',
    name: 'Education Scholarship Programme',
    description:
      'Merit and means-based scholarships for students from economically weaker sections pursuing higher education at accredited institutions.',
    status: 'CLOSED',
    minGrantAmount: 15000,
    maxGrantAmount: 100000,
    startDate: '2023-06-01',
    endDate: '2024-05-31',
    eligibilityCriteria: [
      {
        attribute: 'familyAnnualIncomeINR',
        operator: 'LTE',
        threshold: '250000',
        mandatory: true,
        description: 'Family annual income must not exceed ₹2,50,000.',
      },
      {
        attribute: 'previousYearPercentage',
        operator: 'GTE',
        threshold: '60',
        mandatory: true,
        description: 'Applicant must have scored at least 60% in the previous academic year.',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Beneficiary fixtures
// ---------------------------------------------------------------------------

const BENEFICIARIES: DemoBeneficiary[] = [
  {
    id: 'ben-001',
    referenceId: 'BEN/2024/00001',
    fullName: 'Ramesh Kumar Verma',
    type: 'INDIVIDUAL',
    regionId: 1,
    regionName: 'North District',
    email: 'ramesh.verma@example.com',
    phone: '+91-9876543210',
    status: 'ACTIVE',
    nationalId: '****4521',
    ssn: '****8832',
    linkedUserId: 'test-user-id',
  },
  {
    id: 'ben-002',
    referenceId: 'BEN/2024/00002',
    fullName: 'Sunita Devi Sharma',
    type: 'INDIVIDUAL',
    regionId: 1,
    regionName: 'North District',
    email: 'sunita.sharma@example.com',
    phone: '+91-9876543211',
    status: 'ACTIVE',
    nationalId: '****7812',
    ssn: '****3341',
  },
  {
    id: 'ben-003',
    referenceId: 'BEN/2024/00003',
    fullName: 'Prakash Nair',
    type: 'INDIVIDUAL',
    regionId: 2,
    regionName: 'South District',
    email: 'prakash.nair@example.com',
    phone: '+91-9876543212',
    status: 'ACTIVE',
    nationalId: '****2234',
    ssn: '****9901',
  },
  {
    id: 'ben-004',
    referenceId: 'BEN/2024/00004',
    fullName: 'Meera Patel',
    type: 'INDIVIDUAL',
    regionId: 2,
    regionName: 'South District',
    email: 'meera.patel@example.com',
    phone: '+91-9876543213',
    status: 'PENDING',
    nationalId: '****6678',
    ssn: '****4457',
  },
  {
    id: 'ben-005',
    referenceId: 'BEN/2024/00005',
    fullName: 'Anil Joshi',
    type: 'INDIVIDUAL',
    regionId: 3,
    regionName: 'East District',
    email: 'anil.joshi@example.com',
    phone: '+91-9876543214',
    status: 'INACTIVE',
    nationalId: '****1189',
    ssn: '****7723',
  },
  {
    id: 'ben-006',
    referenceId: 'BEN/2024/00006',
    fullName: 'Green Valley Farmers Cooperative',
    type: 'ORGANIZATION',
    regionId: 1,
    regionName: 'North District',
    email: 'admin@greenvalleycoop.org',
    phone: '+91-9800001111',
    status: 'ACTIVE',
    nationalId: '****5590',
    ssn: '****0012',
  },
  {
    id: 'ben-007',
    referenceId: 'BEN/2024/00007',
    fullName: 'District Agricultural Society',
    type: 'ORGANIZATION',
    regionId: 2,
    regionName: 'South District',
    email: 'contact@districtagsoc.org',
    phone: '+91-9800002222',
    status: 'ACTIVE',
    nationalId: '****3367',
    ssn: '****6645',
  },
  {
    id: 'ben-008',
    referenceId: 'BEN/2024/00008',
    fullName: 'Sunrise Agro Industries Pvt. Ltd.',
    type: 'BUSINESS',
    regionId: 3,
    regionName: 'East District',
    email: 'info@sunriseagro.in',
    phone: '+91-9800003333',
    status: 'ACTIVE',
    nationalId: '****8841',
    ssn: '****2298',
  },
  {
    id: 'ben-009',
    referenceId: 'BEN/2024/00009',
    fullName: 'Horizon Micro Enterprises',
    type: 'BUSINESS',
    regionId: 1,
    regionName: 'North District',
    email: 'ops@horizonmicro.in',
    phone: '+91-9800004444',
    status: 'PENDING',
    nationalId: '****9934',
    ssn: '****1156',
  },
  {
    id: 'ben-010',
    referenceId: 'BEN/2024/00010',
    fullName: 'Kavitha Reddy',
    type: 'INDIVIDUAL',
    regionId: 3,
    regionName: 'East District',
    email: 'kavitha.reddy@example.com',
    phone: '+91-9876543219',
    status: 'INACTIVE',
    nationalId: '****5523',
    ssn: '****8810',
  },
];

// ---------------------------------------------------------------------------
// Application fixtures
// ---------------------------------------------------------------------------

const APPLICATIONS: DemoApplication[] = [
  // ── SUBMITTED (2) ────────────────────────────────────────────────────────
  {
    id: 'app-001',
    referenceNumber: 'APP-20250115-000001',
    beneficiaryId: 'ben-001',
    beneficiaryName: 'Ramesh Kumar Verma',
    schemeId: 'sch-002',
    schemeName: 'Rural Housing Scheme',
    requestedAmount: 200000,
    status: 'SUBMITTED',
    submissionDate: '2025-01-15',
    timeline: [
      {
        stage: 'SUBMITTED',
        transitionDate: '2025-01-15T10:30:00Z',
        remark: 'Application submitted by beneficiary.',
      },
    ],
  },
  {
    id: 'app-002',
    referenceNumber: 'APP-20250116-000002',
    beneficiaryId: 'ben-004',
    beneficiaryName: 'Meera Patel',
    schemeId: 'sch-002',
    schemeName: 'Rural Housing Scheme',
    requestedAmount: 180000,
    status: 'SUBMITTED',
    submissionDate: '2025-01-16',
    timeline: [
      {
        stage: 'SUBMITTED',
        transitionDate: '2025-01-16T09:15:00Z',
        remark: 'Application submitted by beneficiary.',
      },
    ],
  },

  // ── FIELD_PENDING (2) ─────────────────────────────────────────────────────
  {
    id: 'app-003',
    referenceNumber: 'APP-20250110-000003',
    beneficiaryId: 'ben-002',
    beneficiaryName: 'Sunita Devi Sharma',
    schemeId: 'sch-001',
    schemeName: 'Agricultural Modernisation Fund',
    requestedAmount: 300000,
    status: 'FIELD_PENDING',
    submissionDate: '2025-01-10',
    assignedOfficerId: 'test-user-id',
    regionId: 1,
    timeline: [
      {
        stage: 'SUBMITTED',
        transitionDate: '2025-01-10T08:00:00Z',
        remark: 'Application submitted.',
      },
      {
        stage: 'FIELD_PENDING',
        transitionDate: '2025-01-12T11:00:00Z',
        remark: 'Assigned to field officer for verification.',
      },
    ],
  },
  {
    id: 'app-004',
    referenceNumber: 'APP-20250111-000004',
    beneficiaryId: 'ben-006',
    beneficiaryName: 'Green Valley Farmers Cooperative',
    schemeId: 'sch-001',
    schemeName: 'Agricultural Modernisation Fund',
    requestedAmount: 450000,
    status: 'FIELD_PENDING',
    submissionDate: '2025-01-11',
    assignedOfficerId: 'test-user-id',
    regionId: 1,
    timeline: [
      {
        stage: 'SUBMITTED',
        transitionDate: '2025-01-11T09:30:00Z',
        remark: 'Application submitted.',
      },
      {
        stage: 'FIELD_PENDING',
        transitionDate: '2025-01-13T10:00:00Z',
        remark: 'Assigned to field officer for site inspection.',
      },
    ],
  },

  // ── DISTRICT_REVIEW (2) ───────────────────────────────────────────────────
  {
    id: 'app-005',
    referenceNumber: 'APP-20250105-000005',
    beneficiaryId: 'ben-003',
    beneficiaryName: 'Prakash Nair',
    schemeId: 'sch-002',
    schemeName: 'Rural Housing Scheme',
    requestedAmount: 240000,
    status: 'DISTRICT_REVIEW',
    submissionDate: '2025-01-05',
    regionId: 1,
    timeline: [
      {
        stage: 'SUBMITTED',
        transitionDate: '2025-01-05T08:00:00Z',
      },
      {
        stage: 'FIELD_PENDING',
        transitionDate: '2025-01-07T10:00:00Z',
        remark: 'Assigned to field officer.',
      },
      {
        stage: 'DISTRICT_REVIEW',
        transitionDate: '2025-01-14T14:00:00Z',
        remark: 'Field verification completed. Forwarded to district office.',
      },
    ],
  },
  {
    id: 'app-006',
    referenceNumber: 'APP-20250106-000006',
    beneficiaryId: 'ben-007',
    beneficiaryName: 'District Agricultural Society',
    schemeId: 'sch-001',
    schemeName: 'Agricultural Modernisation Fund',
    requestedAmount: 500000,
    status: 'DISTRICT_REVIEW',
    submissionDate: '2025-01-06',
    regionId: 1,
    timeline: [
      {
        stage: 'SUBMITTED',
        transitionDate: '2025-01-06T09:00:00Z',
      },
      {
        stage: 'FIELD_PENDING',
        transitionDate: '2025-01-08T11:00:00Z',
      },
      {
        stage: 'DISTRICT_REVIEW',
        transitionDate: '2025-01-15T16:00:00Z',
        remark: 'Field report received. Pending district officer review.',
      },
    ],
  },

  // ── SECOND_REVIEW (2) ─────────────────────────────────────────────────────
  {
    id: 'app-007',
    referenceNumber: 'APP-20241220-000007',
    beneficiaryId: 'ben-008',
    beneficiaryName: 'Sunrise Agro Industries Pvt. Ltd.',
    schemeId: 'sch-003',
    schemeName: 'Small Business Development Grant',
    requestedAmount: 600000,
    status: 'SECOND_REVIEW',
    submissionDate: '2024-12-20',
    regionId: 1,
    timeline: [
      {
        stage: 'SUBMITTED',
        transitionDate: '2024-12-20T10:00:00Z',
      },
      {
        stage: 'FIELD_PENDING',
        transitionDate: '2024-12-22T11:00:00Z',
      },
      {
        stage: 'DISTRICT_REVIEW',
        transitionDate: '2024-12-28T14:00:00Z',
      },
      {
        stage: 'SECOND_REVIEW',
        transitionDate: '2025-01-05T09:30:00Z',
        remark: 'Referred for second-level review due to grant amount exceeding threshold.',
      },
    ],
  },
  {
    id: 'app-008',
    referenceNumber: 'APP-20241218-000008',
    beneficiaryId: 'ben-009',
    beneficiaryName: 'Horizon Micro Enterprises',
    schemeId: 'sch-003',
    schemeName: 'Small Business Development Grant',
    requestedAmount: 550000,
    status: 'SECOND_REVIEW',
    submissionDate: '2024-12-18',
    regionId: 1,
    timeline: [
      {
        stage: 'SUBMITTED',
        transitionDate: '2024-12-18T09:00:00Z',
      },
      {
        stage: 'FIELD_PENDING',
        transitionDate: '2024-12-20T10:00:00Z',
      },
      {
        stage: 'DISTRICT_REVIEW',
        transitionDate: '2024-12-27T15:00:00Z',
      },
      {
        stage: 'SECOND_REVIEW',
        transitionDate: '2025-01-04T11:00:00Z',
        remark: 'Second review in progress.',
      },
    ],
  },

  // ── FINANCE_REVIEW (2) ────────────────────────────────────────────────────
  {
    id: 'app-009',
    referenceNumber: 'APP-20241210-000009',
    beneficiaryId: 'ben-002',
    beneficiaryName: 'Sunita Devi Sharma',
    schemeId: 'sch-002',
    schemeName: 'Rural Housing Scheme',
    requestedAmount: 250000,
    status: 'FINANCE_REVIEW',
    submissionDate: '2024-12-10',
    regionId: 2,
    timeline: [
      { stage: 'SUBMITTED', transitionDate: '2024-12-10T08:00:00Z' },
      { stage: 'FIELD_PENDING', transitionDate: '2024-12-12T10:00:00Z' },
      { stage: 'DISTRICT_REVIEW', transitionDate: '2024-12-18T14:00:00Z' },
      {
        stage: 'FINANCE_REVIEW',
        transitionDate: '2024-12-24T09:00:00Z',
        remark: 'District approved. Forwarded to finance for disbursement authorisation.',
      },
    ],
  },
  {
    id: 'app-010',
    referenceNumber: 'APP-20241208-000010',
    beneficiaryId: 'ben-006',
    beneficiaryName: 'Green Valley Farmers Cooperative',
    schemeId: 'sch-001',
    schemeName: 'Agricultural Modernisation Fund',
    requestedAmount: 480000,
    status: 'FINANCE_REVIEW',
    submissionDate: '2024-12-08',
    regionId: 2,
    timeline: [
      { stage: 'SUBMITTED', transitionDate: '2024-12-08T09:00:00Z' },
      { stage: 'FIELD_PENDING', transitionDate: '2024-12-10T11:00:00Z' },
      { stage: 'DISTRICT_REVIEW', transitionDate: '2024-12-16T15:00:00Z' },
      {
        stage: 'FINANCE_REVIEW',
        transitionDate: '2024-12-22T10:00:00Z',
        remark: 'Pending finance officer authorisation.',
      },
    ],
  },

  // ── BUDGET_HOLD (2) ───────────────────────────────────────────────────────
  {
    id: 'app-011',
    referenceNumber: 'APP-20241130-000011',
    beneficiaryId: 'ben-003',
    beneficiaryName: 'Prakash Nair',
    schemeId: 'sch-001',
    schemeName: 'Agricultural Modernisation Fund',
    requestedAmount: 400000,
    status: 'BUDGET_HOLD',
    submissionDate: '2024-11-30',
    regionId: 2,
    timeline: [
      { stage: 'SUBMITTED', transitionDate: '2024-11-30T08:00:00Z' },
      { stage: 'FIELD_PENDING', transitionDate: '2024-12-02T10:00:00Z' },
      { stage: 'DISTRICT_REVIEW', transitionDate: '2024-12-08T14:00:00Z' },
      { stage: 'FINANCE_REVIEW', transitionDate: '2024-12-14T09:00:00Z' },
      {
        stage: 'BUDGET_HOLD',
        transitionDate: '2024-12-20T11:00:00Z',
        remark: 'Application placed on hold pending budget allocation for Q1 2025.',
      },
    ],
  },
  {
    id: 'app-012',
    referenceNumber: 'APP-20241128-000012',
    beneficiaryId: 'ben-007',
    beneficiaryName: 'District Agricultural Society',
    schemeId: 'sch-001',
    schemeName: 'Agricultural Modernisation Fund',
    requestedAmount: 500000,
    status: 'BUDGET_HOLD',
    submissionDate: '2024-11-28',
    regionId: 3,
    timeline: [
      { stage: 'SUBMITTED', transitionDate: '2024-11-28T09:00:00Z' },
      { stage: 'FIELD_PENDING', transitionDate: '2024-11-30T11:00:00Z' },
      { stage: 'DISTRICT_REVIEW', transitionDate: '2024-12-06T15:00:00Z' },
      { stage: 'FINANCE_REVIEW', transitionDate: '2024-12-12T10:00:00Z' },
      {
        stage: 'BUDGET_HOLD',
        transitionDate: '2024-12-18T14:00:00Z',
        remark: 'Awaiting budget release from treasury.',
      },
    ],
  },

  // ── APPROVED (2) ─────────────────────────────────────────────────────────
  {
    id: 'app-013',
    referenceNumber: 'APP-20241110-000013',
    beneficiaryId: 'ben-005',
    beneficiaryName: 'Anil Joshi',
    schemeId: 'sch-002',
    schemeName: 'Rural Housing Scheme',
    requestedAmount: 220000,
    status: 'APPROVED',
    submissionDate: '2024-11-10',
    regionId: 3,
    timeline: [
      { stage: 'SUBMITTED', transitionDate: '2024-11-10T08:00:00Z' },
      { stage: 'FIELD_PENDING', transitionDate: '2024-11-12T10:00:00Z' },
      { stage: 'DISTRICT_REVIEW', transitionDate: '2024-11-18T14:00:00Z' },
      { stage: 'FINANCE_REVIEW', transitionDate: '2024-11-24T09:00:00Z' },
      {
        stage: 'APPROVED',
        transitionDate: '2024-11-30T16:00:00Z',
        remark: 'Application approved. Disbursement order issued.',
      },
    ],
  },
  {
    id: 'app-014',
    referenceNumber: 'APP-20241108-000014',
    beneficiaryId: 'ben-010',
    beneficiaryName: 'Kavitha Reddy',
    schemeId: 'sch-004',
    schemeName: 'Education Scholarship Programme',
    requestedAmount: 85000,
    status: 'APPROVED',
    submissionDate: '2024-11-08',
    regionId: 3,
    timeline: [
      { stage: 'SUBMITTED', transitionDate: '2024-11-08T09:00:00Z' },
      { stage: 'FIELD_PENDING', transitionDate: '2024-11-10T11:00:00Z' },
      { stage: 'DISTRICT_REVIEW', transitionDate: '2024-11-16T15:00:00Z' },
      { stage: 'FINANCE_REVIEW', transitionDate: '2024-11-22T10:00:00Z' },
      {
        stage: 'APPROVED',
        transitionDate: '2024-11-28T14:00:00Z',
        remark: 'Scholarship approved. Award letter dispatched.',
      },
    ],
  },

  // ── REJECTED (1) ─────────────────────────────────────────────────────────
  {
    id: 'app-015',
    referenceNumber: 'APP-20241020-000015',
    beneficiaryId: 'ben-004',
    beneficiaryName: 'Meera Patel',
    schemeId: 'sch-003',
    schemeName: 'Small Business Development Grant',
    requestedAmount: 300000,
    status: 'REJECTED',
    submissionDate: '2024-10-20',
    regionId: 2,
    timeline: [
      { stage: 'SUBMITTED', transitionDate: '2024-10-20T09:00:00Z' },
      { stage: 'FIELD_PENDING', transitionDate: '2024-10-22T11:00:00Z' },
      { stage: 'DISTRICT_REVIEW', transitionDate: '2024-10-28T14:00:00Z' },
      {
        stage: 'REJECTED',
        transitionDate: '2024-11-05T10:00:00Z',
        remark:
          'Application rejected: Udyam Registration Certificate not valid. Applicant may reapply with corrected documents.',
      },
    ],
  },

  // ── CLOSED (1) ───────────────────────────────────────────────────────────
  {
    id: 'app-016',
    referenceNumber: 'APP-20241001-000016',
    beneficiaryId: 'ben-008',
    beneficiaryName: 'Sunrise Agro Industries Pvt. Ltd.',
    schemeId: 'sch-003',
    schemeName: 'Small Business Development Grant',
    requestedAmount: 700000,
    status: 'CLOSED',
    submissionDate: '2024-10-01',
    regionId: 3,
    timeline: [
      { stage: 'SUBMITTED', transitionDate: '2024-10-01T08:00:00Z' },
      { stage: 'FIELD_PENDING', transitionDate: '2024-10-03T10:00:00Z' },
      { stage: 'DISTRICT_REVIEW', transitionDate: '2024-10-09T14:00:00Z' },
      { stage: 'FINANCE_REVIEW', transitionDate: '2024-10-15T09:00:00Z' },
      { stage: 'APPROVED', transitionDate: '2024-10-22T16:00:00Z', remark: 'Approved.' },
      {
        stage: 'CLOSED',
        transitionDate: '2024-11-15T12:00:00Z',
        remark: 'Disbursement completed. File closed.',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Accessor functions — schemes
// ---------------------------------------------------------------------------

export function getAllSchemes(): DemoScheme[] {
  return [...SCHEMES];
}

export function getSchemeById(id: string): DemoScheme | undefined {
  return SCHEMES.find((s) => s.id === id);
}

// ---------------------------------------------------------------------------
// Accessor functions — beneficiaries
// ---------------------------------------------------------------------------

export function getAllBeneficiaries(): DemoBeneficiary[] {
  return [...BENEFICIARIES];
}

export function getBeneficiaryById(id: string): DemoBeneficiary | undefined {
  return BENEFICIARIES.find((b) => b.id === id);
}

export function getBeneficiaryByUserId(userId: string): DemoBeneficiary | undefined {
  return BENEFICIARIES.find((b) => b.linkedUserId === userId);
}

// ---------------------------------------------------------------------------
// Accessor functions — applications (mutable in-memory list)
// ---------------------------------------------------------------------------

const applications: DemoApplication[] = [...APPLICATIONS];

export function getAllApplications(): DemoApplication[] {
  return [...applications];
}

export function getApplicationById(id: string): DemoApplication | undefined {
  return applications.find((a) => a.id === id);
}

export function addApplication(app: DemoApplication): void {
  applicationCounter += 1;
  applications.push(app);
}

// ---------------------------------------------------------------------------
// Stats computation
// ---------------------------------------------------------------------------

const TERMINAL_STATUSES: WorkflowStage[] = ['APPROVED', 'REJECTED', 'CLOSED', 'TERMINATED'];

export function getStats(): DemoStats {
  const apps = getAllApplications();

  const totalApplications = apps.length;
  const approvedApplications = apps.filter((a) => a.status === 'APPROVED').length;
  const rejectedApplications = apps.filter((a) => a.status === 'REJECTED').length;
  const pendingApplications = apps.filter(
    (a) => !TERMINAL_STATUSES.includes(a.status),
  ).length;
  const totalRequestedAmount = apps.reduce((sum, a) => sum + a.requestedAmount, 0);

  // Group by status
  const statusCountMap = new Map<WorkflowStage, number>();
  for (const app of apps) {
    statusCountMap.set(app.status, (statusCountMap.get(app.status) ?? 0) + 1);
  }
  const applicationsByStatus: { status: WorkflowStage; count: number }[] = Array.from(
    statusCountMap.entries(),
  ).map(([status, count]) => ({ status, count }));

  // Group by regionId (skip applications without regionId)
  const regionCountMap = new Map<number, number>();
  for (const app of apps) {
    if (app.regionId !== undefined) {
      regionCountMap.set(app.regionId, (regionCountMap.get(app.regionId) ?? 0) + 1);
    }
  }
  const applicationsByRegionId: { regionId: number; count: number }[] = Array.from(
    regionCountMap.entries(),
  ).map(([regionId, count]) => ({ regionId, count }));

  // Collect all timeline events, sort newest first, take top 10
  const allEvents: DemoActivityEvent[] = apps.flatMap((app) =>
    app.timeline.map((ev) => ({
      applicationRef: app.referenceNumber,
      eventType: ev.stage,
      timestamp: ev.transitionDate,
    })),
  );
  allEvents.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const recentActivity = allEvents.slice(0, 10);

  return {
    totalApplications,
    pendingApplications,
    approvedApplications,
    rejectedApplications,
    totalRequestedAmount,
    applicationsByStatus,
    applicationsByRegionId,
    recentActivity,
  };
}
