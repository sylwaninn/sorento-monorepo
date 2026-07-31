import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// The app reads its Supabase configuration at module load; tests never reach the network,
// they mock the repositories, but the client still has to be constructible.
const stubConfiguration = () => {
  vi.stubEnv("VITE_SUPABASE_URL", "http://localhost:57321");
  vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-anon-key");
};

// Once at import time, because a test file's own imports are evaluated before any hook runs,
// and again before each test, because a test exercising its own variable calls
// vi.unstubAllEnvs() and would otherwise take the client's configuration down with it. A
// developer machine has a real .env and never notices; CI has none and fails on the next import.
stubConfiguration();
beforeEach(stubConfiguration);

/**
 * Browser APIs jsdom does not implement but the component library measures with. Without them a component
 * throws on mount into React's error boundary, which reads as a rendered page: the test passes
 * while the screen is broken. Stubs, not fakes: nothing here asserts on layout.
 */
class ObserverStub {
  observe = (): void => {};
  unobserve = (): void => {};
  disconnect = (): void => {};
  takeRecords = (): [] => [];
}

// Configurable, so a test with something to say about visibility can put its own recorder in
// place through vi.stubGlobal and have it restored afterwards.
const stubGlobal = (name: string, value: unknown) =>
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });

stubGlobal("ResizeObserver", ObserverStub);
stubGlobal("IntersectionObserver", ObserverStub);

Object.defineProperty(globalThis, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

if (!globalThis.HTMLElement.prototype.scrollTo) {
  globalThis.HTMLElement.prototype.scrollTo = (): void => {};
}

/**
 * The Web Animations API, which react-aria's shared-element transition calls when a tab or an
 * accordion changes. jsdom has none of it, and the throw lands in React Router's error
 * boundary: the screen is replaced by the fallback while the test that clicked reports only
 * that what it expected is missing. Nothing here animates, so an empty list is the whole stub.
 */
if (!globalThis.Element.prototype.getAnimations) {
  globalThis.Element.prototype.getAnimations = (): Animation[] => [];
}

/**
 * Pointer capture and scrolling, which the registry's select calls the moment its trigger is
 * pressed. jsdom implements neither, and the throw lands outside React: the listbox never opens
 * and the test reads as "the option is not there" rather than as "the environment is missing an
 * API". Answering false is what a mouse that has captured nothing would answer.
 */
if (!globalThis.Element.prototype.hasPointerCapture) {
  globalThis.Element.prototype.hasPointerCapture = (): boolean => false;
  globalThis.Element.prototype.setPointerCapture = (): void => {};
  globalThis.Element.prototype.releasePointerCapture = (): void => {};
}

if (!globalThis.Element.prototype.scrollIntoView) {
  globalThis.Element.prototype.scrollIntoView = (): void => {};
}

/**
 * React Router builds a `Request` for every navigation and hands it the current AbortSignal.
 * Under vitest that signal comes from jsdom while `Request` comes from Node's undici, which
 * rejects it as a foreign type: every `navigate()` in a test then produces an unhandled
 * rejection that has nothing to do with the app. Dropping the signal is harmless here: no test
 * aborts a navigation, and the data layer that would honour it is stubbed.
 */
const NativeRequest = globalThis.Request;

Object.defineProperty(globalThis, "Request", {
  writable: true,
  value: class extends NativeRequest {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      const { signal: _ignored, ...rest } = init ?? {};
      super(input, rest);
    }
  },
});
