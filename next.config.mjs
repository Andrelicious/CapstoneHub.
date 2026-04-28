import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "30mb",
    },
    proxyClientMaxBodySize: "30mb",
  },
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: __dirname,
  },
  // Configure webpack to handle tesseract.js worker files in serverless
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Mark tesseract.js as external to prevent bundling issues with workers
      if (!config.externals) config.externals = []
      if (typeof config.externals !== 'function') {
        config.externals.push('tesseract.js')
      }
    }
    return config
  },
}

export default nextConfig
