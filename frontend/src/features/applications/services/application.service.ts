/**
 * application.service.ts
 *
 * Service layer for the GSDTS Applications feature (Phase 4 showcase).
 * All reads go through the in-memory demo-data service — no HTTP calls are made here.
 *
 * Role-scoping logic:
 *   BENEFICIARY      → only their own applications (via linked beneficiary id)
 *   FIELD_OFFICER    → FIELD_PENDING applications assigned to them
 *   DISTRICT_OFFICER → DISTRICT_REVIEW / SECOND_REVIEW in their regions
 *   FINANCE_APPROVER → FINANCE_REVIEW / BUDGET_HOLD (all regions)
 *   ADMIN (default)  → all applications
 */

import {
  getAllApplications,
  getApplicationById,
  addApplication,
  getBeneficiaryByUserId,
} from '../../../services/demo-data.service';
import type { DemoApplication } from '../../../services/demo-data.service';
import type { UserResponse } from '../../../types/auth';

// ---------------------------------------------------------------------------
// CRUD service object
// ---------------------------------------------------------------------------

export const applicationService = {
  /** Return all applications in the in-memory store. */
  getAll(): Promise<DemoApplication[]> {
    return Promise.resolve(getAllApplications());
  },

  /** Return a single application by id, or undefined if not found. */
  getById(id: string): Promise<DemoApplication | undefined> {
    return Promise.resolve(getApplicationById(id));
  },

  /** Persist a new application into the in-memory store. */
  add(app: DemoApplication): Promise<void> {
    addApplication(app);
    return Promise.resolve();
  },
};

// ---------------------------------------------------------------------------
// Role-aware scope filter
// ---------------------------------------------------------------------------

/**
 * Filters a list of applications down to those the given user is authorised
 * to see, based on their role and region assignments.
 *
 * This is a frontend *display* filter only — the backend remains the
 * authoritative security boundary.
 */
export function getApplicationsForRole(
  applications: DemoApplication[],
  user: UserResponse,
): DemoApplication[] {
  switch (user.role) {
    case 'BENEFICIARY': {
      const linked = getBeneficiaryByUserId(user.id);
      if (!linked) return [];
      return applications.filter((a) => a.beneficiaryId === linked.id);
    }

    case 'FIELD_OFFICER':
      return applications.filter(
        (a) => a.status === 'FIELD_PENDING' && a.assignedOfficerId === user.id,
      );

    case 'DISTRICT_OFFICER':
      return applications.filter(
        (a) =>
          ['DISTRICT_REVIEW', 'SECOND_REVIEW'].includes(a.status) &&
          (user.regionIds ?? []).includes(a.regionId ?? -1),
      );

    case 'FINANCE_APPROVER':
      return applications.filter((a) =>
        ['FINANCE_REVIEW', 'BUDGET_HOLD'].includes(a.status),
      );

    case 'ADMIN':
    default:
      return applications;
  }
}
