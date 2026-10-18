"use client";

import { useSyncExternalStore } from "react";

export type ClientSnapshotStore<T> = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => T;
  invalidate: () => void;
};

/**
 * Wraps a browser-only read (localStorage, location, ...) in React's external
 * store model so components can read it without calling setState inside an
 * effect. The value is cached until {@link ClientSnapshotStore.invalidate} runs.
 */
export function createClientSnapshotStore<T>(read: () => T): ClientSnapshotStore<T> {
  let cache: { value: T } | null = null;
  const listeners = new Set<() => void>();
  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => {
      cache ??= { value: read() };
      return cache.value;
    },
    invalidate: () => {
      cache = null;
      for (const listener of listeners) listener();
    },
  };
}

function getServerSnapshot(): undefined {
  return undefined;
}

/**
 * Reads a client snapshot during render. Returns `undefined` during server
 * rendering and hydration, then React re-renders once with the browser value.
 */
export function useClientSnapshot<T>(store: ClientSnapshotStore<T>): T | undefined {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, getServerSnapshot);
}
