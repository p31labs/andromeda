/// <reference types="vite/client" />

import type { ThreeElements } from '@react-three/fiber';

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}
