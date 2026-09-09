/** @type {import('next').NextConfig} */
const nextConfig = {
  // Nothing exotic here on purpose. No HTTPS assumptions, no basePath, so
  // http://<your-laptop-ip>:3000 works as-is for testing from a phone on the
  // same network.
};

export default nextConfig;
