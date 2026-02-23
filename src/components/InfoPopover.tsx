import { useState, useRef, useEffect } from 'react';
import { Info, X } from 'lucide-react';

interface InfoPopoverProps {
  text: string;
  /** Size of the trigger icon in px (default 14) */
  size?: number;
}

/**
 * Small info icon that opens a popover with explanatory text on click.
 * Designed for "Was bedeutet dieser Wert?" context for non-experts.
 */
export default function InfoPopover({ text, size = 14 }: InfoPopoverProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="p-0.5 rounded-full text-(--color-text-muted) hover:text-(--color-accent) hover:bg-(--color-accent)/10 transition-colors"
        title="Was bedeutet dieser Wert?"
        aria-label="Info"
      >
        <Info size={size} />
      </button>

      {open && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 max-w-[calc(100vw-2rem)]">
          <div className="rounded-xl border border-(--color-border) bg-(--color-bg-card) shadow-xl p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-(--color-accent)">
                Was bedeutet dieser Wert?
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpen(false);
                }}
                className="p-0.5 rounded text-(--color-text-muted) hover:text-(--color-text-primary) transition-colors shrink-0"
              >
                <X size={12} />
              </button>
            </div>
            <p className="text-xs text-(--color-text-secondary) leading-relaxed">
              {text}
            </p>
          </div>
          {/* Arrow */}
          <div className="flex justify-center">
            <div
              className="w-2.5 h-2.5 rotate-45 -mt-[5px] border-r border-b border-(--color-border) bg-(--color-bg-card)"
            />
          </div>
        </div>
      )}
    </div>
  );
}
