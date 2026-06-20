import { IconButton, Tooltip } from "@/components/index";
import type { ViewKey } from "../types";

export function NaviLogo({ size = 20 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 32 32"
            fill="none">
            <rect
                x="3.1"
                y="5.1"
                width="25.8"
                height="21.8"
                rx="5.2"
                stroke="currentColor"
                strokeWidth="2"
            />
            <line
                x1="20.6"
                y1="6.2"
                x2="20.6"
                y2="25.8"
                stroke="currentColor"
                strokeWidth="2"
            />
            <circle
                cx="24.75"
                cy="16"
                r="4.4"
                fill="#22DDD0"
                opacity="0.28"
            />
            <circle
                cx="24.75"
                cy="16"
                r="2.45"
                fill="#22DDD0"
            />
        </svg>
    );
}

const MODEL_CLS =
    "inline-flex items-center gap-[6px] ml-[4px] whitespace-nowrap font-mono text-2xs text-muted " +
    "bg-surface-raised border border-line rounded-full py-[4px] px-[9px] cursor-pointer " +
    "transition duration-[120ms] ease-[var(--ease-out)] hover:text-strong hover:border-line-strong";

export interface TopBarProps {
    model: string;
    view: ViewKey;
    onOpenModel: () => void;
    onOpenSettings: () => void;
    onNav: (view: ViewKey) => void;
}

export function TopBar({ model, view, onOpenModel, onOpenSettings, onNav }: TopBarProps) {
    return (
        <div className="flex items-center gap-[9px] h-[46px] pl-[14px] pr-2 border-b border-line flex-none">
            <div className="flex items-center gap-[7px] text-strong">
                <NaviLogo />
                <span className="font-display font-bold text-[17px] tracking-[-0.03em]">navi</span>
            </div>
            <button
                type="button"
                className={MODEL_CLS}
                onClick={onOpenModel}>
                <span className="w-[6px] h-[6px] rounded-full bg-success shadow-[var(--glow-success)]" />
                {model}
            </button>
            <div className="ml-auto flex items-center gap-[1px]">
                <Tooltip label="History">
                    <IconButton
                        icon="history"
                        label="History"
                        active={view === "history"}
                        onClick={() => onNav("history")}
                    />
                </Tooltip>
                <Tooltip label="Recipes">
                    <IconButton
                        icon="bookmark"
                        label="Recipes"
                        active={view === "recipes"}
                        onClick={() => onNav("recipes")}
                    />
                </Tooltip>
                <Tooltip label="Settings">
                    <IconButton
                        icon="settings-2"
                        label="Settings"
                        active={view === "settings"}
                        onClick={onOpenSettings}
                    />
                </Tooltip>
                <Tooltip
                    label="Collapse"
                    kbd="⌘⇧N"
                    side="bottom"
                    align="right">
                    <IconButton
                        icon="panel-right-close"
                        label="Collapse"
                    />
                </Tooltip>
            </div>
        </div>
    );
}
