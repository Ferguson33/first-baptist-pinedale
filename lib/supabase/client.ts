import { createBrowserClient } from '@supabase/ssr'

/**
 * Ultra-robust singleton for the Supabase browser client.
 * 
 * We store on globalThis so that even if Next.js / Turbopack / Webpack
 * code-splits this module into multiple chunks (very common), we still
 * only ever create ONE GoTrueClient for the storage key.
 *
 * This is the pattern needed to silence the "Multiple GoTrueClient instances"
 * warning when you have an AuthProvider + multiple client pages.
 */
const GLOBAL_KEY = '__sb_browser_client__' as const

type BrowserClient = ReturnType<typeof createBrowserClient>

export function createClient(): BrowserClient {
  const g = globalThis as any

  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieOptions: {
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
        },
      }
    )
  }

  return g[GLOBAL_KEY]
}