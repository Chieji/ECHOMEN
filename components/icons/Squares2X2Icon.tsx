import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

export const Squares2X2Icon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
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
    <path d="M3 3h7v7H3z" />
    <path d="M14 3h7v7h-7z" />
    <path d="M14 14h7v7h-7z" />
    <path d="M3 14h7v7H3z" />
  </svg>
);

export default Squares2X2Icon;
