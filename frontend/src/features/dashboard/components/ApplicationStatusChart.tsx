import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { type WorkflowStage } from '../../../services/demo-data.service';

// ---------------------------------------------------------------------------
// Colour map — GSDTS design system
// ---------------------------------------------------------------------------

const STATUS_COLOURS: Record<WorkflowStage, string> = {
  SUBMITTED:       '#1769AA',
  FIELD_PENDING:   '#F59E0B',
  DISTRICT_REVIEW: '#F59E0B',
  SECOND_REVIEW:   '#F59E0B',
  FINANCE_REVIEW:  '#0D9488',
  BUDGET_HOLD:     '#F59E0B',
  APPROVED:        '#16A34A',
  REJECTED:        '#DC2626',
  CLOSED:          '#64748B',
  TERMINATED:      '#64748B',
};

// Human-readable label for display in the legend
const STATUS_LABELS: Record<WorkflowStage, string> = {
  SUBMITTED:       'Submitted',
  FIELD_PENDING:   'Field Pending',
  DISTRICT_REVIEW: 'District Review',
  SECOND_REVIEW:   'Second Review',
  FINANCE_REVIEW:  'Finance Review',
  BUDGET_HOLD:     'Budget Hold',
  APPROVED:        'Approved',
  REJECTED:        'Rejected',
  CLOSED:          'Closed',
  TERMINATED:      'Terminated',
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ApplicationStatusChartProps {
  data: { status: WorkflowStage; count: number }[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ApplicationStatusChart({ data }: ApplicationStatusChartProps) {
  const hasData = data.length > 0 && data.some((d) => d.count > 0);

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-[220px] text-sm text-[#64748B]">
        No data available
      </div>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="status"
            innerRadius={50}
            outerRadius={80}
            strokeWidth={2}
            stroke="#F4F7FA"
          >
            {data.map((entry) => (
              <Cell
                key={entry.status}
                fill={STATUS_COLOURS[entry.status]}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 px-2">
        {data
          .filter((d) => d.count > 0)
          .map((entry) => (
            <div key={entry.status} className="flex items-center gap-1.5 text-xs text-[#1E293B]">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: STATUS_COLOURS[entry.status] }}
              />
              <span className="text-[#64748B]">
                {STATUS_LABELS[entry.status]}:
              </span>
              <span className="font-medium">{entry.count}</span>
            </div>
          ))}
      </div>
    </div>
  );
}
