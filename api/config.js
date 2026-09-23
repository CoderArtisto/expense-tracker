// Vercel serverless function. SUPABASE_ANON_KEY is intentionally returned:
// Supabase publishable/anon keys are designed for browser use with RLS enabled.
module.exports = function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  response.status(200).json({
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || ''
  });
};
