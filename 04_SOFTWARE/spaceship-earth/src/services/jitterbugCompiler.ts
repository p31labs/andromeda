// jitterbugCompiler — Babel Standalone JSX → React component pipeline.
// Takes raw JSX strings from the Centaur Engine, compiles them via Babel,
// and mounts them into the dynamic module registry.

import React, { useState } from 'react';

// @babel/standalone loaded via CDN at runtime (avoids bundling 3MB)
declare global {
  interface Window {
    Babel?: {
      transform: (code: string, options: { presets: string[] }) => { code: string };
    };
  }
}

const BABEL_CDN = 'https://unpkg.com/@babel/standalone@7/babel.min.js';

// ── Module Registry ──
// Compiled components stored here, keyed by slot name.
export const moduleRegistry = new Map<string, React.ComponentType>();

let babelLoaded = false;

async function ensureBabel(): Promise<void> {
  if (babelLoaded && window.Babel) return;

  return new Promise((resolve, reject) => {
    if (window.Babel) {
      babelLoaded = true;
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = BABEL_CDN;
    script.onload = () => {
      babelLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load Babel from CDN'));
    document.head.appendChild(script);
  });
}

/**
 * Compile a JSX string into a React component.
 * The code should export a default functional component or just be a function component body.
 */
export function compileCentaurCode(rawCode: string): React.ComponentType {
  if (!window.Babel) {
    throw new Error('Babel not loaded. Call ensureBabel() first.');
  }

  // Strip markdown fences if the LLM wrapped it
  let code = rawCode.trim();
  if (code.startsWith('```')) {
    code = code.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim();
  }

  // Transform JSX → JS
  const transformed = window.Babel.transform(code, { presets: ['react'] });
  if (!transformed.code) {
    throw new Error('Babel transform returned empty code');
  }

  // Wrap in a factory function with React + useState in scope
  // The code should define a component — we capture it via the last expression
  const wrappedCode = `
    ${transformed.code}
    // Return the component — try common patterns
    if (typeof App !== 'undefined') return App;
    if (typeof Component !== 'undefined') return Component;
    if (typeof Default !== 'undefined') return Default;
    // If code is a single function expression/declaration, return it
  `;

  // eslint-disable-next-line no-new-func
  const factory = new Function('React', 'useState', wrappedCode);
  const Component = factory(React, useState);

  if (typeof Component !== 'function') {
    throw new Error('Compiled code did not produce a valid React component');
  }

  return Component as React.ComponentType;
}

/**
 * Compile and register a component into a named slot.
 */
export async function compileAndMount(rawCode: string, slotName: string): Promise<React.ComponentType> {
  await ensureBabel();
  const Component = compileCentaurCode(rawCode);
  moduleRegistry.set(slotName, Component);
  return Component;
}

/**
 * Load Babel eagerly (call on app init or overlay mount).
 */
export { ensureBabel };
