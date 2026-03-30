// Global type declarations for React 18 compatibility
// Fixes ReactElement vs ReactNode type mismatches from mixed React 18/19 dependencies

import React from 'react';

// Ensure ReactNode includes ReactElement for compatibility
declare module 'react' {
  interface ReactElement<P = any, T extends string | JSXElementConstructor<any> = string | JSXElementConstructor<any>> {
    type?: T;
    props?: P;
    key?: React.Key | null;
  }
}

// Fix for FC type compatibility
declare global {
  namespace JSX {
    interface Element extends React.ReactElement<any, any> {}
  }
}

export {};
