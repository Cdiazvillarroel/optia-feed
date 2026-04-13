import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // During static build, env vars may not be available
    // Return a placeholder client that won't be used for actual requests
    return createBrowserClient(
      'https://placeholder.supabase.co',
      'placeholder-key-for-build-only'
    )
  }

  return createBrowserClient(url, key)
}
