import { defineConfig } from "@rspack/cli"

export default defineConfig({
  entry: "./src/index.ts",
  target: "node",
  devtool: "source-map",
  output: {
    path: __dirname + "/dist",
    filename: "index.js",
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
