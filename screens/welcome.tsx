import { useState } from "react";
import { APIKeyInput, Banner, Button, Icon, Input, StatusDot, type IconName } from "@/components";
import { isConfigReady, matchPreset, PRESETS, type ProviderConfig, type ProviderPreset } from "@/lib/providers";
import { testConnection } from "@/lib/chat-client";

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

export interface ConnectViewProps {
    initialConfig: ProviderConfig;
    onBack: () => void;
    onDone: (config: ProviderConfig) => void;
}

type TestState = "idle" | "testing" | "ok" | "error";

export function ConnectView({ initialConfig, onBack, onDone }: ConnectViewProps) {
    const [config, setConfig] = useState<ProviderConfig>(initialConfig);
    const [test, setTest] = useState<TestState>("idle");
    const [testError, setTestError] = useState("");
    const activePreset = matchPreset(config);
    const ready = isConfigReady(config);

    function applyPreset(preset: ProviderPreset) {
        // Switching endpoints invalidates any prior test result; keep the key the user typed.
        setConfig(c => ({ ...c, baseURL: preset.baseURL, model: preset.model }));
        setTest("idle");
    }

    function patch(part: Partial<ProviderConfig>) {
        setConfig(c => ({ ...c, ...part }));
        setTest("idle");
    }

    async function runTest() {
        setTest("testing");
        setTestError("");
        try {
            await testConnection(config);
            setTest("ok");
        } catch (err) {
            setTest("error");
            setTestError(err instanceof Error ? err.message : "Connection failed");
        }
    }

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
            <h2 className="font-display text-xl font-semibold text-strong">Connect a model</h2>
            <p className="text-base text-muted mt-[6px] mb-[18px] leading-[1.55]">
                Navi talks to any OpenAI-compatible endpoint. Pick a preset or enter your own. Everything stays on this
                device.
            </p>

            <div className="flex gap-2 mb-[18px]">
                {PRESETS.map(preset => {
                    const on = activePreset?.id === preset.id;
                    return (
                        <button
                            type="button"
                            key={preset.id}
                            onClick={() => applyPreset(preset)}
                            className={`flex-1 flex items-center gap-2 p-[10px] rounded-md border cursor-pointer text-left transition duration-[120ms] ease-[var(--ease-out)] ${
                                on
                                    ? "border-accent-line bg-accent-soft"
                                    : "border-line bg-surface-card hover:border-line-strong"
                            }`}>
                            <Icon
                                name={preset.icon}
                                size={15}
                            />
                            <div className="min-w-0">
                                <div className="text-sm font-medium text-strong truncate">{preset.label}</div>
                                <div className="text-2xs text-muted font-mono truncate">{preset.sub}</div>
                            </div>
                        </button>
                    );
                })}
            </div>

            <label className="block text-sm font-medium text-body mb-[7px]">Endpoint URL</label>
            <Input
                icon="link"
                value={config.baseURL}
                onChange={e => patch({ baseURL: e.target.value })}
            />

            <label className="block text-sm font-medium text-body mt-3 mb-[7px]">Model</label>
            <Input
                icon="cpu"
                value={config.model}
                onChange={e => patch({ model: e.target.value })}
            />

            <label className="block text-sm font-medium text-body mt-3 mb-[7px]">
                API key{!activePreset?.requiresKey && <span className="text-faint font-normal"> · optional</span>}
            </label>
            <APIKeyInput
                value={config.apiKey}
                onChange={e => patch({ apiKey: e.target.value })}
            />

            {activePreset?.id === "gemini" && test === "idle" && (
                <>
                    <div className="h-2" />
                    <Banner
                        tone="info"
                        title="Where do I find this?">
                        Create a key at aistudio.google.com → API keys.
                    </Banner>
                </>
            )}

            <div className="flex items-center gap-3 mt-3">
                <Button
                    variant="secondary"
                    size="sm"
                    icon="plug-zap"
                    disabled={!ready || test === "testing"}
                    onClick={runTest}>
                    {test === "testing" ? "Testing…" : "Test connection"}
                </Button>
                {test === "ok" && (
                    <StatusDot
                        tone="success"
                        pulse>
                        Connected · {config.model}
                    </StatusDot>
                )}
                {test === "error" && <StatusDot tone="error">Failed</StatusDot>}
            </div>
            {test === "error" && testError && (
                <div className="text-2xs text-error font-mono mt-2 break-words">{testError}</div>
            )}

            <div className="mt-[22px]">
                <Button
                    variant="primary"
                    full
                    disabled={!ready}
                    iconRight="arrow-right"
                    onClick={() => onDone(config)}>
                    Start using Navi
                </Button>
            </div>
        </div>
    );
}
