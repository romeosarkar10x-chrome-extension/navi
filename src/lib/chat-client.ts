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

/** A single tool call the model asked for, assembled from streamed deltas. */
export interface ToolCall {
    id: string;
    name: string;
    arguments: string;
}

/** The outcome of one agent turn: spoken text, optional reasoning, and any tool calls. */
export interface AgentTurnResult {
    content: string;
    reasoning: string;
    toolCalls: ToolCall[];
}

export interface AgentTurnHandlers {
    /** A chunk of the assistant's spoken text (the final answer when no tools are called). */
    onContent?: (delta: string) => void;
    /** A chunk of the model's reasoning, when the endpoint streams a separate reasoning field. */
    onReasoning?: (delta: string) => void;
}

/**
 * Stream one agent turn with tool calling enabled. Surfaces `content` and
 * `reasoning` deltas live and assembles streamed `tool_calls` by index,
 * resolving with the complete turn once the stream ends.
 */
export async function streamAgentTurn(
    config: ProviderConfig,
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    tools: OpenAI.Chat.Completions.ChatCompletionTool[],
    handlers: AgentTurnHandlers,
    signal?: AbortSignal,
): Promise<AgentTurnResult> {
    const client = createClient(config);

    const stream = await client.chat.completions.create(
        {
            model: config.model.trim(),
            messages,
            tools,
            tool_choice: "auto",
            stream: true,
        },
        { signal },
    );

    let content = "";
    let reasoning = "";
    const acc = new Map<number, ToolCall>();

    for await (const chunk of stream) {
        // `reasoning_content`/`reasoning` are non-standard fields some endpoints
        // (e.g. Qwen, DeepSeek) emit; they aren't in the SDK's typed delta.
        const delta = chunk.choices[0]?.delta as
            | (OpenAI.Chat.Completions.ChatCompletionChunk.Choice.Delta & {
                  reasoning_content?: string;
                  reasoning?: string;
              })
            | undefined;
        if (!delta) continue;

        if (delta.content) {
            content += delta.content;
            handlers.onContent?.(delta.content);
        }
        const reasoningDelta = delta.reasoning_content ?? delta.reasoning;
        if (reasoningDelta) {
            reasoning += reasoningDelta;
            handlers.onReasoning?.(reasoningDelta);
        }
        for (const tc of delta.tool_calls ?? []) {
            const cur = acc.get(tc.index) ?? { id: "", name: "", arguments: "" };
            if (tc.id) cur.id = tc.id;
            if (tc.function?.name) cur.name = tc.function.name;
            if (tc.function?.arguments) cur.arguments += tc.function.arguments;
            acc.set(tc.index, cur);
        }
    }

    const toolCalls = [...acc.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v);
    return { content, reasoning, toolCalls };
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
