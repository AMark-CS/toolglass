import { X } from 'lucide-react';
import { useTrace } from '../hooks/useTraces';
import { WaterfallChart } from './WaterfallChart';
import { TraceInfoBar } from './TraceInfoBar';

interface TraceDetailProps {
  traceId: string;
  onClose: () => void;
}

export function TraceDetail({ traceId, onClose }: TraceDetailProps) {
  const { data, isLoading } = useTrace(traceId);

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="flex h-12 items-center justify-between border-b border-[var(--color-border)] px-4">
          <span className="text-xs text-[var(--color-muted-foreground)]">Loading...</span>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <span className="text-sm text-[var(--color-muted-foreground)]">Loading...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="flex h-12 items-center justify-between border-b border-[var(--color-border)] px-4">
          <span className="text-xs text-[var(--color-muted-foreground)]">Trace not found</span>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  const { trace, spans } = data;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header bar */}
      <TraceInfoBar trace={trace} onClose={onClose} />

      {/* Waterfall chart */}
      <div className="flex-1 overflow-y-auto">
        <WaterfallChart spans={spans} />
      </div>
    </div>
  );
}
