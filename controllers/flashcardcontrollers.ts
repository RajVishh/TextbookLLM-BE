import { Request, Response } from "express";
import { callLLM } from "../services/llmService.js";
import { supabase } from "../index.js";

export const generateFlashcards = async (req: Request, res: Response) => {
    const { chatId }: any = req.body;

    if (!chatId) {
        return res.status(400).json({ error: "chatId is required" });
    }

    try {
        const { data, error } = await supabase
            .from("documents")
            .select("content")
            .eq("chat_id", chatId);

        if (error) {
            console.error("Supabase error:", error);
            return res.status(500).json({ error: error.message });
        }

        const content = data.map(d => d.content).join("\n");

        if (!content) {
            return res.status(404).json({ error: "No documents found for this chat" });
        }

        const prompt = `
  Generate 20 flashcards from this content

  Return strictly valid JSON matching this format exactly:
{
  "flashcards": [
    {
      "question": "What is OAuth?",
      "answer": "An authorization protocol..."
    }
  ]
}

  Content:
  ${content}
  `;

        const LLMData = await callLLM(prompt);
        res.json(LLMData);
    } catch (err) {
        console.error("generateFlashCard error:", err);
        res.status(500).json({ error: "Failed to generate flashcards" });
    }
};