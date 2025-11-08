const path = require("path");

module.exports = {
  entry: "./src/react/index.ts",
  output: {
    filename: "react.js",
    path: path.resolve(__dirname, "dist"),
    library: {
      name: "HashConnectReact",
      type: "umd",
    },
    globalObject: "this",
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },
  externals: {
    react: {
      commonjs: "react",
      commonjs2: "react",
      amd: "react",
      root: "React",
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

