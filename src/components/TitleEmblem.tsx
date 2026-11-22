export function TitleEmblem() {
  return (
    <div className="w-full flex flex-col items-center select-none pointer-events-none px-1">
      <svg
        viewBox="0 0 380 142"
        className="w-full max-w-[300px] sm:max-w-[360px] h-auto drop-shadow-[0_6px_0_rgba(219,39,119,0.22)]"
        role="img"
        aria-label="Lomba Makan Bergizi"
      >
        <defs>
          <linearGradient id="kawaiiPlaqueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFDF9" />
            <stop offset="55%" stopColor="#FFF5F8" />
            <stop offset="100%" stopColor="#FFE4EF" />
          </linearGradient>
        </defs>
        {/* Puffy twin candy ribbon tails */}
        <path
          d="M12 52 L54 52 L54 106 L12 106 L28 79 Z"
          fill="#FF6B9D"
          stroke="#9D174D"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <path
          d="M368 52 L326 52 L326 106 L368 106 L352 79 Z"
          fill="#FF6B9D"
          stroke="#9D174D"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        {/* Toy shadow lip */}
        <rect x="30" y="21" width="320" height="106" rx="30" fill="#F59E0B" />
        {/* Main glossy candy plaque */}
        <rect
          x="30"
          y="14"
          width="320"
          height="106"
          rx="30"
          fill="url(#kawaiiPlaqueGrad)"
          stroke="#9D174D"
          strokeWidth="4"
        />
        {/* Inner stitched sticker ring */}
        <rect
          x="40"
          y="23"
          width="300"
          height="88"
          rx="23"
          fill="none"
          stroke="#F9A8D4"
          strokeWidth="2.5"
          strokeDasharray="7 5"
        />
        {/* Glossy toy specular bar */}
        <rect x="66" y="18" width="248" height="10" rx="5" fill="rgba(255,255,255,0.85)" />
        {/* Kawaii star & candy dots */}
        <path
          d="M58 26 L61.5 33.5 L69 37 L61.5 40.5 L58 48 L54.5 40.5 L47 37 L54.5 33.5 Z"
          fill="#FBBF24"
          stroke="#B45309"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M322 82 L325 88.5 L331.5 91.5 L325 94.5 L322 101 L319 94.5 L312.5 91.5 L319 88.5 Z"
          fill="#34D399"
          stroke="#065F46"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <circle cx="80" cy="96" r="4.5" fill="#FDE047" />
        <circle cx="298" cy="36" r="4.5" fill="#7DD3FC" />
        {/* Stacked sticker outlined title text */}
        <text
          x="190"
          y="63"
          textAnchor="middle"
          fontFamily="Fredoka, Nunito, sans-serif"
          fontWeight="700"
          fontSize="31"
          letterSpacing="0.8"
          fill="#E11D48"
          stroke="#FFFFFF"
          strokeWidth="7"
          paintOrder="stroke fill"
        >
          LOMBA MAKAN
        </text>
        <text
          x="190"
          y="102"
          textAnchor="middle"
          fontFamily="Fredoka, Nunito, sans-serif"
          fontWeight="700"
          fontSize="36"
          letterSpacing="1.2"
          fill="#059669"
          stroke="#FFFFFF"
          strokeWidth="7"
          paintOrder="stroke fill"
        >
          BERGIZI
        </text>
      </svg>
      <div className="mt-1 inline-block rounded-2xl bg-[#FFFDF9] border-[2.5px] border-pink-300 px-3.5 py-0.5 shadow-[0_3px_0_rgba(244,114,182,0.3)] max-w-full">
        <p className="font-display text-xs sm:text-base font-bold text-pink-700 text-center">
          Tangkap Gizi Seimbang, Tumbuh Kuat &amp; Sehat!
        </p>
      </div>
    </div>
  );
}

export function HeartIcon({ filled, pulse }: { filled: boolean; pulse?: boolean }) {
  return (
    <svg
      viewBox="0 0 28 28"
      className={`w-5 h-5 sm:w-6 sm:h-6 shrink-0 transition-transform duration-200 ${
        filled ? 'scale-100' : 'scale-90 opacity-50'
      } ${pulse ? 'animate-pulse' : ''}`}
      aria-hidden="true"
    >
      <path
        d="M14 24.4 C14 24.4 3.2 17.6 3.2 9.8 C3.2 6.1 6.1 3.4 9.5 3.4 C11.7 3.4 13.3 4.5 14 6.1 C14.7 4.5 16.3 3.4 18.5 3.4 C21.9 3.4 24.8 6.1 24.8 9.8 C24.8 17.6 14 24.4 14 24.4 Z"
        fill={filled ? '#FF477E' : '#F1F5F9'}
        stroke={filled ? '#9D174D' : '#94A3B8'}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {filled && (
        <path
          d="M8.5 7.4 C7.1 8.1 6.5 9.4 6.7 10.9"
          fill="none"
          stroke="#FFF1F2"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

export function ShieldIcon({ filled, pulse }: { filled: boolean; pulse?: boolean }) {
  return (
    <svg
      viewBox="0 0 28 28"
      className={`w-5 h-5 sm:w-6 sm:h-6 shrink-0 transition-transform duration-200 ${
        filled ? 'scale-100' : 'scale-90 opacity-45'
      } ${pulse ? 'animate-pulse' : ''}`}
      aria-hidden="true"
    >
      <path
        d="M14 3.2 L23.5 6.8 V13.6 C23.5 19.3 19.3 23.6 14 25.2 C8.7 23.6 4.5 19.3 4.5 13.6 V6.8 L14 3.2 Z"
        fill={filled ? '#38BDF8' : '#F1F5F9'}
        stroke={filled ? '#0369A1' : '#94A3B8'}
        strokeWidth="2.3"
        strokeLinejoin="round"
      />
      {filled && (
        <path
          d="M9.5 8.8 L14 6.8 L18.5 8.8"
          fill="none"
          stroke="#E0F2FE"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

export function CrownIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
      <path
        d="M3 18h18l-1.5-9-4.5 3.5L12 5l-3 7.5L4.5 9 3 18z"
        fill="#FACC15"
        stroke="#B45309"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SoundIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4 sm:w-5 sm:h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 5L6 9H3v6h3l5 4V5z" fill="currentColor" fillOpacity="0.22" />
      {muted ? (
        <>
          <line x1="16" y1="9" x2="21" y2="15" />
          <line x1="21" y1="9" x2="16" y2="15" />
        </>
      ) : (
        <>
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M18.5 6a8.5 8.5 0 0 1 0 12" />
        </>
      )}
    </svg>
  );
}

export function FullscreenIcon({ isFullscreen }: { isFullscreen: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4 sm:w-5 sm:h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {isFullscreen ? (
        <>
          <polyline points="4 14 10 14 10 20" />
          <polyline points="20 10 14 10 14 4" />
          <line x1="14" y1="10" x2="21" y2="3" />
          <line x1="3" y1="21" x2="10" y2="14" />
        </>
      ) : (
        <>
          <polyline points="15 3 21 3 21 9" />
          <polyline points="9 21 3 21 3 15" />
          <line x1="21" y1="3" x2="14" y2="10" />
          <line x1="3" y1="21" x2="10" y2="14" />
        </>
      )}
    </svg>
  );
}

export function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" aria-hidden="true">
      <rect x="6" y="5" width="4.5" height="14" rx="2" />
      <rect x="13.5" y="5" width="4.5" height="14" rx="2" />
    </svg>
  );
}

export function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" fill="currentColor" aria-hidden="true">
      <path d="M7.5 5.2 C7.5 4.2 8.6 3.6 9.5 4.1 L19.2 10.1 C20 10.6 20 11.8 19.2 12.3 L9.5 18.3 C8.6 18.8 7.5 18.2 7.5 17.2 Z" />
    </svg>
  );
}

export function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2 6.34 6.34 0 0 0 9.49 21.5a6.34 6.34 0 0 0 6.34-6.34V8.73a8.2 8.2 0 0 0 4.76 1.52V6.8a4.85 4.85 0 0 1-1-.11z" />
    </svg>
  );
}

export function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ThreadsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
      <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.563c-1.108-4.017-3.902-6.063-8.308-6.092-2.927.02-5.134.956-6.56 2.785-1.307 1.675-1.984 4.086-2.011 7.167.027 3.077.704 5.487 2.011 7.162 1.426 1.83 3.633 2.765 6.566 2.785 2.61-.019 4.557-.638 5.95-1.894 1.56-1.406 1.522-3.226 1.002-4.43-.363-.84-1.06-1.515-2.008-1.964-.247 1.82-.855 3.255-1.816 4.265-1.16 1.219-2.752 1.868-4.602 1.878-1.508-.009-2.803-.492-3.748-1.398-.996-.956-1.54-2.259-1.53-3.668.02-2.66 2.092-4.66 5.037-4.863 1.044-.072 2.015-.023 2.893.14-.148-.91-.464-1.615-.942-2.098-.605-.612-1.525-.927-2.735-.935h-.05c-.97 0-2.16.286-2.905 1.38l-1.757-1.196C7.87 4.715 9.694 4.02 11.498 4.02h.068c3.67.024 5.66 2.138 5.838 6.135.426.18.833.39 1.212.63 1.36.863 2.313 2.084 2.758 3.532.683 2.22.345 4.896-1.72 6.757-1.797 1.621-4.248 2.41-7.469 2.426Zm-.253-8.046c.083.001.167.001.25.001 1.287-.007 2.337-.434 3.035-1.235.616-.705.973-1.725 1.066-3.04-.72-.163-1.537-.246-2.43-.246-.186 0-.375.004-.565.017-1.832.126-3.071 1.216-3.084 2.712-.01 1.096.81 1.78 1.728 1.79Z" />
    </svg>
  );
}

export function CatalogIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4 sm:w-5 sm:h-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" fill="currentColor" fillOpacity="0.16" />
      <line x1="8" y1="7" x2="16" y2="7" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}
