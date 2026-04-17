import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = 'https://vfefztzaiqhpsfnvpkba.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZWZ6dHphaXFocHNmbnZwa2JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzM1MzEsImV4cCI6MjA4NzAwOTUzMX0.G2AVN2yvCaGGtR7fK0nim2eRBAow2C57eeIaOEz1LDQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
  const { data, error } = await supabase.from('user_modalities').select('*').limit(1);
  if (error) {
    console.error('Error fetching user_modalities:', error);
  } else {
    console.log('user_modalities exists. Sample data:', data);
  }

  const { data: fights, error: fightsError } = await supabase.from('fights').select('*').limit(5);
  if (fightsError) {
    console.error('Error fetching fights:', fightsError);
  } else {
    console.log('fights exists. Sample data:', fights);
  }
}

checkTable();
