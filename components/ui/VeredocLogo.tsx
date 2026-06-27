interface VeredocLogoProps {
  variant?: "full" | "icon" | "wordmark";
  size?: "sm" | "md" | "lg";
  theme?: "light" | "dark";
  className?: string;
}

const iconSizes = { sm: 24, md: 32, lg: 48 };
const fullSizes = {
  sm: { w: 100, h: 22 },
  md: { w: 140, h: 30 },
  lg: { w: 200, h: 44 },
};

function Icon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="96" height="96" rx="20" fill="#1B4FD8" />
      <rect x="18" y="10" width="52" height="66" rx="5" fill="white" opacity="0.15" />
      <path d="M52 10 L70 28 H52 V10 Z" fill="#0F3BB5" opacity="0.5" />
      <rect x="26" y="36" width="22" height="3" rx="1.5" fill="white" opacity="0.45" />
      <rect x="26" y="44" width="34" height="3" rx="1.5" fill="white" opacity="0.45" />
      <rect x="26" y="52" width="26" height="3" rx="1.5" fill="white" opacity="0.45" />
      <path d="M22 68 L35 80 L68 48" stroke="#10B981" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function Wordmark({ w, h, textColor }: { w: number; h: number; textColor: string }) {
  return (
    <svg width={w} height={h} viewBox="0 0 160 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text
        fontFamily="Inter, sans-serif"
        fontWeight="800"
        fontSize="30"
        y="30"
      >
        <tspan fill={textColor}>vere</tspan>
        <tspan fill="#10B981">doc</tspan>
      </text>
    </svg>
  );
}

export default function VeredocLogo({
  variant = "full",
  size = "md",
  theme = "light",
  className,
}: VeredocLogoProps) {
  const iconSize = iconSizes[size];
  const { w, h } = fullSizes[size];
  const textColor = theme === "dark" ? "white" : "#1B4FD8";

  if (variant === "icon") {
    return (
      <span className={className}>
        <Icon size={iconSize} />
      </span>
    );
  }

  if (variant === "wordmark") {
    return (
      <span className={className}>
        <Wordmark w={w} h={h} textColor={textColor} />
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <Icon size={iconSize} />
      <Wordmark w={w} h={h} textColor={textColor} />
    </div>
  );
}
