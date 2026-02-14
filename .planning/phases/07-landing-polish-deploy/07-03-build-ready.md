# Plan 07-03: Build Ready + Cloudflare Workers Config

## Goal
Ensure the project builds cleanly and is configured for Cloudflare Workers deployment.

## Changes

### 1. Add @astrojs/cloudflare adapter
- Install adapter package
- Configure astro.config.mjs for Cloudflare Workers output
- Add wrangler.toml with basic config (but DO NOT deploy)

### 2. Build verification
- Run `astro build` and fix any errors
- Verify output directory structure
- Check asset sizes (target <3MB initial payload)

### 3. Production optimizations in astro.config.mjs
- Ensure Phaser chunk splitting is optimal
- Verify no dev-only code leaks into production build

## Success Criteria
- `astro build` succeeds with zero errors
- Cloudflare Workers adapter configured
- wrangler.toml present and valid
- Build output is deploy-ready
