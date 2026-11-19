import { Fragment } from 'react';
import type { RegionResponse } from '../types/region.types';
import { EmptyState } from '../../../components/states/EmptyState';

export interface RegionNode extends RegionResponse {
  children: RegionResponse[];
}

/** Groups districts under their parent state. */
export function buildRegionTree(regions: RegionResponse[]): RegionNode[] {
  const states = regions.filter((r) => r.type === 'STATE');
  return states.map((s) => ({
    ...s,
    children: regions.filter((r) => r.parentId === s.id),
  }));
}

/** id → region lookup for resolving parent names. */
export function buildRegionMap(regions: RegionResponse[]): Map<number, RegionResponse> {
  return new Map(regions.map((r) => [r.id, r]));
}

interface RegionTreeProps {
  regions: RegionResponse[];
  /** When true, render a flat table with a Parent column (used for DISTRICT filter). */
  flat?: boolean;
}

const tableTh = 'py-2 px-3 text-left font-medium text-text-secondary border-b border-gov-border';
const tableTd = 'py-2 px-3 border-b border-gov-border/60';

/** Renders regions as a hierarchy (states + indented districts) or a flat table. */
export function RegionTree({ regions, flat = false }: RegionTreeProps) {
  if (regions.length === 0) return <EmptyState message="No regions found." />;
  const map = buildRegionMap(regions);

  if (flat) {
    return (
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className={tableTh}>Code</th>
            <th className={tableTh}>Name</th>
            <th className={tableTh}>Type</th>
            <th className={tableTh}>Parent</th>
          </tr>
        </thead>
        <tbody>
          {regions.map((r) => (
            <tr key={r.id} className="hover:bg-gov-blue/5">
              <td className={tableTd}>{r.code}</td>
              <td className={tableTd}>{r.name}</td>
              <td className={tableTd}>{r.type}</td>
              <td className={tableTd}>{r.parentId ? map.get(r.parentId)?.name ?? '—' : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  const tree = buildRegionTree(regions);

  return (
    <table className="w-full text-sm">
      <thead>
        <tr>
          <th className={tableTh}>Code</th>
          <th className={tableTh}>Name</th>
          <th className={tableTh}>Type</th>
        </tr>
      </thead>
      <tbody>
        {tree.map((state) => (
          <Fragment key={state.id}>
            <tr className="hover:bg-gov-blue/5">
              <td className={tableTd}>{state.code}</td>
              <td className={`${tableTd} font-medium text-text-primary`}>{state.name}</td>
              <td className={tableTd}>{state.type}</td>
            </tr>
            {state.children.map((district) => (
              <tr key={district.id} className="hover:bg-gov-blue/5">
                <td className={tableTd}>{district.code}</td>
                <td className={`${tableTd} pl-9 text-text-secondary`}>└ {district.name}</td>
                <td className={tableTd}>{district.type}</td>
              </tr>
            ))}
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}
