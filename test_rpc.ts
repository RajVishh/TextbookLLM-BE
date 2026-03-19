import { createClient } from '@supabase/supabase-js';
import dotenv from "dotenv";
import { getEmbedding } from "./utils/embedding.js";
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL || "", process.env.SUPABASE_KEY || "");

async function run() {
  const embedding = await getEmbedding("what is react ?");
  const { data, error } = await supabase.rpc("match_embeddings", {
      query_embedding: embedding,
      match_count: 5,
      match_threshold: 0.50,
      p_chat_id: 'eed28bad-bd88-480c-b0a1-e2912da13d64' // Using one of the chat_ids from the previous test
  });
  console.log("Matches:", data ? data.length : 0);
  console.dir(data, { depth: null });
  if (error) console.error("Error:", error);
}
run();
