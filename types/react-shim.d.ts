/**
 * Lightweight React typing fallback for environments where @types/react is unavailable.
 * Keep this file intentionally minimal to avoid masking real typing issues.
 */
declare module 'react' {
  export type Key = string | number;
  export type ReactText = string | number;
  export type ReactNode = ReactText | boolean | null | undefined | ReactElement | ReactNode[];

  export interface ReactElement<P = unknown, T = string | JSXElementConstructor<any>> {
    type: T;
    props: P;
    key: Key | null;
  }

  export type JSXElementConstructor<P> = ((props: P) => ReactElement | null) | (new (props: P) => unknown);

  export type FC<P = Record<string, never>> = (props: P) => ReactElement | null;

  export interface SVGProps<T = SVGElement> {
    className?: string;
    width?: number | string;
    height?: number | string;
    fill?: string;
    stroke?: string;
    viewBox?: string;
    [key: string]: unknown;
  }

  export interface KeyboardEvent<T = Element> {
    currentTarget: T;
    target: EventTarget | null;
    key: string;
    preventDefault(): void;
  }

  export interface ChangeEvent<T = Element> {
    currentTarget: T;
    target: EventTarget & T;
    preventDefault(): void;
  }

  export interface FormEvent<T = Element> {
    currentTarget: T;
    target: EventTarget;
    preventDefault(): void;
  }

  export interface RefObject<T> {
    current: T;
  }

  export type Ref<T> = ((instance: T | null) => void) | RefObject<T | null> | null;

  export function useState<S>(initialState: S | (() => S)): [S, (value: S | ((prevState: S) => S)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
  export function useLayoutEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
  export function useMemo<T>(factory: () => T, deps?: readonly unknown[]): T;
  export function useCallback<T extends (...args: never[]) => unknown>(fn: T, deps?: readonly unknown[]): T;
  export function useRef<T>(value: T): RefObject<T>;
  export function useRef<T = undefined>(value?: T): RefObject<T | undefined>;
  export function forwardRef<T, P = Record<string, never>>(
    render: (props: P, ref: Ref<T>) => ReactElement | null,
  ): (props: P & { ref?: Ref<T> }) => ReactElement | null;
}

declare module 'react/jsx-runtime' {
  export function jsx(type: unknown, props: unknown, key?: string): unknown;
  export function jsxs(type: unknown, props: unknown, key?: string): unknown;
  export const Fragment: unique symbol;
}

declare module 'react-dom/client' {
  export function createRoot(container: Element | DocumentFragment): {
    render(children: unknown): void;
    unmount(): void;
  };
}

declare namespace JSX {
  interface Element {}
  interface IntrinsicElements {
    [elemName: string]: Record<string, unknown>;
  }
  interface IntrinsicAttributes {
    key?: string | number;
  }
}
