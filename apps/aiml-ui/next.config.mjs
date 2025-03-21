import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@codemirror/lang-json',
    '@uiw/codemirror-theme-github',
    '@uiw/react-codemirror',
    '@xyflow/react',
  ],
  webpack(config, { isServer }) {
    if (!isServer) {
      config.output.globalObject = 'self';
    }
    config.module.rules.push({
      test: /\.svg$/i,
      include: [path.resolve('./public')],
      issuer: /\.[jt]sx?$/,
      use: [
        {
          loader: '@svgr/webpack',
          options: {
            typescript: true,
            icon: true,
          },
        },
      ],
    });
    config.module.rules.push({
      test: /\.svg$/i,
      include: [path.resolve('./src')],
      type: 'asset',
    });
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset',
    });
    config.module.rules.push({
      test: new RegExp(`syntaxes/.*\.json$`),
      type: 'asset',
    });
    config.module.rules.push({
      test: new RegExp(`shiki/.*\.json$`),
      type: 'asset',
    });
    config.module.rules.push({
      test: new RegExp(`.*\.tmLanguage$`),
      type: 'asset/resource',
    });

    config.experiments = {
      asyncWebAssembly: true,
      layers: true,
    };

    return config;
  },
};

export default nextConfig;
