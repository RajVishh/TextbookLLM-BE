import { Request, Response } from "express";
import { supabase } from "../index.js";
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

export const generateAudioOverview = async (req: Request, res: Response) => {
    const { chatId }: any = req.body;

    if (!chatId) {
        return res.status(400).json({ error: "chatId is required" });
    }

    try {
        const { data, error } = await supabase
            .from("documents")
            .select("content")
            .eq("chat_id", chatId);

        if (error || !data || data.length === 0) {
            return res.status(404).json({ error: "No documents found for this chat" });
        }

        const content = data.map((d: any) => d.content).join("\n");

        if (!content.trim()) {
            return res.status(404).json({ error: "No documents found for this chat" });
        }

        // 1. Generate text script
        const prompt = `Write a highly engaging, 1-minute podcast or radio-host style summary of the following content. Keep it under 200 words. Speak directly to the listener as if you are a friendly expert explaining the core concepts.\n\nContent:\n${content}`;
        
        const scriptResponse = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }]
        });

        const scriptText = scriptResponse.choices[0].message.content || "Welcome to the summary! Unfortunately, I couldn't generate a script.";

        // 2. Generate Audio via TTS
        const mp3 = await openai.audio.speech.create({
            model: "tts-1",
            voice: "alloy",
            input: scriptText,
        });

        // 3. Send audio stream to client
        const buffer = Buffer.from(await mp3.arrayBuffer());
        
        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Length': buffer.length.toString()
        });
        
        return res.send(buffer);
        
    } catch (err) {
        console.error("generateAudioOverview error:", err);
        res.status(500).json({ error: "Failed to generate audio overview" });
    }
};
