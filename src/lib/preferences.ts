"use client";
import { useSyncExternalStore } from "react";
const memory = new Map<string, string>();
const subscribe = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener("bioreg-preferences", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("bioreg-preferences", callback);
  };
};
export function usePreference(
  key: string,
): [string[], (value: string[]) => void] {
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(key) || memory.get(key) || "[]";
      } catch {
        return memory.get(key) || "[]";
      }
    },
    () => "[]",
  );
  let value: string[] = [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed))
      value = parsed.filter((v): v is string => typeof v === "string");
  } catch {
    /* Corrupt preferences start empty. */
  }
  return [
    value,
    (next) => {
      const text = JSON.stringify(next);
      memory.set(key, text);
      try {
        localStorage.setItem(key, text);
      } finally {
        window.dispatchEvent(new Event("bioreg-preferences"));
      }
    },
  ];
}
