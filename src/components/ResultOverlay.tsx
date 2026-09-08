import { StarRating } from './StarRating';
import { formatTime } from '../utils/format';

interface Props {
  status: 'won' | 'lost';
  levelLabel: string;
  timeSec: number;
  bestTimeSec: number | null;
  stars: number;
  mistakes: number;
  reason?: string;
  hasNext: boolean;
  onNext: () => void;
  onRetry: () => void;
  onHome: () => void;
  onHint?: () => void;
  onShare?: () => void;
  shareLabel?: string;
  extraLine?: string;
}

export function ResultOverlay(p: Props) {
  const won = p.status === 'won';
  const best =
    p.bestTimeSec != null && p.bestTimeSec >= 0 ? formatTime(p.bestTimeSec) : '—';
  const shared = p.shareLabel === 'COPIED ✓' || p.shareLabel === 'SHARED ✓';

  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-black/75 p-4 pb-7 animate-fade-in sm:items-center">
      <div
        className={[
          'relative w-full max-w-[20rem] overflow-hidden rounded-3xl border px-5 pb-5 pt-6 text-center shadow-card animate-slide-up',
          won ? 'border-accent/30 bg-surface' : 'border-danger/35 bg-surface',
        ].join(' ')}
      >
        <div
          className="pointer-events-none absolute -left-8 -top-12 h-32 w-32 rounded-full blur-3xl"
          style={{ background: won ? 'rgba(0,230,195,0.22)' : 'rgba(255,90,106,0.22)' }}
          aria-hidden
        />

        <div className="relative">
          <div
            className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
              won ? 'bg-accent/18 text-accent shadow-glow-accent' : 'bg-danger/18 text-danger'
            }`}
          >
            {won ? '✓' : '✕'}
          </div>

          <h2 className={`font-display text-2xl font-800 leading-none ${won ? 'text-white' : 'text-danger'}`}>
            {won ? 'Complete' : 'Broken'}
          </h2>
          <p className="mt-1.5 text-xs text-muted">
            {p.levelLabel}
            {p.extraLine ? <span className="text-gold"> · {p.extraLine}</span> : null}
          </p>

          {won && (
            <div className="mt-3">
              <StarRating value={p.stars} size={28} animate />
            </div>
          )}

          {!won && p.reason && (
            <p className="mt-3 text-sm leading-snug text-[#ffb4bc]">{p.reason}</p>
          )}

          <div className="mt-4 flex items-center justify-center gap-3 text-sm">
            <MiniStat value={formatTime(p.timeSec)} hint="time" />
            <Dot />
            <MiniStat value={best} hint="best" />
            {won && (
              <>
                <Dot />
                <MiniStat value={`${p.mistakes}`} hint="miss" />
              </>
            )}
          </div>

          {/* icon actions */}
          <div className="mt-5 flex items-center justify-center gap-3">
            <IconBtn label="Home" onClick={p.onHome}>
              <HomeIcon />
            </IconBtn>
            {won ? (
              <>
                <IconBtn label="Replay" onClick={p.onRetry}>
                  <ReplayIcon />
                </IconBtn>
                {p.onShare && (
                  <IconBtn
                    label={shared ? 'Shared' : 'Share'}
                    onClick={p.onShare}
                    tone={shared ? 'accent' : 'default'}
                  >
                    {shared ? <CheckIcon /> : <ShareIcon />}
                  </IconBtn>
                )}
                {p.hasNext && (
                  <IconBtn label="Next" onClick={p.onNext} tone="primary" large>
                    <NextIcon />
                  </IconBtn>
                )}
              </>
            ) : (
              <>
                {p.onHint && (
                  <IconBtn label="Hint" onClick={p.onHint}>
                    <HintIcon />
                  </IconBtn>
                )}
                <IconBtn label="Retry" onClick={p.onRetry} tone="primary" large>
                  <ReplayIcon />
                </IconBtn>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ value, hint }: { value: string; hint: string }) {
  return (
    <div className="flex flex-col items-center leading-none">
      <span className="font-display text-base font-800 text-white">{value}</span>
      <span className="mt-1 text-[9px] uppercase tracking-wider text-muted">{hint}</span>
    </div>
  );
}

function Dot() {
  return <span className="h-1 w-1 rounded-full bg-line" aria-hidden />;
}

function IconBtn({
  label,
  onClick,
  children,
  tone = 'default',
  large,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  tone?: 'default' | 'primary' | 'accent';
  large?: boolean;
}) {
  const toneCls =
    tone === 'primary'
      ? 'border-primary/50 bg-primary text-white shadow-glow'
      : tone === 'accent'
        ? 'border-accent/40 bg-accent/20 text-accent'
        : 'border-line/80 bg-surface2/90 text-white';
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={[
        'inline-flex items-center justify-center rounded-2xl border transition-transform active:scale-95',
        large ? 'h-14 w-14' : 'h-12 w-12',
        toneCls,
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ReplayIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M4 4.5v5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="18" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="18" cy="19" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.3 10.8 15.7 6.7M8.3 13.2l7.4 4.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function NextIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="m13 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HintIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 18h6M10 21h4M8.5 14.5c-1.8-1.2-3-3.2-3-5.5a6.5 6.5 0 1 1 13 0c0 2.3-1.2 4.3-3 5.5H8.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="m5 12.5 5 5 9-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
