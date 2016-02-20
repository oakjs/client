/* eslint no-console: 0 */

import path from "path";
import express from "express";
import webpack from "webpack";
import webpackMiddleware from "webpack-dev-middleware";
import webpackHotMiddleware from "webpack-hot-middleware";

import config from "../webpack.config.js";

console.dir(config);

const isDeveloping = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = isDeveloping ? 3000 : process.env.PORT;
const app = express();

//////////////////////////////
// Hot Module Reload setup
//////////////////////////////

if (isDeveloping) {
  var compiler = webpack(config);
  var middleware = webpackMiddleware(compiler, {
    publicPath: config.output.publicPath,
    contentBase: config.paths.client,
    stats: {
      colors: true,
      hash: false,
      timings: true,
      chunks: false,
      chunkModules: false,
      modules: false
    }
  });

  app.use(middleware);
  app.use(webpackHotMiddleware(compiler));
}


//////////////////////////////
//  Common for dev and production
//////////////////////////////

// anything in `public` gets served directly
app.use(express.static(config.paths.public));

// API routines split into their own file
import apiRouter from "./api";
app.use("/api", apiRouter);


//////////////////////////////
//  Dev & production specific
//////////////////////////////
if (isDeveloping) {
  app.get("*", function response(request, response) {
    response.write(middleware.fileSystem.readFileSync(config.paths.oakDistHTMLFile));
    response.end();
  });
} else {
  app.use(express.static(config.paths.dist));
  app.get("*", function response(request, response) {
    response.sendFile(config.paths.oakDistHTMLFile);
  });
}


//////////////////////////////
//  Start listening
//////////////////////////////
app.listen(port, "localhost", function onStart(err) {
  if (err) {
    console.log(err);
  }
  console.info("==> 🌎 Listening on port %s. Open up http://localhost:%s/ in your browser.", port, port);
});
