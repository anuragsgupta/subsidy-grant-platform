import {
  getAllBeneficiaries,
  getBeneficiaryById,
  getBeneficiaryByUserId,
} from '../../../services/demo-data.service';
import type { DemoBeneficiary } from '../../../services/demo-data.service';

export const beneficiaryService = {
  getAll(): Promise<DemoBeneficiary[]> {
    return Promise.resolve(getAllBeneficiaries());
  },
  getById(id: string): Promise<DemoBeneficiary | undefined> {
    return Promise.resolve(getBeneficiaryById(id));
  },
  getByUserId(userId: string): Promise<DemoBeneficiary | undefined> {
    return Promise.resolve(getBeneficiaryByUserId(userId));
  },
};
