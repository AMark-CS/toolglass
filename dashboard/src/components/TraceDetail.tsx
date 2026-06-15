import { X, ChevronRight, Clock, Server, AlertCircle, ArrowDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useTrace } from '../hooks/useTraces';
import type { Span } from '../types';

interface TraceDetailProps {
  traceId: string;
  onClose: () => void;
}

function SpanRow({ span, depth = 0 }: { span: Span; depth?: number }) {
  const isError = span.result_is_error === 1 || span.status === 'error';
  const isToolCall = span.span_type === 'mcp.tool.call';
  const isListTools = span.span_type === 'mcp.server.list_tools';

  const indent = depth * 16;

  return (
    <div
      className={`flex items-center gap-2 border-b border-[var(--color-border)] px-3 py-2 ${
        isError ? 'bg-red-950/20' : ''
      }`}
      style={{ paddingLeft: `${12 + indent}px` }}
    >
      {/* Indent indicator */}
      {depth > 0 && (
        <ArrowDown className="h-3 w-3 shrink-0 text-[var(--color-muted-foreground)]" />
      )}

      {/* Span type icon */}
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded">
        {isError ? (
          <AlertCircle className="h-3.5 w-3.5 text-[var(--color-destructive)]" />
        ) : isToolCall ? (
          <Server className="h-3.5 w-3.5 text-[var(--color-primary)]" />
        ) : isListTools ? (
          <ChevronRight className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
        ) : (
          <Clock className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 items-center gap-2 min-w-0">
        {/* Server name */}
        {span.mcp_server_name && (
          <span className="shrink-0 rounded bg-[var(--color-secondary)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-muted-foreground)]">
            {span.mcp_server_name}
          </span>
        )}

        {/* Tool / method name */}
        <span className={`truncate text-xs ${isError ? 'text-[var(--color-destructive)]' : 'text-[var(--color-foreground)]'}`}>
          {span.tool_name ?? span.mcp_request_method ?? span.span_type}
        </span>

        {/* Arguments preview */}
        {span.tool_arguments && (
          <span className="truncate text-[10px] text-[var(--color-muted-foreground)]">
            {(() => {
              try {
                const args = JSON.parse(span.tool_arguments);
                const preview = JSON.stringify(args).slice(0, 40);
                return preview.length < JSON.stringify(args).length ? `${preview}...` : preview;
              } catch {
                return span.tool_arguments.slice(0, 40);
              }
            })()}
          </span>
        )}
      </div>

      {/* Latency */}
      {span.latency_ms != null && (
        <span className="shrink-0 text-[10px] text-[var(--color-muted-foreground)]">
          {span.latency_ms.toFixed(1)}ms
        </span>
      )}

      {/* Result size */}
      {span.result_size_bytes != null && span.result_size_bytes > 0 && (
        <span className="shrink-0 text-[10px] text-[var(--color-muted-foreground)]">
          {(span.result_size_bytes / 1024).toFixed(1)}KB
        </span>
      )}
    </div>
  );
}

export function TraceDetail({ traceId, onClose }: TraceDetailProps) {
  const { data, isLoading } = useTrace(traceId);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="text-sm text-[var(--color-muted-foreground)]">Loading...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="text-sm text-[var(--color-muted-foreground)]">Trace not found</span>
      </div>
    );
  }

  const { trace, spans } = data;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex h-12 items-center justify-between border-b border-[var(--color-border)] px-4">
        <div className="flex flex-col">
          <span className="text-xs font-medium text-[var(--color-foreground)]">
            {trace.root_span_name ?? 'mcp_call'}
          </span>
          <span className="text-[10px] text-[var(--color-muted-foreground)]">
            {trace.timestamp
              ? formatDistanceToNow(new Date(trace.timestamp), { addSuffix: true })
              : ''} · {spans.length} spans
          </span>
        </div>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Spans */}
      <div className="flex-1 overflow-y-auto">
        {spans.map((span) => (
          <SpanRow key={span.id} span={span} />
        ))}

        {spans.length === 0 && (
          <div className="flex items-center justify-center py-12 text-sm text-[var(--color-muted-foreground)]">
            No spans recorded
          </div>
        )}
      </div>
    </div>
  );
}
