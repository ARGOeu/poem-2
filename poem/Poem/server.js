const path = require('path');

const Webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const webpackConfig = require('./webpack.config.js');

const compiler = Webpack(webpackConfig);
const devServerOptions = {
  ...webpackConfig.devServer,
  open: false,
  port: 3000,
  server: {
    type: 'https',
    options: {
      key: './hostkey.pem',
      cert: './hostcert.pem',
      requestCert: true,
    },
  },
  hot: true,
  historyApiFallback: true,
  allowedHosts: 'all',
  headers: { 'Access-Control-Allow-Origin': '*' },
};
const server = new WebpackDevServer(devServerOptions, compiler);

const runServer = async () => {
  console.log('Starting server...');
  await server.start();
};

runServer();
