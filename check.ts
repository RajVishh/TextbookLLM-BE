import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const { data, error } = await supabase.from('messages').insert({
    chat_id: 'eed28bad-bd88-480c-b0a1-e2912da13d64',
    role: 'system',
    content: '__FILE_UPLOAD__:test.pdf'
  });
  console.log('Error:', error);
  console.log('Insert Data:', data);

  const { data: d, error: e } = await supabase.from('messages').select('*').limit(1).eq('role', 'system');
  console.log('Fetch DB error:', e);
  console.log('Fetch Data:', d);
}

testInsert();
