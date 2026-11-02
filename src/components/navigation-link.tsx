"use client";
import Link from "next/link";
import { useRef, useEffect, type ComponentProps } from "react";
import { useRouter } from "next/navigation";

// Prefetch only the intended module, not every sidebar item on each render.
export function NavigationLink(props: ComponentProps<typeof Link>) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const last = useRef(0);
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
  };
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const prepare = () => {
    if (["/watchlist", "/settings", "/admin"].includes(String(props.href))) return;
    if (typeof props.href !== "string" || Date.now() - last.current < 30000)
      return;
    last.current = Date.now();
    router.prefetch(props.href);
  };
  return (
    <Link
      {...props}
      prefetch={false}
      onMouseEnter={() => {
        cancel();
        timer.current = setTimeout(prepare, 120);
      }}
      onMouseLeave={cancel}
      onFocus={prepare}
      onTouchStart={prepare}
    />
  );
}
