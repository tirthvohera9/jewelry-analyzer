import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['dxf-writer'],
  experimental: {
    serverActions: { bodySizeLimit: '11mb' },
  },
}

export default nextConfig
