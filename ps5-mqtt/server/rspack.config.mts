import { defineConfig } from "@rspack/cli"

export default defineConfig({
  entry: {
    index: "./src/index.ts",
    // Tiny shim preloaded into every `playactor` child process, see
    // src/playactor/preload.ts. Emitted as dist/playactor-preload.js next to
    // index.js so src/playactor/client.ts can locate it via __dirname.
    "playactor-preload": "./src/playactor/preload.ts",
  },
  target: "node",
  devtool: "source-map",
  output: {
    path: __dirname + "/dist",
    filename: "[name].js",
    library: { type: "commonjs2" },
  },
  externalsPresets: { node: true },
  externals: [
    ({ request }, callback) => {
      if (request && !request.startsWith(".") && !request.startsWith("/")) {
        return callback(undefined, `commonjs ${request}`)
      }
      callback()
    },
  ],
  resolve: {
    extensions: [".ts", ".js", ".json"],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: {
          loader: "builtin:swc-loader",
          options: {
            jsc: {
              parser: { syntax: "typescript" },
              target: "es2020",
            },
          },
        },
      },
    ],
  },
})
