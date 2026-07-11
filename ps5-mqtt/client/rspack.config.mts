import { HtmlRspackPlugin, CopyRspackPlugin } from "@rspack/core"
import { defineConfig } from "@rspack/cli"
import { ReactRefreshRspackPlugin } from "@rspack/plugin-react-refresh"

const isDev = process.env.NODE_ENV === "development"

export default defineConfig({
  entry: "./src/client.tsx",
  target: "web",
  devtool: "source-map",
  output: {
    path: __dirname + "/dist",
    filename: "client.js",
  },
  performance: { hints: false },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: "builtin:swc-loader",
          options: {
            jsc: {
              parser: { syntax: "typescript", tsx: true },
              transform: {
                react: {
                  runtime: "classic",
                  development: isDev,
                  refresh: isDev,
                },
              },
              target: "es2020",
            },
          },
        },
      },
    ],
  },
  plugins: [
    new HtmlRspackPlugin({ template: "./src/index.html" }),
    new CopyRspackPlugin({ patterns: [{ from: "src/img", to: "img" }] }),
    isDev && new ReactRefreshRspackPlugin(),
  ].filter(Boolean),
  devServer: {
    port: 8080,
    hot: true,
    proxy: [
      {
        context: ["/api"],
        target: process.env.BACKEND_URL ?? "http://localhost:3000",
      },
    ],
  },
})
