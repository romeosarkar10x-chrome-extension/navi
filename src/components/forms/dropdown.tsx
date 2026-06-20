import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "../core/icon";
import type { SelectOption } from "./select";

type Size = "sm" | "md";

const SIZES: Record<Size, string> = { sm: "h-[26px]", md: "h-[32px]" };

const TRIGGER =
    "relative inline-flex items-center w-full gap-2 bg-surface-raised border rounded-md pl-[10px] pr-[9px] " +
    "font-ui text-base text-strong cursor-pointer outline-none " +
    "transition duration-[120ms] ease-[var(--ease-out)] disabled:opacity-50 disabled:pointer-events-none";

export interface DropdownProps {
    value?: string;
    onChange?: (value: string) => void;
    options?: Array<string | SelectOption>;
    placeholder?: string;
    size?: Size;
    disabled?: boolean;
    className?: string;
}

/**
 * Custom themed single-select — a styled trigger with a popover listbox, so the
 * menu inherits Navi's theme instead of the native OS dropdown.
 */
export function Dropdown({
    value,
    onChange,
    options = [],
    placeholder = "Select…",
    size = "md",
    disabled = false,
    className = "",
}: DropdownProps) {
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1); // keyboard-highlighted index
    const rootRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

    const opts: SelectOption[] = options.map(o => (typeof o === "string" ? { value: o, label: o } : o));
    const selected = opts.find(o => o.value === value);
    const selectedIndex = opts.findIndex(o => o.value === value);

    // Close on outside pointer / Escape while open.
    useEffect(() => {
        if (!open) return;
        function onPointer(e: PointerEvent) {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        }
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") setOpen(false);
        }
        document.addEventListener("pointerdown", onPointer);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("pointerdown", onPointer);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    // Keep the highlighted item in view as it changes.
    useEffect(() => {
        if (open && active >= 0) itemRefs.current[active]?.scrollIntoView({ block: "nearest" });
    }, [open, active]);

    function openMenu() {
        if (disabled) return;
        setActive(selectedIndex >= 0 ? selectedIndex : 0);
        setOpen(true);
    }

    function choose(v: string) {
        onChange?.(v);
        setOpen(false);
    }

    function onKeyDown(e: React.KeyboardEvent) {
        if (disabled) return;
        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                if (!open) openMenu();
                else setActive(a => Math.min(opts.length - 1, a + 1));
                break;
            case "ArrowUp":
                e.preventDefault();
                if (!open) openMenu();
                else setActive(a => Math.max(0, a - 1));
                break;
            case "Home":
                if (open) {
                    e.preventDefault();
                    setActive(0);
                }
                break;
            case "End":
                if (open) {
                    e.preventDefault();
                    setActive(opts.length - 1);
                }
                break;
            case "Enter":
            case " ":
                e.preventDefault();
                if (open && active >= 0) choose(opts[active].value);
                else openMenu();
                break;
        }
    }

    return (
        <div
            ref={rootRef}
            className={cn("relative", className)}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => (open ? setOpen(false) : openMenu())}
                onKeyDown={onKeyDown}
                aria-haspopup="listbox"
                aria-expanded={open}
                className={cn(
                    TRIGGER,
                    SIZES[size],
                    open
                        ? "border-accent-line shadow-[var(--glow-focus)]"
                        : "border-line-strong focus-visible:border-accent-line focus-visible:shadow-[var(--glow-focus)]",
                )}>
                <span className={cn("flex-1 min-w-0 truncate text-left", !selected && "text-faint")}>
                    {selected?.label ?? placeholder}
                </span>
                <Icon
                    name="chevron-down"
                    size={15}
                    className={cn("text-faint transition-transform duration-[120ms]", open && "rotate-180")}
                />
            </button>

            {open && (
                <div
                    role="listbox"
                    className={
                        "absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-[240px] overflow-y-auto navi-scroll " +
                        "rounded-md border border-line bg-surface-overlay p-[4px] shadow-[var(--shadow-pop)] animate-fade"
                    }>
                    {opts.length === 0 && (
                        <div className="px-[8px] py-[6px] font-ui text-base text-faint">No options</div>
                    )}
                    {opts.map((opt, i) => {
                        const isSelected = opt.value === value;
                        const isActive = i === active;
                        return (
                            <button
                                key={opt.value}
                                ref={el => {
                                    itemRefs.current[i] = el;
                                }}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                onMouseEnter={() => setActive(i)}
                                onClick={() => choose(opt.value)}
                                className={cn(
                                    "flex w-full items-center gap-2 rounded-[6px] px-[8px] py-[6px] text-left font-ui text-base cursor-pointer",
                                    "transition-colors duration-[100ms]",
                                    isActive && "bg-control-hover",
                                    !isActive && isSelected && "bg-accent-soft",
                                    isSelected ? "text-accent-text" : "text-body",
                                )}>
                                <span className="flex-1 min-w-0 truncate">{opt.label}</span>
                                {isSelected && (
                                    <Icon
                                        name="check"
                                        size={14}
                                        className="text-accent-text"
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
