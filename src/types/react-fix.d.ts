// Fix for React.FC + ReactElement/ReactNode incompatibility in TypeScript 5.x + React 18
// This extends React types to allow ReactElement where ReactNode is expected
// See: https://github.com/DefinitelyTyped/DefinitelyTyped/issues/69607

import 'react';

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface FC<P = unknown> {
    (props: P, context?: unknown): ReactElement | null;
  }
}
