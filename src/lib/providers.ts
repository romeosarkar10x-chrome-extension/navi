import type { IconName } from "@/components/index";

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
}

export const PRESETS: ProviderPreset[] = [
    {
        id: "gemini",
        label: "Gemini 2.5 Flash",
        sub: "generativelanguage.googleapis.com",
        icon: "sparkles",
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
        model: "gemini-2.5-flash",
    },
    {
        id: "qwen",
        label: "Qwen 3.6 35B",
        sub: "116.74.252.63:65535",
        icon: "cpu",
        baseURL: "http://116.74.252.63:65535/v1",
        model: "qwen-3.6-35b-a3b-abliterated-heretic",
    },
];

export const DEFAULT_CONFIG: ProviderConfig = {
    baseURL: "",
    model: "",
    apiKey: "",
};

/** Find the preset whose endpoint + model match `config`, if any (key is ignored). */
export function matchPreset(config: ProviderConfig): ProviderPreset | undefined {
    return PRESETS.find(p => p.baseURL === config.baseURL && p.model === config.model);
}

/**
 * True when the config has everything it needs to make a request.
 * Every provider is just an endpoint + model; the API key is optional since some
 * endpoints (e.g. self-hosted) accept requests without one.
 */
export function isConfigReady(config: ProviderConfig): boolean {
    return Boolean(config.baseURL.trim() && config.model.trim());
}
