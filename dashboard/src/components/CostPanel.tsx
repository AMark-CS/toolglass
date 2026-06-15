import { DollarSign, Server, TrendingUp, AlertCircle } from 'lucide-react';
import { useTraceCost } from '../hooks/useTraces';

interface CostPanelProps {
  traceId: string;
}

export function CostPanel({ traceId }: CostPanelProps) {
  const { data, isLoading } = useTraceCost(traceId);

  if (isLoading) {
    return (
      <div className="flex w-64 flex-col border-l border-[var(--color-border)] p-4">
        <span className="text-xs text-[var(--color-muted-foreground)]">Loading cost...</span>
      </div>
    );
  }

  if (!data) return null;

  const { total_cost_usd, mcp_tool_cost_usd, by_tool, items } = data;

  return (
    <div className="flex w-64 flex-col border-l border-[var(--color-border)] overflow-y-auto">
      {/* Header */}
      <div className="flex h-12 items-center gap-2 border-b border-[var(--color-border)] px-4">
        <DollarSign className="h-4 w-4 text-[var(--color-primary)]" />
        <span className="text-xs font-medium text-[var(--color-foreground)]">
          Cost Breakdown
        </span>
      </div>

      {/* Total */}
      <div className="border-b border-[var(--color-border)] p-4">
        <div className="text-2xl font-semibold text-[var(--color-foreground)]">
          {total_cost_usd > 0 ? `$${total_cost_usd.toFixed(4)}` : '$0'}
        </div>
        <div className="text-[10px] text-[var(--color-muted-foreground)]">
          estimated total cost
        </div>
      </div>

      {/* MCP Tool cost */}
      {mcp_tool_cost_usd > 0 && (
        <div className="border-b border-[var(--color-border)] px-4 py-3">
          <div className="flex items-center gap-1 text-[10px] font-medium text-[var(--color-muted-foreground)] mb-2">
            <Server className="h-3 w-3" />
            MCP TOOLS
          </div>
          <div className="space-y-1.5">
            {Object.entries(by_tool)
              .sort(([, a], [, b]) => b - a)
              .map(([tool, cost]) => {
                const proportion = cost / mcp_tool_cost_usd;
                return (
                  <div key={tool} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="truncate text-xs text-[var(--color-foreground)]">
                          {tool.split('/').pop()}
                        </span>
                        <span className="shrink-0 text-[10px] text-[var(--color-muted-foreground)]">
                          ${cost.toFixed(4)}
                        </span>
                      </div>
                      {/* Bar */}
                      <div className="mt-1 h-1 rounded-full bg-[var(--color-muted)]">
                        <div
                          className="h-1 rounded-full bg-[var(--color-primary)]"
                          style={{ width: `${proportion * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Items list */}
      {items.length > 0 && (
        <div className="flex-1 p-4">
          <div className="flex items-center gap-1 text-[10px] font-medium text-[var(--color-muted-foreground)] mb-2">
            <TrendingUp className="h-3 w-3" />
            ALLOCATION
          </div>
          <div className="space-y-1.5">
            {items.slice(0, 20).map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-1 min-w-0">
                  {item.source_type === 'other' && (
                    <AlertCircle className="h-3 w-3 shrink-0 text-[var(--color-destructive)]" />
                  )}
                  <span
                    className={`truncate text-[10px] ${
                      item.source_type === 'other'
                        ? 'text-[var(--color-destructive)]'
                        : 'text-[var(--color-muted-foreground)]'
                    }`}
                  >
                    {item.source.length > 30
                      ? '...' + item.source.slice(-30)
                      : item.source}
                  </span>
                </div>
                <span className="shrink-0 text-[10px] text-[var(--color-muted-foreground)]">
                  ${item.cost_usd.toFixed(4)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {items.length === 0 && (
        <div className="p-4 text-center text-[10px] text-[var(--color-muted-foreground)]">
          No cost data available
        </div>
      )}
    </div>
  );
}
