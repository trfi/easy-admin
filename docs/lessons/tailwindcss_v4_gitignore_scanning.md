# Tailwind CSS v4 Ignoring Gitignored Files

## Context
When migrating to or building with Tailwind CSS v4, the automatic source scanner relies on the project's `.gitignore` rules to filter files. It will silently skip compiling classes for any file or directory that is ignored by Git.

## Problem
In our Vite/React project, `web/src/components/*` was present in the root `.gitignore` file. As a result:
1. Tailwind v4's automatic file scanning completely bypassed the `web/src/components/` directory.
2. Utility classes defined in our React components (such as `bg-primary`, `text-primary-foreground`, `sr-only`, `bg-muted`, etc.) were missing from the compiled output CSS bundle.
3. This led to elements (like the sidebar, tables, and buttons) being completely unstyled or layout-broken on the screen, while some global styles (like base resets or colors mapped via dark mode variables) worked.

## Solution
To prevent this problem:
1. **Remove active source folders from `.gitignore`**: Make sure directories containing code templates that use Tailwind classes are not ignored.
2. **Explicitly register sources using `@source`**: In the main CSS entry point (`index.css`), use the `@source` directive to specify directories or files to scan. This acts as an explicit override so Tailwind will scan the files even if they are in `.gitignore`.
   ```css
   @import "tailwindcss";
   
   @source "./**/*.{ts,tsx}";
   ```
3. **Plugin order in Vite**: Ensure the `@tailwindcss/vite` plugin is placed **before** the `react()` plugin in `vite.config.ts` so that classes are detected in raw source files before React compilation.
   ```typescript
   export default defineConfig({
     plugins: [tailwindcss(), react()],
   })
   ```
