import { join, resolve } from 'node:path'
import type { Hono } from 'hono'
import type { AppEnv } from './app'

// Serves the built web bundle as an SPA fallback. Mounted AFTER the /api routes
// in index.ts, so API requests are matched first and never shadowed here.
// Only used in production (Docker); in dev, Vite serves the frontend and proxies /api.
export function mountStatic(app: Hono<AppEnv>, distDir: string): void {
  const root = resolve(distDir)
  const indexPath = join(root, 'index.html')

  app.get('/*', async (c, next) => {
    const pathname = new URL(c.req.url).pathname

    // API routes are registered earlier; defer so unknown /api paths 404 as JSON
    // instead of being served the SPA shell.
    if (pathname.startsWith('/api/')) return next()

    // Resolve the requested path and confirm it stays inside the bundle dir —
    // blocks `../` traversal out of the public root.
    const requested = resolve(join(root, pathname))
    if (requested !== root && !requested.startsWith(root + '/') && !requested.startsWith(root + '\\')) {
      return next()
    }

    if (pathname !== '/') {
      const file = Bun.file(requested)
      if (await file.exists()) {
        // Vite emits content-hashed asset filenames, so they're safe to cache forever.
        const immutable = pathname.startsWith('/assets/')
        return new Response(file, {
          headers: immutable
            ? { 'cache-control': 'public, max-age=31536000, immutable' }
            : {},
        })
      }
    }

    // SPA fallback: every client-side route gets index.html (never cached, so
    // deploys ship a fresh asset manifest immediately).
    const index = Bun.file(indexPath)
    if (await index.exists()) {
      return new Response(index, {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-cache',
        },
      })
    }
    return next()
  })
}
