// Allowed origins for CORS - includes Lovable preview and production domains
const allowedOrigins = [
  'https://lovable.dev',
  'https://preview--bmyoxuiejkvjieoibeys.lovable.app',
  'https://bmyoxuiejkvjieoibeys.lovable.app',
];

// Helper function to get CORS headers based on request origin
export const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get('origin') || '';
  
  // Check if origin is from a Lovable preview/production domain
  const isAllowedOrigin = allowedOrigins.includes(origin) || 
    origin.endsWith('.lovable.app') || 
    origin.endsWith('.lovableproject.com');
  
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
};

// Legacy export for backwards compatibility - uses restrictive default
export const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://bmyoxuiejkvjieoibeys.lovable.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
};
