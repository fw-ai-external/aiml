/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@codemirror/lang-json",
    "@uiw/codemirror-theme-github",
    "@uiw/react-codemirror",
    "@xyflow/react",
  ],
};

export default nextConfig;
