interface Props {
  open: boolean;
  hints: string[];
  revealed: number;
  balance: number;
  loading?: boolean;
  onUseHint: () => void;
  onEarnHints: () => void;
  onClose: () => void;
}

export function HintSheet({
  open,
  hints,
  revealed,
  balance,
  loading,
  onUseHint,
  onEarnHints,
  onClose,
}: Props) {
  if (!open) return null;

  const canReveal = revealed < hints.length;
  const hasTokens = balance > 0;
  const latest = revealed > 0 ? hints[revealed - 1] : null;

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 p-5 animate-fade-in"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative w-full max-w-[17.5rem] animate-pop-in rounded-3xl border border-line/80 bg-surface p-5 text-center shadow-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Hints"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface2 hover:text-white"
        >
          ✕
        </button>

        <p className="text-[10px] font-700 uppercase tracking-[0.2em] text-muted">Hint tokens</p>
        <p className="mt-1 font-display text-3xl font-800 text-gold">{balance}</p>

        {/* simple 1 · 2 · 3 progress */}
        <div className="mt-4 flex items-center justify-center gap-2">
          {hints.map((_, i) => {
            const on = i < revealed;
            return (
              <span
                key={i}
                className={[
                  'flex h-8 w-8 items-center justify-center rounded-full border font-display text-sm font-800',
                  on
                    ? 'border-accent bg-accent/20 text-accent'
                    : i === revealed
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-line text-muted/60',
                ].join(' ')}
              >
                {i + 1}
              </span>
            );
          })}
        </div>

        <div className="mt-4 min-h-[4rem] flex items-center justify-center">
          {latest ? (
            <p className="text-sm leading-relaxed text-white">{latest}</p>
          ) : (
            <p className="text-sm text-muted">No tip unlocked yet</p>
          )}
        </div>

        {canReveal ? (
          hasTokens ? (
            <button className="btn-primary mt-2 w-full" disabled={loading} onClick={onUseHint}>
              Reveal next
            </button>
          ) : (
            <button className="btn-primary mt-2 w-full" disabled={loading} onClick={onEarnHints}>
              {loading ? 'Loading…' : 'Watch ad · +2'}
            </button>
          )
        ) : (
          <button className="btn-ghost mt-2 w-full" onClick={onClose}>
            Close
          </button>
        )}

        {canReveal && hasTokens && (
          <button
            className="mt-2 w-full py-2 text-xs text-muted"
            disabled={loading}
            onClick={onEarnHints}
          >
            {loading ? 'Loading…' : 'Get +2 from ad'}
          </button>
        )}
      </div>
    </div>
  );
}
