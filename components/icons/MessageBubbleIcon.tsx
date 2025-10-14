import React from 'react';

export const MessageBubbleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193l-3.722.32c-1.18.103-2.348.402-3.419.822a48.294 48.294 0 00-4.656 0c-1.071-.42-2.239-.719-3.419-.822L4.98 17.186A2.1 2.1 0 013 15.087v-4.286c0-.97.616-1.813 1.5-2.097M15 6.75l3 3m0 0l-3 3m3-3H6" />
    </svg>
);