import React from 'react';

export const SpinnerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 3a9 9 0 109 9" opacity=".25"></path>
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 12a9 9 0 11-9-9">
            <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 12 12"
                to="360 12 12"
                dur="1s"
                repeatCount="indefinite"
            />
        </path>
    </svg>
);