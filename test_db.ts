import { createClient } from '@supabase/supabase-js';
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL || "", process.env.SUPABASE_KEY || "");

async function run() {
  const { data, error } = await supabase.from('documents').select('id, chat_id, content').order('id', { ascending: false }).limit(2);
  console.log("Recent Documents:");
  console.dir(data, { depth: null });
  if (error) console.error("Error:", error);
}
run();
