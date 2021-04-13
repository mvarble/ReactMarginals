const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './src.jsx',
  output: {
    path: __dirname,
    filename: 'bundle.js',
  },
  module: {
    rules: [{ 
      test: /\.jsx?$/, 
      exclude: /node_modules/,
      use: {
        loader: 'babel-loader',
        options: { presets: ['@babel/preset-env', '@babel/preset-react'] },
      },
    }],
  },
  plugins: [new HtmlWebpackPlugin()],
  resolve: {
    alias: { 
      react: require.resolve('./node_modules/react'),
      ['react-dom']: require.resolve('./node_modules/react-dom'),
    },
  },
  devServer: {
    contentBase: __dirname,
    compress: true,
    port: 6969,
    hot: true,
  },
}
