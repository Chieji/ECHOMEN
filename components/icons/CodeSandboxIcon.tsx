import React from 'react';

export const CodeSandboxIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M2 6l10 6l10-6l-10-6l-10 6z m0 12l10 6l10-6l-10-6l-10 6z" opacity="0.4"/>
        <path d="M2 6v12l10 6V12L2 6z"/>
        <path d="m22 6v12l-10 6V12l10-6z"/>
    </svg>
);
