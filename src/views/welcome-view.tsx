import { Button, Icon } from "@/components/index";
import { PRESETS, ProviderPreset } from "@/lib/agent/providers";
import { IconName } from "@/components/index";

const POINTS: { icon: IconName; t: string; d: string }[] = [
    { icon: "scan-text", t: "See the page", d: "Summarize, extract, answer — in context." },
    { icon: "mouse-pointer-click", t: "Take action", d: "Click, fill, navigate — one step at a time." },
    { icon: "shield-check", t: "You stay in control", d: "Review every action before it runs." },
];

export function WelcomeView({ onConnect }: { onConnect: (preset: ProviderPreset) => void }) {
    return (
        <div className="flex-1 min-h-0 flex flex-col items-center text-center pt-[34px] px-[22px] pb-[22px] overflow-y-auto navi-scroll">
            <div className="w-[88px] h-[88px] rounded-[22px] bg-surface-card border border-line flex items-center justify-center shadow-[var(--glow-soft)] mb-5">
                <svg
                    width="56"
                    height="56"
                    viewBox="0 0 32 32"
                    fill="none">
                    <rect
                        x="3.1"
                        y="5.1"
                        width="25.8"
                        height="21.8"
                        rx="5.2"
                        stroke="var(--text-strong)"
                        strokeWidth="2"
                    />
                    <line
                        x1="20.6"
                        y1="6.2"
                        x2="20.6"
                        y2="25.8"
                        stroke="var(--text-strong)"
                        strokeWidth="2"
                    />
                    <circle
                        cx="24.75"
                        cy="16"
                        r="5.6"
                        fill="#22DDD0"
                        opacity="0.26"
                    />
                    <circle
                        cx="24.75"
                        cy="16"
                        r="2.7"
                        fill="#22DDD0"
                    />
                </svg>
            </div>
            <h1 className="font-display text-2xl font-bold text-strong tracking-[-0.02em] leading-[1.2]">
                Hey, I'm Navi
            </h1>
            <p className="text-md text-muted mt-3 leading-[1.55] max-w-[30ch]">
                Your copilot for any page. I can read what you're looking at and act on it for you.
            </p>
            <div className="flex flex-col gap-1 w-full my-6 text-left">
                {POINTS.map((p, i) => (
                    <div
                        className="flex gap-[11px] py-[11px] px-3 rounded-md"
                        key={i}>
                        <span className="w-[30px] h-[30px] flex-none rounded-sm flex items-center justify-center bg-accent-soft text-accent-text">
                            <Icon
                                name={p.icon}
                                size={16}
                            />
                        </span>
                        <div>
                            <div className="text-md font-semibold text-strong">{p.t}</div>
                            <div className="text-sm text-muted mt-[1px] leading-[1.4]">{p.d}</div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex flex-col gap-[9px] w-full">
                <Button
                    variant="primary"
                    full
                    icon="sparkles"
                    onClick={() => onConnect(PRESETS[0])}>
                    Connect a cloud model
                </Button>
                <Button
                    variant="secondary"
                    full
                    icon="cpu"
                    onClick={() => onConnect(PRESETS[1])}>
                    Use a self-hosted model
                </Button>
            </div>
        </div>
    );
}
