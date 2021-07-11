const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const config = {
  entry: {
    bundle: ['./src/index.js'],
  },
  resolve: {
    extensions: ['.mjs', '.js'],
    mainFields: ['browser', 'module', 'main'],
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: 'babel-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
            },
          },
          'postcss-loader',
        ],
      },
      {
        test: /\.svg$/,
        use: 'file-loader',
      },
      {
        test: /\.(png|jpe?g|gif)$/i,
        exclude: [path.resolve(__dirname, 'static')],
        use: [
          {
            loader: 'url-loader',
            options: {},
          },
        ],
      },
      {
        test: /\.(png|jpe?g|gif)$/i,
        include: [path.resolve(__dirname, 'static')],
        use: [
          {
            loader: 'file-loader',
            options: {},
          },
        ],
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin(),
    new HtmlWebpackInlineSourcePlugin(HtmlWebpackPlugin),
    new HtmlWebpackPlugin({
      title: 'Local Twitter Archive Viewer',
      inlineSource: '.(js|css)$',
      filename: 'index.html',
      template: 'src/index.html',
      cache: false,
      minify: {
        html5: true,
        collapseWhitespace: true,
        minifyCSS: true,
        minifyJS: true,
        minifyURLs: false,
        removeAttributeQuotes: true,
        removeComments: true,
        removeEmptyAttributes: true,
        removeOptionalTags: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributese: true,
        useShortDoctype: true,
      },
    }),
    new CleanWebpackPlugin({
      protectWebpackAssets: false,
      cleanAfterEveryBuildPatterns: ['bundle.js', 'bundle.css'],
    }),
  ],
  devServer: {
    contentBase: path.join(__dirname, 'dist'),
  },
};

module.exports = config;
