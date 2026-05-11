import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lvinxglqpdrljtqwuqrm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2aW54Z2xxcGRybGp0cXd1cXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNDM3NDUsImV4cCI6MjA5MzgxOTc0NX0.zZ8mhsuhWbhfPEjrEz1OwkbtnlF5dWtMVGeiHXU5uJI'
);

async function main() {
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) console.error(error);
  console.log(JSON.stringify(data, null, 2));
}

main();
