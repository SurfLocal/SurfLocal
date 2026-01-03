import { SVGProps } from 'react';

interface SurfboardIconProps extends SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
}

const SurfboardIcon = ({ className, size = 24, ...props }: SurfboardIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {/* Surfboard shape - elongated oval rotated */}
    <ellipse cx="12" cy="12" rx="3" ry="10" transform="rotate(-30 12 12)" />
    {/* Stringer line down the middle */}
    <line x1="7" y1="17" x2="17" y2="7" strokeWidth="1" opacity="0.5" />
    {/* Fin */}
    <path d="M16 15 L18 17 L16 18 Z" fill="currentColor" strokeWidth="0" />
  </svg>
);

export default SurfboardIcon;
