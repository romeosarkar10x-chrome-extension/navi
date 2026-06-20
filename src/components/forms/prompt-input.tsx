import { useEffect, useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "../core/icon";
import { IconButton } from "../core/icon-button";

const SEND_CLS =
    "inline-flex items-center justify-center w-[30px] h-[30px] rounded-sm border-none cursor-pointer " +
    "bg-accent text-on-accent transition duration-[120ms] ease-[var(--ease-out)] " +
    "hover:bg-accent-hover hover:shadow-[var(--glow-soft)] " +
    "disabled:bg-control disabled:text-faint disabled:shadow-none disabled:cursor-default";

const MODEL_CLS =
    "inline-flex items-center gap-[5px] whitespace-nowrap font-mono text-2xs text-muted " +
    "bg-surface-raised border border-line rounded-full pl-[7px] pr-[8px] py-[3px] cursor-pointer " +
    "transition duration-[120ms] ease-[var(--ease-out)] hover:text-strong hover:border-line-strong";

const CHIP_BTN =
    "inline-flex items-center gap-[5px] rounded-full py-[3px] px-[8px] font-ui text-2xs cursor-pointer border " +
    "transition duration-[120ms] ease-[var(--ease-out)]";

export interface PromptInputProps {
    value?: string;
    onChange?: (value: string) => void;
    onSend?: () => void;
    onAttach?: () => void;
    onModelClick?: () => void;
    model: string;
    placeholder?: string;
    // disabled?: boolean;
    onStop: () => void;
    busy: boolean;
    className?: string;
    picking: boolean;
    onTogglePicker: () => void;
}

/** Chat composer — auto-growing textarea with attach, model switcher and send. */
export function PromptInput({
    value = "",
    onChange,
    onSend,
    onAttach,
    onModelClick,
    model,
    placeholder = "Ask Navi about this page...",
    // disabled = false,
    busy,
    onStop,
    className = "",
    picking,
    onTogglePicker,
}: PromptInputProps) {
    const ref = useRef<HTMLTextAreaElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
    }, [value]);

    const canSend = value.trim().length > 0 && !busy;

    function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
        // Enter sends; Shift+Enter (or IME composition) inserts a newline.
        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            if (canSend) onSend?.();
        }
    }

    return (
        <div
            className={cn(
                "flex flex-col gap-2 bg-surface-card border border-line-strong rounded-lg px-[10px] pt-[10px] pb-2 " +
                    "transition duration-[120ms] ease-[var(--ease-out)] " +
                    "focus-within:border-accent-line focus-within:shadow-[var(--glow-focus)]",
                className,
            )}>
            <textarea
                ref={ref}
                rows={1}
                value={value}
                placeholder={placeholder}
                onChange={e => onChange?.(e.target.value)}
                onKeyDown={handleKey}
                className="w-full border-none outline-none resize-none bg-transparent font-ui text-base leading-snug text-strong min-h-[20px] max-h-[96px] placeholder:text-faint"
            />
            <div className="flex items-center gap-2">
                <IconButton
                    icon="plus"
                    size="sm"
                    label="Attach context"
                    onClick={onAttach}
                />
                <button
                    type="button"
                    onClick={onTogglePicker}
                    className={cn(
                        CHIP_BTN,
                        picking
                            ? "bg-accent-soft border-accent-line text-accent-text"
                            : "bg-surface-raised border-line text-muted hover:text-strong hover:border-line-strong",
                    )}>
                    <Icon
                        name="mouse-pointer-click"
                        size={11}
                    />
                </button>
                <button
                    type="button"
                    className={MODEL_CLS}
                    onClick={onModelClick}>
                    <Icon
                        name="cpu"
                        size={12}
                    />
                    {model}
                    <Icon
                        name="chevron-down"
                        size={11}
                    />
                </button>
                <span className="flex-1" />
                {!busy ? (
                    <button
                        type="button"
                        onClick={onStop}
                        className={cn(CHIP_BTN, "ml-auto border-line text-error hover:border-line-strong")}>
                        {" "}
                        <Icon
                            name="square"
                            size={12}
                        />
                    </button>
                ) : (
                    <button
                        type="button"
                        className={SEND_CLS}
                        disabled={!canSend}
                        onClick={() => canSend && onSend?.()}
                        aria-label="Send">
                        <Icon
                            name="arrow-up"
                            size={17}
                            strokeWidth={2.25}
                        />
                    </button>
                )}
            </div>
        </div>
    );
}
