export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="cardiaGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#085FFF" />
          <stop offset="100%" stopColor="#685CF6" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#cardiaGrad)" opacity="0.15" />
      <path
        d="M35 20c-12 6-20 18-20 32 0 18 15 32 33 32 4 0 8-.5 11-1.5-9-3-16-11-16-21 0-6 2.5-11.5 6.5-15.5-3-8-8-18-14.5-25.5z"
        fill="url(#cardiaGrad)"
      />
      <circle cx="63" cy="34" r="3" fill="#06D6A0" />
    </svg>
  );
}
