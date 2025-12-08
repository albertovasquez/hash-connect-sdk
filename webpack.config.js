const path = require("path");

/**
 * HashConnect SDK v3 - React-Only Build
 * 
 * Single webpack config for the React-only SDK.
 * The vanilla JS entry point has been removed.
 */
module.exports = {
  entry: "./src/react/index.ts",
  output: {
    filename: "hash-connect.js",
    path: path.resolve(__dirname, "dist"),
    library: {
      name: "HashConnect",
      type: "umd",
    },
    globalObject: "this",
    clean: true, // Clean dist folder before build
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },
  externals: {
    // React must be provided by the consuming app
    react: {
      commonjs: "react",
      commonjs2: "react",
      amd: "react",
      root: "React",
    },
    "react-dom": {
      commonjs: "react-dom",
      commonjs2: "react-dom",
      amd: "react-dom",
      root: "ReactDOM",
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
};
