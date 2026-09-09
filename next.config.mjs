/** @type {import('next').NextConfig} */
const nextConfig = {
  // Nothing exotic here on purpose. No HTTPS assumptions, no basePath,
  // so the ESP32 can hit http://<your-laptop-ip>:3000 directly.
};

export default nextConfig;
