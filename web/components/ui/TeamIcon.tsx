'use client';

// Known geometric symbols used in the new design system
const DESIGN_SYMBOLS = new Set(['◈', '▲', '◉', '◆', '⬡', '▣', '◐', '▽', '◑', '◧', '◫', '◻']);

function isLegacyEmoji(icon: string): boolean {
  if (!icon) return false;
  if (DESIGN_SYMBOLS.has(icon)) return false;
  // Any character outside basic ASCII/Latin is treated as a legacy emoji
  return icon.codePointAt(0)! > 0x00FF;
}

// SVG for personal branding (replaces ✨)
function PersonalBrandingIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="10" r="4" stroke={color} strokeWidth="1.5" />
      <path d="M8 26c0-4.418 3.582-8 8-8s8 3.582 8 8" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M22 6a8 8 0 010 8" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <path d="M25 3a13 13 0 010 14" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      <path d="M10 6a8 8 0 000 8" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <path d="M7 3a13 13 0 000 14" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}

// Known emoji → SVG mapping
const EMOJI_SVG_MAP: Record<string, (color: string) => JSX.Element> = {
  '✨': (color) => <PersonalBrandingIcon color={color} />,
};

interface TeamIconProps {
  icon: string;
  name: string;
  color: string;
  size?: number; // box size in px
}

export function TeamIcon({ icon, name, color, size = 32 }: TeamIconProps) {
  const legacy = isLegacyEmoji(icon);

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-sm border-2"
      style={{
        width: size,
        height: size,
        background: `${color}14`,
        borderColor: color,
        color,
      }}
    >
      {legacy ? (
        EMOJI_SVG_MAP[icon]
          ? EMOJI_SVG_MAP[icon](color)
          : (
            // Unknown emoji — fall back to initials
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: size * 0.35, lineHeight: 1 }}>
              {name.substring(0, 2).toUpperCase()}
            </span>
          )
      ) : (
        // Geometric symbol — render as text
        <span style={{ fontFamily: 'monospace', fontSize: size * 0.5, lineHeight: 1, color }}>
          {icon}
        </span>
      )}
    </div>
  );
}
