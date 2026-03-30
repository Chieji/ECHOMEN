import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

export const DatabaseIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
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
  >
    <ellipse cx="12" cy="6" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 6v6c0 1.66 4 3 9 3s9-1.34 9-3V6" />
    <path d="M3 12v6c0 1.66 4 3 9 3s9-1.34 9-3v-6" />
  </svg>
);

export default DatabaseIcon;
