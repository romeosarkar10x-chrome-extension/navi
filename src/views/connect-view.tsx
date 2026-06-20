import { useCallback, useEffect, useRef, useState } from "react";
import { APIKeyInput, Banner, Button, Dropdown, Icon, Input, StatusDot } from "@/components/index";
import { isConfigReady, matchPreset, PRESETS, type ProviderConfig, type ProviderPreset } from "@/lib/providers";
import { listModels, testConnection } from "@/lib/chat-client";

type TestState = "idle" | "testing" | "ok" | "error";
type ModelsState = "idle" | "loading" | "ok" | "error";

export interface ConnectViewProps {
    initialConfig: ProviderConfig;
    onBack: () => void;
    onDone: (config: ProviderConfig) => void;
}

export function ConnectView({ initialConfig, onBack, onDone }: ConnectViewProps) {
    const [config, setConfig] = useState<ProviderConfig>(initialConfig);
    const [test, setTest] = useState<TestState>("idle");
    const [testError, setTestError] = useState("");
    const [models, setModels] = useState<string[]>([]);
    const [modelsState, setModelsState] = useState<ModelsState>("idle");
    const [modelsError, setModelsError] = useState("");
    const abortRef = useRef<AbortController | null>(null);
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

    // Pull the endpoint's model list so the user picks from what's actually available
    // instead of typing a name by hand. Keyed on endpoint + key; model is chosen here.
    const loadModels = useCallback(async (baseURL: string, apiKey: string) => {
        if (!baseURL.trim()) return;
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setModelsState("loading");
        setModelsError("");
        try {
            const ids = await listModels({ baseURL, apiKey, model: "" }, controller.signal);
            if (controller.signal.aborted) return;
            setModels(ids);
            setModelsState("ok");
            // Keep the chosen model if the endpoint offers it; otherwise default to the first.
            setConfig(c => (ids.includes(c.model) ? c : { ...c, model: ids[0] ?? c.model }));
        } catch (err) {
            if (controller.signal.aborted) return;
            setModels([]);
            setModelsState("error");
            setModelsError(err instanceof Error ? err.message : "Couldn't list models");
        }
    }, []);

    // Auto-fetch on mount and whenever the endpoint or key settles (debounced past typing).
    useEffect(() => {
        const t = setTimeout(() => loadModels(config.baseURL, config.apiKey), 350);
        return () => clearTimeout(t);
    }, [config.baseURL, config.apiKey, loadModels]);

    // Drop any in-flight request if the view unmounts.
    useEffect(() => () => abortRef.current?.abort(), []);

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

            <div className="flex items-center justify-between mt-3 mb-[7px]">
                <label className="block text-sm font-medium text-body">Model</label>
                <button
                    type="button"
                    onClick={() => loadModels(config.baseURL, config.apiKey)}
                    disabled={!config.baseURL.trim() || modelsState === "loading"}
                    className="inline-flex items-center gap-[5px] text-2xs font-ui text-muted cursor-pointer hover:text-strong disabled:opacity-50 disabled:cursor-default">
                    <Icon
                        name="loader"
                        size={12}
                        className={modelsState === "loading" ? "animate-spin" : ""}
                    />
                    {modelsState === "loading" ? "Loading…" : "Refresh"}
                </button>
            </div>
            {modelsState === "ok" && models.length > 0 ? (
                <Dropdown
                    value={config.model}
                    options={models}
                    onChange={value => patch({ model: value })}
                />
            ) : (
                <Input
                    icon="cpu"
                    value={config.model}
                    placeholder={modelsState === "loading" ? "Loading models…" : "Enter a model name"}
                    onChange={e => patch({ model: e.target.value })}
                />
            )}
            {modelsState === "error" && modelsError && (
                <div className="text-2xs text-muted font-mono mt-2 break-words">
                    Couldn’t list models — enter one manually. {modelsError}
                </div>
            )}

            <label className="block text-sm font-medium text-body mt-3 mb-[7px]">
                API key<span className="text-faint font-normal"> · optional</span>
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
