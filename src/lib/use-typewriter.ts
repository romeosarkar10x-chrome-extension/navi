import { useEffect, useRef, useState } from "react";

export interface TypewriterOptions {
    /**
     * Whether the typewriter should animate at all. When false, `target` is shown
     * in full immediately (used for already-complete, non-streaming messages).
     */
    animate?: boolean;
    /** Lower bound on reveal speed, so typing always makes visible progress. */
    minCharsPerSecond?: number;
    /** Upper bound on reveal speed when the backlog is large. */
    maxCharsPerSecond?: number;
    /**
     * Time constant (seconds) for draining the backlog. Reveal speed is
     * `backlog / drainSeconds`, clamped to the min/max — so a big buffer reveals
     * fast (to catch up) and a nearly-empty one slows to a natural pace.
     */
    drainSeconds?: number;
}

const prefersReducedMotion = () =>
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function clamp(value: number, lo: number, hi: number): number {
    return Math.min(hi, Math.max(lo, value));
}

/**
 * Reveal `target` one character at a time, like a typewriter. `target` is the
 * full text accumulated so far and may grow over time (the streaming buffer);
 * the hook returns the prefix revealed up to now. Reveal speed scales with how
 * much text is still buffered, so the display catches up during bursts and types
 * naturally as it drains.
 */
export function useTypewriter(target: string, options: TypewriterOptions = {}): string {
    const { animate = true, minCharsPerSecond = 35, maxCharsPerSecond = 1200, drainSeconds = 0.35 } = options;

    const [count, setCount] = useState(0);
    const countRef = useRef(0); // fractional reveal position
    const targetRef = useRef(target);
    const prevTargetRef = useRef(target);
    targetRef.current = target;

    // When the target diverges from what we've already shown (a brand-new message,
    // or a finalize that rewrites the text), restart the reveal from the divergence.
    useEffect(() => {
        const prev = prevTargetRef.current;
        prevTargetRef.current = target;
        const shown = prev.slice(0, Math.floor(countRef.current));
        if (!target.startsWith(shown)) {
            countRef.current = 0;
            setCount(0);
        } else if (countRef.current > target.length) {
            countRef.current = target.length;
            setCount(target.length);
        }
    }, [target]);

    useEffect(() => {
        if (!animate || prefersReducedMotion()) {
            countRef.current = target.length;
            setCount(target.length);
            return;
        }

        let raf = 0;
        let last = 0;
        const tick = (ts: number) => {
            if (!last) last = ts;
            const dt = Math.min(0.25, (ts - last) / 1000);
            last = ts;

            const total = targetRef.current.length;
            const backlog = total - countRef.current;
            if (backlog <= 0) return; // caught up — stop until `target` grows again

            const rate = clamp(backlog / drainSeconds, minCharsPerSecond, maxCharsPerSecond);
            countRef.current = Math.min(total, countRef.current + rate * dt);
            setCount(Math.floor(countRef.current));
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
        // Re-runs whenever `target` grows, restarting the drain loop.
    }, [target, animate, minCharsPerSecond, maxCharsPerSecond, drainSeconds]);

    return target.slice(0, count);
}
