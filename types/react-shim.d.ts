declare module 'react' {
  const React: any;
  export default React;
  export = React;

  export type FC<P = any> = (props: P) => any;
  export type ReactNode = any;
  export type SVGProps<T = any> = any;
  export type KeyboardEvent<T = any> = any;
  export type ChangeEvent<T = any> = any;
  export type FormEvent<T = any> = any;
  export type Ref<T = any> = any;

  export function useState<S = any>(initialState: S | (() => S)): [S, (value: S | ((prevState: S) => S)) => void];
  export function useEffect(effect: any, deps?: any[]): void;
  export function useLayoutEffect(effect: any, deps?: any[]): void;
  export function useMemo<T = any>(factory: () => T, deps?: any[]): T;
  export function useCallback<T extends (...args: any[]) => any>(fn: T, deps?: any[]): T;
  export function useRef<T = any>(value?: T): { current: T };
  export function forwardRef<T = any, P = any>(render: (props: P, ref: any) => any): any;
}

declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}

declare module 'react-dom/client' {
  export const createRoot: any;
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
  interface IntrinsicAttributes {
    key?: any;
    [attrName: string]: any;
  }
}
