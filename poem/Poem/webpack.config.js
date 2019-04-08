var path = require("path");
var webpack = require('webpack');
var BundleTracker = require('webpack-bundle-tracker');

module.exports = {
    context: __dirname,
    entry: "./frontend/react/index.js",
    output: {
        path: path.resolve("./frontend/bundles/reactbundle/"),
        filename: "[name]-[hash].js",
        chunkFilename: "[name]-[hash].js"
    },
    plugins: [
        new BundleTracker({filename: './webpack-stats.json'}),
    ],
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: ['babel-loader']
            },
            {
                test: /\.css$/,
                use: ['style-loader','css-loader', {
                    loader: 'postcss-loader',
                    options: {
                    plugins: () => [require('autoprefixer')]
                    }}]
            }
        ]
    },
    resolve: {
        extensions: ['*', '.js', '.jsx']
    }
};
