import OpenAI from "openai";
import type { ProviderConfig } from "./agent/providers";

/** A plain-text chat turn sent to the model — distinct from the UI's ChatTurn. */
export interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

function createClient(config: ProviderConfig): OpenAI {
    return new OpenAI({
        // Keyless endpoints still need a non-empty string for the SDK's auth header.
        apiKey: config.apiKey.trim() || "not-needed",
        baseURL: config.baseURL.trim(),
        // Required to run inside the extension's side panel (a browser context).
        dangerouslyAllowBrowser: true,
    });
}

/**
 * Stream a chat completion, invoking `onToken` for each text delta.
 * Resolves with the full assembled text. Pass `signal` to cancel mid-stream.
 */
export async function streamChat(
    config: ProviderConfig,
    messages: ChatMessage[],
    onToken: (delta: string) => void,
    signal?: AbortSignal,
): Promise<string> {
    const client = createClient(config);

    const stream = await client.chat.completions.create(
        {
            model: config.model.trim(),
            messages,
            stream: true,
        },
        { signal },
    );

    let full = "";
    for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
            full += delta;
            onToken(delta);
        }
    }
    return full;
}

/** Non-streaming completion — returns the full assistant text. Used by the agent loop. */
export async function chatComplete(
    config: ProviderConfig,
    messages: ChatMessage[],
    signal?: AbortSignal,
): Promise<string> {
    const client = createClient(config);
    const completion = await client.chat.completions.create(
        {
            model: config.model.trim(),
            messages,
            stream: false,
        },
        { signal },
    );
    return completion.choices[0]?.message?.content ?? "";
}

/** Fetch the model IDs the endpoint exposes (`GET /models`), sorted. Throws on failure. */
export async function listModels(config: ProviderConfig, signal?: AbortSignal): Promise<string[]> {
    const client = createClient(config);
    const page = await client.models.list({ signal });
    return page.data.map(m => m.id).sort();
}

/** Make a minimal request to verify the endpoint, model, and key are valid. Throws on failure. */
export async function testConnection(config: ProviderConfig): Promise<void> {
    const client = createClient(config);
    await client.chat.completions.create({
        model: config.model.trim(),
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
    });
}
