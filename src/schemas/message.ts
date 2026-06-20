import z from "zod";

export const MessageSchema = z.object({
    chatID: z.uuidv4(),
});
