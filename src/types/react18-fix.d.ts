/**
 * React 18 Compatibility Type Declarations
 * 
 * This file fixes type mismatches between React 18 and libraries 
 * that declare React 19 in their peer dependencies.
 */

import * as React from 'react';

// Extend React namespace to fix JSX element compatibility
declare global {
  namespace React {
    // Ensure ReactElement is assignable to ReactNode
    type ReactNode = 
      | React.ReactChild
      | React.ReactPortal
      | React.ReactFragment
      | React.ReactArray
      | Iterable<React.ReactNode>
      | boolean
      | null
      | undefined;
  }
  
  namespace JSX {
    // Fix JSX.Element to be compatible with React 18
    interface Element extends React.ReactElement<any, any> {}
    interface ElementClass {
      render(): React.ReactNode;
    }
    interface IntrinsicAttributes {
      key?: React.Key;
    }
  }
}

// Fix FC type for React 18
declare module 'react' {
  interface FunctionComponent<P = {}> {
    (props: P, context?: any): React.ReactElement | null;
    displayName?: string;
  }
}

export {};
