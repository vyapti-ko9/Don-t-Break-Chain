interface Props {
  value: number; // 0..3
  size?: number;
  animate?: boolean;
}

export function StarRating({ value, size = 28, animate = false }: Props) {
  return (
    <div className="flex items-center justify-center gap-1.5" aria-label={`${value} of 3 stars`}>
      {[0, 1, 2].map((i) => {
        const filled = i < value;
        return (
          <span
            key={i}
            style={{
              fontSize: size,
              animationDelay: animate ? `${i * 140 + 120}ms` : undefined,
            }}
            className={[
              'leading-none transition-transform',
              filled ? 'text-gold drop-shadow-[0_0_8px_rgba(255,210,74,0.55)]' : 'text-line',
              animate && filled ? 'animate-pop-in' : '',
            ].join(' ')}
          >
            {filled ? '★' : '☆'}
          </span>
        );
      })}
    </div>
  );
}
