import { useState } from "react";
import { APIKeyInput, Banner, Button, Icon, Input, StatusDot, type IconName } from "@/components";
import type { Provider } from "./types";

const POINTS: { icon: IconName; t: string; d: string }[] = [
    { icon: "scan-text", t: "See the page", d: "Summarize, extract, answer — in context." },
    { icon: "mouse-pointer-click", t: "Take action", d: "Click, fill, navigate — one step at a time." },
    { icon: "shield-check", t: "You stay in control", d: "Review every action before it runs." },
];

export function WelcomeView({ onConnect }: { onConnect: (provider: Provider) => void }) {
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
                    onClick={() => onConnect("cloud")}>
                    Connect to Claude
                </Button>
                <Button
                    variant="secondary"
                    full
                    icon="cpu"
                    onClick={() => onConnect("local")}>
                    Use a local model
                </Button>
            </div>
        </div>
    );
}

export interface ConnectViewProps {
    provider: Provider;
    onBack: () => void;
    onDone: () => void;
}

export function ConnectView({ provider, onBack, onDone }: ConnectViewProps) {
    const isCloud = provider === "cloud";
    const [key, setKey] = useState("");
    const [endpoint, setEndpoint] = useState("http://localhost:1234/v1");
    const [tested, setTested] = useState(false);
    const ready = isCloud ? key.trim().length > 8 : tested;

    return (
        <div className="flex-1 min-h-0 flex flex-col pt-4 px-4 pb-5 overflow-y-auto navi-scroll">
            <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-[5px] self-start mb-[14px] text-muted font-ui text-sm cursor-pointer hover:text-strong">
                <Icon
                    name="arrow-left"
                    size={14}
                />{" "}
                Back
            </button>
            <h2 className="font-display text-xl font-semibold text-strong">
                {isCloud ? "Connect to Claude" : "Connect a local model"}
            </h2>
            <p className="text-base text-muted mt-[6px] mb-[18px] leading-[1.55]">
                {isCloud
                    ? "Paste your Anthropic API key. It stays on this device."
                    : "Point Navi at your LM Studio endpoint."}
            </p>

            {isCloud ? (
                <>
                    <label className="block text-sm font-medium text-body mb-[7px]">API key</label>
                    <APIKeyInput
                        value={key}
                        onChange={e => setKey(e.target.value)}
                    />
                    {!ready && <div className="h-2" />}
                    {!ready && (
                        <Banner
                            tone="info"
                            title="Where do I find this?">
                            Create a key at console.anthropic.com → API Keys.
                        </Banner>
                    )}
                </>
            ) : (
                <>
                    <label className="block text-sm font-medium text-body mb-[7px]">Endpoint URL</label>
                    <Input
                        icon="link"
                        value={endpoint}
                        onChange={e => setEndpoint(e.target.value)}
                    />
                    <div className="flex items-center gap-3 mt-3">
                        <Button
                            variant="secondary"
                            size="sm"
                            icon="plug-zap"
                            onClick={() => setTested(true)}>
                            Test connection
                        </Button>
                        {tested && (
                            <StatusDot
                                tone="success"
                                pulse>
                                Connected · mistral-7b-instruct
                            </StatusDot>
                        )}
                    </div>
                </>
            )}

            <div className="mt-[22px]">
                <Button
                    variant="primary"
                    full
                    disabled={!ready}
                    iconRight="arrow-right"
                    onClick={onDone}>
                    Start using Navi
                </Button>
            </div>
        </div>
    );
}
