export type BeneficiaryType = 'INDIVIDUAL' | 'GROUP' | 'COMMUNITY';

export interface BeneficiarySummary {
  id: string;
  userId: string | null;
  beneficiaryType: BeneficiaryType;
  fullName: string;
  identityReference: string;
  regionCode: string | null;
}

export interface Beneficiary extends BeneficiarySummary {
  email: string | null;
  phone: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BeneficiaryRequest {
  beneficiaryType?: BeneficiaryType;
  fullName: string;
  identityReference?: string;
  email: string;
  phone: string;
  address: string;
  regionCode: string;
}