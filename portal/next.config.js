/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    '/api/admin/contract': ['./assets/logo-mark.png'],
  },
};

module.exports = nextConfig;
