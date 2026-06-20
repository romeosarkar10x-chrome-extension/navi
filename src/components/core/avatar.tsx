import type { HTMLAttributes } from "react";
import { cn } from "@/src/lib/cn";
import { Icon } from "./icon";

type Kind = "user" | "navi" | "neutral";
type Size = "sm" | "md" | "lg";

const BASE =
    "inline-flex items-center justify-center rounded-sm flex-none overflow-hidden " +
    "font-display font-semibold text-on-accent leading-none";

const KINDS: Record<Kind, string> = {
    user: "bg-[linear-gradient(150deg,var(--beacon-400),var(--beacon-600))]",
    navi: "bg-[var(--ink-3)] text-accent-text border border-accent-line",
    neutral: "bg-control text-muted",
};

const SIZES: Record<Size, number> = { sm: 22, md: 28, lg: 36 };

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
    kind?: Kind;
    initials?: string;
    src?: string;
    size?: Size;
}

/** Compact avatar for chat authors. "navi" shows the beacon logomark; "user" shows initials. */
export function Avatar({ kind = "user", initials = "", src, size = "md", className = "", ...rest }: AvatarProps) {
    const px = SIZES[size] ?? SIZES.md;
    return (
        <span
            className={cn(BASE, KINDS[kind], className)}
            style={{ width: px, height: px, fontSize: Math.round(px * 0.42) }}
            {...rest}>
            {src ? (
                <img
                    src={src}
                    alt=""
                    className="w-full h-full object-cover"
                />
            ) : kind === "navi" ? (
                <Icon
                    name="sparkles"
                    size={Math.round(px * 0.52)}
                />
            ) : (
                initials.slice(0, 2).toUpperCase()
            )}
        </span>
    );
}
