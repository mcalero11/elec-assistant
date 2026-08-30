import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // PRD: static export, no backend. Everything must be computable client-side.
  output: 'export',
  // Emit route/index.html so plain static file servers resolve /route/ URLs.
  trailingSlash: true,
  // Workspace packages export raw TypeScript (./src/index.ts) — Next compiles them.
  transpilePackages: ['@nec-assistant/engine', '@nec-assistant/data'],
  images: { unoptimized: true },
  webpack: (config) => {
    // The engine/data packages use Node-ESM style `.js` extensions on relative
    // TypeScript imports; map them back to the .ts sources for bundling.
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js'],
    }
    return config
  },
}

export default nextConfig
