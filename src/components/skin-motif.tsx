/** Arte de identidad, sin datos ni interacción. No ocupa lugar en el layout. */
export function SkinMotif() {
  return (
    <svg aria-hidden="true" focusable="false" className="skin-motif" viewBox="0 0 300 180" fill="none">
      <g style={{ display: "var(--skin-motif-performance, none)" }} stroke="currentColor">
        <path d="M94 194 207-14M131 194 244-14M168 194 281-14" strokeWidth="18" />
        <path d="M208 194 321-14M64 150h31M49 164h38" strokeWidth="2" />
      </g>
      <g style={{ display: "var(--skin-motif-neon, none)" }} stroke="currentColor">
        <ellipse cx="212" cy="90" rx="72" ry="72" strokeWidth="1" />
        <ellipse cx="212" cy="90" rx="58" ry="58" strokeDasharray="2 8" strokeWidth="3" />
        <path d="M212 18a72 72 0 0 1 68 96M160 140a72 72 0 0 1-14-80" strokeWidth="5" />
        <path d="M212 4v20m0 132v20M126 90h20m132 0h20M174 90h76M212 52v76" />
        <path d="M8 120h64l18-30h32M26 134h72l18-20h25" strokeWidth="1.5" />
        <circle cx="212" cy="90" r="9" strokeWidth="2" />
        <circle cx="26" cy="134" r="3" fill="currentColor" stroke="none" />
      </g>
      <g style={{ display: "var(--skin-motif-studio, none)" }} stroke="currentColor">
        <path d="M182 176V62a44 44 0 0 1 88 0v114M170 176V62a56 56 0 0 1 112 0v114" />
        <path d="M204 176V73a22 22 0 0 1 44 0v103" strokeWidth="6" />
        <path d="M148 176c0-42 16-65 49-79M148 176c0-54-38-69-61-89" strokeWidth="2" />
        <path d="M158 129c36-19 50-13 54-5-23 14-40 17-54 5ZM133 129c-25-4-42-21-43-32 29 3 42 15 43 32Z" fill="currentColor" stroke="none" />
      </g>
      <g style={{ display: "var(--skin-motif-industrial, none)" }} fill="currentColor">
        <path d="m162 14-45 76h40l-35 76h31l77-112h-48l23-40Z" />
        <path d="m229 18 15 0-80 145h-15ZM253 18h8l-80 145h-8ZM275 18h4l-80 145h-4Z" opacity=".45" />
        <path d="M108 14H80v28h4V18h24ZM278 138v25h-28v-4h24v-21Z" />
      </g>
    </svg>
  );
}
