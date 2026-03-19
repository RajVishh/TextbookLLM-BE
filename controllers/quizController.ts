import { Request, Response } from "express";
import { callLLM } from "../services/llmService.js";
import { supabase } from "../index.js";

export const generateQuiz = async (req: Request, res: Response) => {
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

        const content = data.map((d: any) => d.content).join("\n");

        if (!content) {
            return res.status(404).json({ error: "No documents found for this chat" });
        }

        const prompt = `
  Generate a 10-question multiple choice quiz from this content.

  Return strictly valid JSON matching this format exactly:
{
  "quiz": [
    {
      "question": "What is React?",
      "options": ["A library for building user interfaces", "A database", "A CSS framework", "A programming language"],
      "answer": "A library for building user interfaces"
    }
  ]
}

  Content:
  ${content}
  `;

        const LLMData = await callLLM(prompt);
        res.json(LLMData);
    } catch (err) {
        console.error("generateQuiz error:", err);
        res.status(500).json({ error: "Failed to generate quiz" });
    }
};
