/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.aboutyou.ro' },
      { protocol: 'https', hostname: '*.zalando.ro' },
      { protocol: 'https', hostname: 'cdn.aboutstatic.com' },
      { protocol: 'https', hostname: 'img.aboutstatic.com' },
    ],
  },
  // Required for Stripe webhook raw body
  async headers() {
    return [
      {
        source: '/api/webhook',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
      },
    ]
  },
}

module.exports = nextConfig
