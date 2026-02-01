export const env = {
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || 'https://tiaojwumxgdnobknlyqp.supabase.co',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpYW9qd3VteGdkbm9ia25seXFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTEwNzIsImV4cCI6MjA4MTA2NzA3Mn0.K-FP686ddEyUKoFS9BHQ4rWc1bbn2IQ6OAY1y4WLMx8',
  },
  chatEngine: {
    baseUrl: import.meta.env.VITE_CHAT_ENGINE_URL || '',
    enabled: !!import.meta.env.VITE_CHAT_ENGINE_URL,
  },
} as const;
