import { SVGProps } from 'react';

interface ShakaIconProps extends SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
  filled?: boolean;
}

const ShakaIcon = ({ className, size = 24, filled = false, ...props }: ShakaIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {/* Palm */}
    <path d="M8 14c-.5 0-1-.2-1.4-.6L4.5 11.3c-.6-.6-.6-1.5 0-2.1.6-.6 1.5-.6 2.1 0L8 10.5V6c0-.8.7-1.5 1.5-1.5S11 5.2 11 6v5" />
    {/* Thumb extended out */}
    <path d="M8 10.5L5.5 8c-.6-.6-.6-1.5 0-2.1.6-.6 1.5-.6 2.1 0L11 9.3" />
    {/* Three middle fingers curled (represented as palm) */}
    <path d="M11 11V6c0-.8.7-1.5 1.5-1.5S14 5.2 14 6v6" />
    <path d="M14 12V7c0-.8.7-1.5 1.5-1.5S17 6.2 17 7v5" />
    {/* Pinky extended */}
    <path d="M17 12V8c0-.8.7-1.5 1.5-1.5S20 7.2 20 8v6c0 3.3-2.7 6-6 6h-3c-2.2 0-4-1.8-4-4v-2" />
  </svg>
);

export default ShakaIcon;
