import type { IconName } from "@/components";

/** A fully-resolved connection to an OpenAI-compatible chat endpoint. */
export interface ProviderConfig {
    /** Base URL of the OpenAI-compatible API (must end where `/chat/completions` is appended). */
    baseURL: string;
    /** Model identifier passed to the endpoint. */
    model: string;
    /** API key — may be empty for keyless local/self-hosted servers. */
    apiKey: string;
}

/** A ready-made starting point the user can pick and then tweak. */
export interface ProviderPreset {
    id: string;
    label: string;
    sub: string;
    icon: IconName;
    baseURL: string;
    model: string;
    /** Whether this endpoint needs an API key to be usable. */
    requiresKey: boolean;
}

export const PRESETS: ProviderPreset[] = [
    {
        id: "gemini",
        label: "Gemini 2.5 Flash",
        sub: "Google · cloud",
        icon: "sparkles",
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
        model: "gemini-2.5-flash",
        requiresKey: true,
    },
    {
        id: "qwen",
        label: "Qwen 3.6 35B",
        sub: "Self-hosted · 116.74.252.63:65535",
        icon: "cpu",
        baseURL: "http://116.74.252.63:65535/v1",
        model: "qwen-3.6-35b-a3b-abliterated-heretic",
        requiresKey: false,
    },
];

export const DEFAULT_CONFIG: ProviderConfig = {
    baseURL: PRESETS[0].baseURL,
    model: PRESETS[0].model,
    apiKey: "",
};

/** Find the preset whose endpoint + model match `config`, if any (key is ignored). */
export function matchPreset(config: ProviderConfig): ProviderPreset | undefined {
    return PRESETS.find(p => p.baseURL === config.baseURL && p.model === config.model);
}

/** True when the config has everything it needs to make a request. */
export function isConfigReady(config: ProviderConfig): boolean {
    if (!config.baseURL.trim() || !config.model.trim()) return false;
    const preset = matchPreset(config);
    if (preset?.requiresKey && !config.apiKey.trim()) return false;
    return true;
}
