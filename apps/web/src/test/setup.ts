import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// The app reads its Supabase configuration at module load; tests never reach the network,
// they mock the repositories, but the client still has to be constructible.
vi.stubEnv("VITE_SUPABASE_URL", "http://localhost:57321");
vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-anon-key");

/**
 * Browser APIs jsdom does not implement but HeroUI measures with. Without them a component
 * throws on mount into React's error boundary, which reads as a rendered page: the test passes
 * while the screen is broken. Stubs, not fakes — nothing here asserts on layout.
 */
class ObserverStub {
  observe = (): void => {};
  unobserve = (): void => {};
  disconnect = (): void => {};
  takeRecords = (): [] => [];
}

Object.defineProperty(globalThis, "ResizeObserver", { writable: true, value: ObserverStub });
Object.defineProperty(globalThis, "IntersectionObserver", { writable: true, value: ObserverStub });

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
 * React Router builds a `Request` for every navigation and hands it the current AbortSignal.
 * Under vitest that signal comes from jsdom while `Request` comes from Node's undici, which
 * rejects it as a foreign type — every `navigate()` in a test then produces an unhandled
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
