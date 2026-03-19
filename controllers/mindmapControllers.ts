import { Request, Response } from "express";
import { callLLM } from "../services/llmService.js";
import { supabase } from "../index.js";

export const generateRoot = async (req: Request, res: Response) => {
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
  Create a low-level mind map based on the content below.

  Return strictly valid JSON matching this React Flow format exactly:
  {
    "nodes": [
      {
        "id": "1",
        "position": { "x": 0, "y": 0 },
        "data": { "label": "Main Topic" }
      }
    ],
    "edges": [
      {
        "id": "e1-2",
        "source": "1",
        "target": "2"
      }
    ]
  }

  IMPORTANT:
  1. Space out the nodes in the "position" field intelligently so they don't overlap (e.g., use spacing of 150-300 pixels horizontally and vertically).
  2. The root node should be in the center, and children spreading out.
  3. Every node must have "id", "position": {"x", "y"}, and "data": {"label"}.

  Content:
  ${content}
  `;

    const LLMData = await callLLM(prompt);
    res.json(LLMData);
  } catch (err) {
    console.error("generateRoot error:", err);
    res.status(500).json({ error: "Failed to generate mind map" });
  }
};

export const expandNode = async (req: Request, res: Response) => {
  const { nodeLabel, context } = req.body;

  const prompt = `
  Expand "${nodeLabel}" into 4-6 subtopics.

  Avoid duplicates.

  Return JSON:
  { "nodes": [], "edges": [] }

  Context:
  ${context}
  `;

  const data = await callLLM(prompt);
  res.json(data);
};

export const askNode = async (req: Request, res: Response) => {
  const { nodeLabel, context } = req.body;

  const prompt = `
  Explain "${nodeLabel}" simply with examples.

  Context:
  ${context}
  `;

  const answer = await callLLM(prompt);
  res.json({ answer });
};