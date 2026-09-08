interface Props {
  value: number;
  max: number;
  label?: string;
  tone?: 'primary' | 'accent' | 'gold' | 'danger';
}

const TONE: Record<NonNullable<Props['tone']>, string> = {
  primary: 'bg-primary',
  accent: 'bg-accent',
  gold: 'bg-gold',
  danger: 'bg-danger',
};

export function ProgressBar({ value, max, label, tone = 'primary' }: Props) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className="w-full">
      {label && (
        <div className="mb-1 flex justify-between text-xs text-muted">
          <span>{label}</span>
          <span>
            {value}/{max}
          </span>
        </div>
      )}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${TONE[tone]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
