import z from "zod";

export const ChatSchema = z.object({
    id: z.uuidv4(),
    createdAt: z.coerce.date<string>(),
    updatedAt: z.coerce.date<string>(),
    title: z.string().max(1024),
});
