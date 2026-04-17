
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://aldqfugte6nbytqsnovt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public');

  if (error) {
    // If information_schema is restricted, try a known table to see if we can at least connect
    console.log("Could not access information_schema. Trying direct queries on suspected tables...");
    const tablesToCheck = ['fights', 'challenges', 'desafios', 'arena_challenges', 'arena_desafios'];
    for (const table of tablesToCheck) {
      const { error: tableError } = await supabase.from(table).select('*').limit(1);
      if (!tableError) {
        console.log(`Table exists: ${table}`);
      } else {
        console.log(`Table error (${table}): ${tableError.message}`);
      }
    }
  } else {
    console.log("Tables in public schema:");
    data.forEach(t => console.log(`- ${t.table_name}`));
  }
}

listTables();
