/**
 * Lightweight React typing fallback for environments where @types/react is unavailable.
 * Keep this file intentionally minimal to avoid masking real typing issues.
 */
declare module 'react' {
  export type Key = string | number;
  export type ReactText = string | number;
  export type ReactNode = ReactText | boolean | null | undefined | any;

  export interface ReactElement<P = any, T = any> {
    type: T;
    props: P;
    key: Key | null;
  }

  export type FC<P = any> = (props: P) => ReactElement | null;

  export interface SVGProps<T = any> {
    className?: string;
    width?: number | string;
    height?: number | string;
    fill?: string;
    stroke?: string;
    viewBox?: string;
    [key: string]: any;
  }

  export interface KeyboardEvent<T = any> {
    currentTarget: T;
    target: any;
    key: string;
    preventDefault(): void;
  }

  export interface ChangeEvent<T = any> {
    currentTarget: T;
    target: any;
    preventDefault(): void;
  }

  export interface FormEvent<T = any> {
    currentTarget: T;
    target: any;
    preventDefault(): void;
  }

  export interface RefObject<T> {
    current: T | null;
  }

  export type Ref<T> = ((instance: T | null) => void) | RefObject<T | null> | null;

  export function useState<S>(initialState: S | (() => S)): [S, (value: S | ((prevState: S) => S)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
  export function useLayoutEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
  export function useMemo<T>(factory: () => T, deps?: readonly unknown[]): T;
  export function useCallback<T extends (...args: any[]) => unknown>(fn: T, deps?: readonly unknown[]): T;
  
  export function useRef<T>(value: T | null): RefObject<T | null>;
  export function useRef<T>(value: T): RefObject<T>;
  export function useRef<T = undefined>(value?: T): RefObject<T | undefined>;

  export function forwardRef<T, P = Record<string, any>>(
    render: (props: P, ref: Ref<T>) => any
  ): any;
}

declare module 'react/jsx-runtime' {
  export function jsx(type: any, props: any, key?: string): any;
  export function jsxs(type: any, props: any, key?: string): any;
  export const Fragment: any;
}

declare module 'react-dom/client' {
  export function createRoot(container: any): {
    render(children: any): void;
    unmount(): void;
  };
}

declare namespace JSX {
  interface Element {}
  interface IntrinsicElements {
    [elemName: string]: any;
  }
  interface IntrinsicAttributes {
    key?: string | number;
  }
}
