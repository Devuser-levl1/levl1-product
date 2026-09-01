import { config as loadEnv } from 'dotenv'
import { defineConfig } from 'prisma/config'

// Prisma config (replaces the deprecated `package.json#prisma` block).
// NOTE: once a prisma.config.ts exists, Prisma no longer auto-loads .env — so we
// load it here ourselves, matching the app's precedence (.env, then .env.local
// overrides). Paths resolve relative to the CLI's cwd (apps/web).
loadEnv({ path: '.env' })
loadEnv({ path: '.env.local', override: true })

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'ts-node --compiler-options {"module":"CommonJS"} prisma/seed.ts',
  },
})
