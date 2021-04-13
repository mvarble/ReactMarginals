module.exports = {
  mode: 'development',
  entry: './src.jsx',
  output: {
    path: __dirname,
    filename: 'index.js',
    libraryTarget: 'commonjs2',
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
};
