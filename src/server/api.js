//////////////////////////////
// API Routes
//////////////////////////////

import express from "express";
import bodyParser from "body-parser";
import fsp from "fs-promise";
import fsPath from "path";

import bundler from "./bundler";
import apiPaths from "./paths";
import util from "./util";

const router = express.Router();
const bodyTextParser = bodyParser.text();


// Log every api request
router.use((request, response, next) => {
  console.log("\n==========================================================",
              "\n"+request.originalUrl,
              "\n----------------------------------------------------------");
  next()
});



//////////////////////////////
// Utility functions to load / save / etc
//////////////////////////////

function sendTextFile(request, response, path) {
  response.set("Content-Type", "text/plain");
  return response.sendFile(path);
}

function sendJSONFile(request, response, path) {
  response.set("Content-Type", "application/json");
  return response.sendFile(path);
}

function saveTextFile(request, response, path, body) {
  console.warn("Saving to ",path);
  console.warn(body);
  return fsp.outputFile(path, body)
    // echo the saved file back
    .then(result => sendTextFile(response, path));
}


function debugParams(query) {
  const { debug, force } = query;

  const options = {};
  if (debug !== undefined) options.debug = debug !== "false";
  if (force !== undefined) options.force = force !== "false";
  return options;
}


//////////////////////////////
// Projects index
//////////////////////////////


// Router for app actions.
router.get("/app/:action",  (request, response) => {
  const { action } = request.params;
  const appPaths = new apiPaths.appPaths();
  switch (action) {
    case "projectIndex":   return sendJSONFile(request, response, appPaths.projectIndex);
  }
  throw new TypeError(`Projects API action ${action} not defined.`);
});


//////////////////////////////
// Card bits
//////////////////////////////


// Router for card read actions.
router.get("/card/:projectId/:sectionId/:cardId/:action",  (request, response) => {
  const { action, projectId, sectionId, cardId } = request.params;
  const cardPaths = new apiPaths.cardPaths(projectId, sectionId, cardId);
  switch (action) {
    case "card":    return bundler.bundleCard({ projectId, sectionId, cardId, response, ...debugParams(request.query) });
    case "jsxe":    return sendTextFile(request, response, cardPaths.jsxe);
    case "script":  return sendTextFile(request, response, cardPaths.script);
    case "styles":  return sendTextFile(request, response, cardPaths.css);
  }
  throw new TypeError(`Card API action ${action} not defined.`);
});

// Router for card write actions.
// NOTE: these all assume the `body` is plain text.
router.post("/card/:projectId/:sectionId/:cardId/:action", bodyTextParser, (request, response) => {
  const { action, projectId, sectionId, cardId } = request.params;
  const { body } = request;

  const cardPaths = new apiPaths.cardPaths(projectId, sectionId, cardId);
  switch (action) {
    case "jsxe":    return saveTextFile(request, response, cardPaths.jsxe, body);
    case "script":  return saveTextFile(request, response, cardPaths.script, body);
    case "styles":  return saveTextFile(request, response, cardPaths.css, body);
  }
  throw new TypeError(`Card API action '${action}' not defined.`);
});


// Router for sectionId read actions.
router.get("/section/:projectId/:sectionId/:action",  (request, response) => {
  const { action, projectId, sectionId } = request.params;

  const sectionPaths = new apiPaths.sectionPaths(projectId, sectionId);
  switch (action) {
    case "section":       return bundler.bundleSection({ projectId, sectionId, response, ...debugParams(request.query) });
    case "jsxe":        return sendTextFile(request, response, sectionPaths.jsxe);
    case "script":      return sendTextFile(request, response, sectionPaths.script);
    case "styles":      return sendTextFile(request, response, sectionPaths.css);
    case "cardIndex":   return sendJSONFile(request, response, sectionPaths.cardIndex);
  }
  throw new TypeError(`Section API action '${action}' not defined.`);
});


// Router for projectId read actions.
router.get("/project/:projectId/:action",  (request, response) => {
  const { action, projectId } = request.params;

  const projectPaths = new apiPaths.projectPaths(projectId);
  switch (action) {
    case "project":     return bundler.bundleProject({ projectId, response, ...debugParams(request.query) });
    case "jsxe":        return sendTextFile(request, response, projectPaths.jsxe);
    case "script":      return sendTextFile(request, response, projectPaths.script);
    case "styles":      return sendTextFile(request, response, projectPaths.css);
    case "sectionIndex":  return sendJSONFile(request, response, projectPaths.sectionIndex);
  }
  throw new TypeError(`Project API action '${action}' not defined.`);
});



//////////////////////////////
// Bundling
//////////////////////////////

router.get("/bundle", (request, response) => {
  const { debug, force, ...queryOptions } = request.query;

  const options = {
    errorStatus: 500,
    errorMessage: "Error bundling files",
    ...queryOptions,
    ...debugParams(request.query),
    response,
    trusted: false,
  };

  bundler.bundle(options)
    .catch(error => {
      console.error(options.errorMessage, ":\n", error);
      response.status(options.errorStatus).send(options.errorMessage);
    });
});





router.get("*", (request, response) => {
  throw new TypeError("API routine not defined.");
});


export default router;
