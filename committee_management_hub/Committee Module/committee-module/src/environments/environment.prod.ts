export const environment = {
  production: true,
  /** Express API is not on Vercel — leave empty to use Supabase password reset in production. */
  apiUrl: '',
  /** Send forgot-password / recovery emails via Supabase (works on Vercel without a separate API). */
  useSupabasePasswordReset: true,
  appUrl: 'https://committee-management-ten.vercel.app',
  supabase: {
    url: 'https://lvinxglqpdrljtqwuqrm.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2aW54Z2xxcGRybGp0cXd1cXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNDM3NDUsImV4cCI6MjA5MzgxOTc0NX0.zZ8mhsuhWbhfPEjrEz1OwkbtnlF5dWtMVGeiHXU5uJI',
  },
};
