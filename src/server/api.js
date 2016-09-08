//////////////////////////////
// API Routes
//////////////////////////////

import express from "express";
import bodyParser from "body-parser";
import fsp from "fs-promise";
import fsPath from "path";

import bundler from "./bundler";
import Page from "./Page";
import Project from "./Project";
import paths from "./paths";
import Section from "./Section";
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


// Generic error handling
router.use((error, request, response, next) => {
  if (error instanceof Error) console.trace(error);
  else console.error("ERROR: " + message);
  res.status(500).send(error);
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


//////////////////////////////
//  Oak actions
//////////////////////////////

router.get("/oak/:action",  (request, response) => {
  const { action } = request.params;
  const appPaths = new paths.appPaths();
  switch (action) {
    case "projects":   return sendJSONFile(request, response, appPaths.projectIndex);
  }
  throw new TypeError(`Oak API action ${action} not defined.`);
});


//////////////////////////////
//  Page actions
//////////////////////////////

// Page read actions.
router.get("/page/:projectId/:sectionId/:pageId/:action",  (request, response) => {
  const { action, projectId, sectionId, pageId } = request.params;
  const page = new Page({ projectId, sectionId, pageId });
  switch (action) {
    case "bundle":  return page.getBundle(response, request.query.force === "true");
    case "jsxe":    return page.getJSXE(response);
    case "script":  return page.getScript(response);
    case "styles":  return page.getStyles(response);
  }
  throw new TypeError(`Page GET API action ${action} not defined.`);
});

// Page write actions.
router.post("/page/:projectId/:sectionId/:pageId/:action", bodyTextParser, (request, response) => {
  const { action, projectId, sectionId, pageId } = request.params;
  const { body } = request;
  const data = body ? JSON.parse(body) : {};

  const page = new Page({ projectId, sectionId, pageId });
  switch (action) {
    case "save":      return page.save(data)
                        .then( () => page.getBundle(response) )
                        .catch( error => { console.error(error); throw new Error(error)} );

    case "create":    return page.create(data)
                        .then( () => page.getBundleAndParentIndex(response) )
                        .catch( error => { console.error(error); throw new Error(error)} );

    case "duplicate": return page.duplicate(data)
                        .then( newPage => newPage.getBundleAndParentIndex(response) )
                        .catch( error => { console.error(error); throw new Error(error)} );

    case "rename":    return page.changeId(data)
                        .then( newPage => newPage.parentIndex.getFile(response) )
                        .catch( error => { console.error(error); throw new Error(error)} );

    case "delete":    return page.delete()
                        .then( () => page.parentIndex.getFile(response) )
                        .catch( error => { console.error(error); throw new Error(error)} );

    case "undelete":  return page.undelete(data)
                        .then( () => page.getBundleAndParentIndex(response) )
                        .catch( error => { console.error(error); throw new Error(error)} );
  }
  throw new TypeError(`Page POST API action '${action}' not defined.`);
});



//////////////////////////////
//  Section actions
//////////////////////////////

// Section read actions.
router.get("/section/:projectId/:sectionId/:action",  (request, response) => {
  const { action, projectId, sectionId } = request.params;
  const section = new Section({ projectId, sectionId });
  switch (action) {
    case "bundle":  return section.getBundle(response, request.query.force === "true");
    case "jsxe":    return section.getJSXE(response);
    case "script":  return section.getScript(response);
    case "styles":  return section.getStyles(response);
    case "pages":   return section.getChildIndex(response);
  }
  throw new TypeError(`Section GET API action '${action}' not defined.`);
});

// Section write actions.
router.post("/section/:projectId/:sectionId/:action", bodyTextParser, (request, response) => {
  const { action, projectId, sectionId } = request.params;
  const { body } = request;
  const data = body ? JSON.parse(body) : {};

  const section = new Section({ projectId, sectionId });
  switch (action) {
    case "save":      return section.save(data)
                        .then( () => section.getBundle(response) )
                        .catch( error => { console.error(error); throw new Error(error)} );

    case "create":    return section.create(data)
                        .then( () => section.getBundleAndParentIndex(response) )
                        .catch( error => { console.error(error); throw new Error(error)} );

    case "duplicate": return section.duplicate(data)
                        .then( newSection => newSection.getBundleAndParentIndex(response) )
                        .catch( error => { console.error(error); throw new Error(error)} );

    case "rename":    return section.changeId(data)
                        .then( newSection => newSection.parentIndex.getFile(response) )
                        .catch( error => { console.error(error); throw new Error(error)} );

    case "delete":    return section.delete()
                        .then( () => section.parentIndex.getFile(response) )
                        .catch( error => { console.error(error); throw new Error(error)} );

    case "undelete":  return section.undelete(data)
                        .then( () => section.getBundleAndParentIndex(response) )
                        .catch( error => { console.error(error); throw new Error(error)} );
  }
  throw new TypeError(`Section POST API action '${action}' not defined.`);
});


//////////////////////////////
//  Project actions
//////////////////////////////

// Project read actions.
router.get("/project/:projectId/:action",  (request, response) => {
  const { action, projectId } = request.params;
  const project = new Project({ projectId });
  switch (action) {
    case "bundle":  return project.getBundle(response, request.query.force === "true");
    case "jsxe":    return project.getJSXE(response);
    case "script":  return project.getScript(response);
    case "styles":  return project.getStyles(response);
    case "sections":   return project.getChildIndex(response);
  }
  throw new TypeError(`Project GET API action '${action}' not defined.`);
});

// Project write actions.
router.post("/project/:projectId/:action", bodyTextParser, (request, response) => {
  const { action, projectId } = request.params;
  const { body } = request;
  const data = body ? JSON.parse(body) : {};
  const project = new Project({ projectId });
  switch (action) {
    case "save":      return project.save(data)
                        .then( () => project.getBundle(response) )
                        .catch( error => { console.error(error); throw new Error(error)} );

    case "create":    return project.create(data)
                        .then( () => project.getBundleAndParentIndex(response) )
                        .catch( error => { console.error(error); throw new Error(error)} );

    case "duplicate": return project.duplicate(data)
                        .then( newProject => newProject.getBundleAndParentIndex(response) )
                        .catch( error => { console.error(error); throw new Error(error)} );

    case "rename":    return project.changeId(data)
                        .then( newProject => newProject.parentIndex.getFile(response) )
                        .catch( error => { console.error(error); throw new Error(error)} );

    case "delete":    return project.delete()
                        .then( () => project.parentIndex.getFile(response) )
                        .catch( error => { console.error(error); throw new Error(error)} );

    case "undelete":  return project.undelete(data)
                        .then( () => project.getBundleAndParentIndex(response) )
                        .catch( error => { console.error(error); throw new Error(error)} );
  }
  throw new TypeError(`Project POST API action '${action}' not defined.`);
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
    debug: debug === "true",
    force: force === "true",
    response,
    trusted: false,
  };

  bundler.bundle(options)
    .catch(error => {
      console.error(options.errorMessage, ":\n", error);
      response
        .status(options.errorStatus)
        .send(options.errorMessage);
    });
});





router.get("*", (request, response) => {
  throw new TypeError("API routine not defined.");
});


export default router;
