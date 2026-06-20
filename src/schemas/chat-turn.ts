import { z } from "zod";

/**
 * A persisted chat turn — the durable record of one exchange, keyed to its chat.
 * This is distinct from the UI's `ChatTurn` (see `@/types`), which also models
 * transient render-only state like streaming and collapse.
 */

/** Fields shared by every persisted turn. */
const ChatTurnBaseSchema = z.object({
    chatID: z.uuidv4(),
    /** Whether the turn's card is expanded in the UI. */
    open: z.boolean(),
});

const ChatTurnUserSchema = ChatTurnBaseSchema.extend({
    role: z.literal("user"),
    time: z.coerce.date<string>(),
    text: z.string(),
});

const ChatTurnAssistantSchema = ChatTurnBaseSchema.extend({
    role: z.literal("assistant"),
    startTime: z.coerce.date<string>(),
    endTime: z.coerce.date<string>(),
    text: z.string(),
});

const ChatTurnToolSchema = ChatTurnBaseSchema.extend({
    role: z.literal("tool"),
    /** The tool-call id this result answers. */
    toolCallID: z.string(),
    /** The tool the model invoked (e.g. "click", "fill"). */
    name: z.string(),
    /** Raw JSON arguments the model passed. */
    arguments: z.string(),
    /** The result reported back to the model. */
    result: z.string(),
});

export const ChatTurnSchema = z.discriminatedUnion("role", [
    ChatTurnUserSchema,
    ChatTurnAssistantSchema,
    ChatTurnToolSchema,
]);

export type ChatTurnRecord = z.infer<typeof ChatTurnSchema>;
