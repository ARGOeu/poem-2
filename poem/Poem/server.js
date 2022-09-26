const path = require('path');

const Webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const webpackConfig = require('./webpack.config.js');

const compiler = Webpack(webpackConfig);
const devServerOptions = {
  ...webpackConfig.devServer,
  open: true,
  port: 3000,
  hot: true,
  historyApiFallback: true,
  allowedHosts: 'all',
  static: {
    directory: path.join(__dirname, '../static/'),
    publicPath: '/static/',
  },
  headers: { 'Access-Control-Allow-Origin': '*' },
};
const server = new WebpackDevServer(devServerOptions, compiler);

const runServer = async () => {
  console.log('Starting server...');
  await server.start();
};

runServer();
