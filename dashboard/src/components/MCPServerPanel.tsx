import { Server, Activity, AlertCircle } from 'lucide-react';
import type { MCPServerStat } from '../types';

interface MCPServerPanelProps {
  servers: MCPServerStat[];
}

export function MCPServerPanel({ servers }: MCPServerPanelProps) {
  return (
    <div className="border-b border-[var(--color-border)]">
      <div className="flex h-9 items-center gap-2 px-3 border-b border-[var(--color-border)]">
        <Server className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
        <span className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
          MCP SERVERS
        </span>
      </div>

      <div className="max-h-48 overflow-y-auto">
        {servers.map((server) => (
          <div
            key={server.mcp_server_name}
            className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)] last:border-b-0"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Activity className="h-3 w-3 shrink-0 text-[var(--color-primary)]" />
              <span className="truncate text-xs text-[var(--color-foreground)]">
                {server.mcp_server_name}
              </span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {server.error_count > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] text-[var(--color-destructive)]">
                  <AlertCircle className="h-3 w-3" />
                  {server.error_count}
                </span>
              )}
              <span className="text-[10px] text-[var(--color-muted-foreground)]">
                {server.call_count} calls
              </span>
              {server.avg_latency_ms != null && (
                <span className="text-[10px] text-[var(--color-muted-foreground)]">
                  {(server.avg_latency_ms / 1000).toFixed(1)}s avg
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
