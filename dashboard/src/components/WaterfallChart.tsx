import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Server,
  Activity,
  AlertCircle,
} from 'lucide-react';
import type { Span } from '../types';

interface WaterfallChartProps {
  spans: Span[];
}

interface SpanNode {
  span: Span;
  depth: number;
  children: SpanNode[];
  startOffset: number; // ms from trace start
  endOffset: number;
  duration: number;
}

function buildTree(spans: Span[]): SpanNode[] {
  if (!spans.length) return [];

  // Sort by start_time
  const sorted = [...spans].sort(
    (a, b) =>
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
  );

  // Find the earliest start time
  const firstStart = new Date(sorted[0].start_time).getTime();

  // Build parent-child map
  const childrenMap = new Map<string | null, SpanNode[]>();

  for (const span of sorted) {
    const startMs = new Date(span.start_time).getTime();
    const startOffset = startMs - firstStart;
    const duration = span.latency_ms ?? 0;
    const endOffset = startOffset + duration;

    const node: SpanNode = {
      span,
      depth: 0,
      children: [],
      startOffset,
      endOffset,
      duration,
    };

    const parentId = span.parent_span_id;
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId)!.push(node);
  }

  // Attach children to nodes
  for (const nodes of childrenMap.values()) {
    for (const node of nodes) {
      node.children = childrenMap.get(node.span.id) ?? [];
      node.depth = node.children.length > 0 ? 0 : 0;
    }
  }

  // Get root nodes (parent = null or not in spans)
  const rootNodes = childrenMap.get(null) ?? [];

  // Compute depth recursively
  function setDepth(nodes: SpanNode[], d: number) {
    for (const n of nodes) {
      n.depth = d;
      setDepth(n.children, d + 1);
    }
  }
  setDepth(rootNodes, 0);

  return rootNodes;
}

function getSpanColor(span: Span): string {
  if (span.result_is_error || span.status === 'error') {
    return 'bg-red-500/40 border-red-500/60';
  }
  if (span.span_type === 'mcp.tool.call') {
    return 'bg-violet-500/30 border-violet-500/60';
  }
  if (span.span_type === 'mcp.server.list_tools') {
    return 'bg-cyan-500/20 border-cyan-500/50';
  }
  return 'bg-zinc-500/20 border-zinc-500/50';
}

function getSpanIcon(span: Span) {
  if (span.result_is_error || span.status === 'error') {
    return <AlertCircle className="h-3 w-3 text-red-400" />;
  }
  if (span.span_type === 'mcp.tool.call') {
    return <Server className="h-3 w-3 text-violet-400" />;
  }
  return <Activity className="h-3 w-3 text-zinc-400" />;
}

function getSpanLabel(span: Span): string {
  if (span.tool_name) return span.tool_name;
  if (span.mcp_request_method) {
    const parts = span.mcp_request_method.split('/');
    return parts[parts.length - 1];
  }
  return span.span_type;
}

function formatArgs(args: string | null): string {
  if (!args) return '';
  try {
    const obj = JSON.parse(args);
    return JSON.stringify(obj).slice(0, 60);
  } catch {
    return (args ?? '').slice(0, 60);
  }
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

interface RowProps {
  node: SpanNode;
  totalDuration: number;
  maxDuration: number;
  onSelect: (span: Span) => void;
  selectedId: string | null;
  defaultExpanded?: boolean;
}

function WaterfallRow({
  node,
  totalDuration,
  maxDuration,
  onSelect,
  selectedId,
  defaultExpanded = false,
}: RowProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const { span, depth, duration } = node;
  const widthPercent = maxDuration > 0 ? (duration / maxDuration) * 100 : 0;

  const isSelected = selectedId === span.id;

  return (
    <>
      <div
        className={`group flex h-7 items-center gap-1.5 border-b border-[var(--color-border)] px-2 py-1 cursor-pointer transition-colors ${
          isSelected
            ? 'bg-[var(--color-accent)]'
            : 'hover:bg-[var(--color-accent)]/50'
        }`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => onSelect(span)}
      >
        {/* Expand/collapse */}
        {node.children.length > 0 ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="flex h-4 w-4 items-center justify-center rounded hover:bg-[var(--color-muted)]"
          >
            {expanded ? (
              <ChevronDown className="h-3 w-3 text-[var(--color-muted-foreground)]" />
            ) : (
              <ChevronRight className="h-3 w-3 text-[var(--color-muted-foreground)]" />
            )}
          </button>
        ) : (
          <div className="h-4 w-4 shrink-0" />
        )}

        {/* Icon */}
        <div className="flex h-4 w-4 shrink-0 items-center justify-center">
          {getSpanIcon(span)}
        </div>

        {/* Server badge */}
        {span.mcp_server_name && (
          <span className="shrink-0 rounded bg-[var(--color-secondary)] px-1 py-0 text-[9px] font-medium text-[var(--color-muted-foreground)]">
            {span.mcp_server_name}
          </span>
        )}

        {/* Label */}
        <span className="truncate text-[11px] text-[var(--color-foreground)]">
          {getSpanLabel(span)}
        </span>

        {/* Args preview */}
        {span.tool_arguments && (
          <span className="truncate text-[9px] text-[var(--color-muted-foreground)]">
            {formatArgs(span.tool_arguments)}
          </span>
        )}

        {/* Right side stats */}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          {/* Result size */}
          {span.result_size_bytes != null && span.result_size_bytes > 0 && (
            <span className="text-[9px] text-[var(--color-muted-foreground)]">
              {formatBytes(span.result_size_bytes)}
            </span>
          )}

          {/* Duration */}
          <span className="w-14 text-right text-[10px] tabular-nums text-[var(--color-muted-foreground)]">
            {duration > 0 ? `${duration.toFixed(1)}ms` : '—'}
          </span>
        </div>

        {/* Duration bar */}
        <div className="relative h-2 w-32 shrink-0 overflow-hidden rounded-full bg-[var(--color-muted)]">
          <div
            className={`absolute left-0 top-0 h-full rounded-full border ${getSpanColor(span)}`}
            style={{ width: `${Math.max(widthPercent, 2)}%` }}
          />
        </div>
      </div>

      {/* Children */}
      {expanded &&
        node.children.map((child) => (
          <WaterfallRow
            key={child.span.id}
            node={child}
            totalDuration={totalDuration}
            maxDuration={maxDuration}
            onSelect={onSelect}
            selectedId={selectedId}
          />
        ))}
    </>
  );
}

export function WaterfallChart({ spans }: WaterfallChartProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const tree = buildTree(spans);

  // Find total trace duration for timeline
  let maxOffset = 0;
  for (const span of spans) {
    if (span.latency_ms) {
      const start = new Date(span.start_time).getTime();
      const end = start + (span.latency_ms ?? 0);
      maxOffset = Math.max(maxOffset, end);
    }
  }
  const firstStart =
    spans.length > 0 ? new Date(spans[0].start_time).getTime() : 0;
  const totalDuration = (maxOffset - firstStart) / 1000; // in ms

  const maxDuration = Math.max(
    ...spans.map((s) => s.latency_ms ?? 0),
    1,
  );

  if (spans.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-xs text-[var(--color-muted-foreground)]">
        No spans in this trace
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Timeline header */}
      <div className="flex h-6 items-center gap-1.5 border-b border-[var(--color-border)] px-2 text-[9px] text-[var(--color-muted-foreground)]">
        <div className="flex h-4 w-4 shrink-0 items-center justify-center" />
        <div className="flex h-4 w-4 shrink-0 items-center justify-center" />
        <div className="w-16 shrink-0" />
        <div className="flex-1 truncate">span</div>
        <div className="ml-auto flex items-center gap-2">
          <span className="w-14 text-right">latency</span>
          <div className="relative h-2 w-32 rounded-full bg-[var(--color-muted)]">
            {/* Timeline markers */}
            {[0, 25, 50, 75, 100].map((pct) => (
              <div
                key={pct}
                className="absolute top-0 h-full border-l border-[var(--color-muted-foreground)]/30 first:border-l-0"
                style={{ left: `${pct}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Waterfall rows */}
      {tree.map((node) => (
        <WaterfallRow
          key={node.span.id}
          node={node}
          totalDuration={totalDuration}
          maxDuration={maxDuration}
          onSelect={(span) =>
            setSelectedId(selectedId === span.id ? null : span.id)
          }
          selectedId={selectedId}
          defaultExpanded={node.children.length > 0}
        />
      ))}
    </div>
  );
}
