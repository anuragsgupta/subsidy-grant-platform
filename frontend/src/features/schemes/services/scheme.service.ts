import { getAllSchemes, getSchemeById } from '../../../services/demo-data.service';
import type { DemoScheme } from '../../../services/demo-data.service';

export const schemeService = {
  getAll(): Promise<DemoScheme[]> {
    return Promise.resolve(getAllSchemes());
  },
  getById(id: string): Promise<DemoScheme | undefined> {
    return Promise.resolve(getSchemeById(id));
  },
};
