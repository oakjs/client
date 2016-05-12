//////////////////////////////
// Server-side paths and generic file manipulation.
//////////////////////////////

import fsp from "fs-promise";
import fsPath from "path";
import config from './config';

//////////////////////////////
//  Generic save / delete / rename
//  Use
//////////////////////////////

// Return a text file formatted in `utf8`.
export function getTextFile(path) {
  return fsp.readFile(path, "utf8");
}

// Save a file.
export function saveFile(path, contents) {
  return fsp.outputFile(path, contents);
}

// Save a JSON blob to a file.
export function saveJSON(path, json) {
  return fsp.outputFile(path, JSON.stringify(json, undefined, 2));
}

// If `contents` is falsy, delete the file at `path` (if it exists).
// Otherwise save `contents` to `path`.
export function saveOrDeleteFile(path, contents) {
  if (contents) return saveFile(path, contents);
  return deleteExistingFile(path)
}

// Delete a file, rejecting if it doesn't exist.
// Use `deleteExistingFile()` if you don't care whether it exists or not.
export function deleteFile(path) {
  return fsp.unlink(path);
}

// Delete a file, but return a resolved promise if the file doesn't actually exist.
export function deleteExistingFile(path) {
  return deleteFile(path).catch(Function.prototype);
}

export function renameFile(oldPath, newPath) {
  return fsp.rename(oldPath, newPath);
}

//////////////////////////////
//  Project Index
//////////////////////////////

// Lightweight object which vends paths
//  eg:   const path = paths.projects().projectIndexPath;
export class appPaths {
  get projectIndex() { return projectsPath("projects.json") }
}

// Return the path for a project file.
// Default is to return the `project.jsx` file, pass a different `fileName` for something else.
// If you want the path to the project's directory, pass `fileName=""`.
export function projectsPath(filename = "") {
  if (!isValidPath(filename)) throw new TypeError(`Invalid path: '${filename}'`);
  return fsPath.join(config.paths.projects, filename);
}



//////////////////////////////
//  Paths for projects
//////////////////////////////

// Lightweight object which vends paths
//  eg:   const path = paths.project(<projectId>).jsxePath;
export class projectPaths {
  constructor(project) {
    this.project = dieIfInvalidId(project);
  }
  get jsxe() { return projectPath(this.project, "project.jsxe") }
  get css() { return projectPath(this.project, "project.css") }
  get script() { return projectPath(this.project, "project.js") }
  get sectionIndex() { return projectPath(this.project, "sections.json") }
  get bundleFile() { return bundlePath("projects", `${this.project}.bundle.json`) }
}

// Return the path for a project file.
// Default is to return the `project.jsx` file, pass a different `fileName` for something else.
// If you want the path to the project's directory, pass `fileName=""`.
export function projectPath(project, filename = "") {
  const projectPath = fsPath.join(project, filename);
  return projectsPath(projectPath);
}

//////////////////////////////
//  Paths for sections
//////////////////////////////

// Lightweight object which vends paths
//  eg:   const path = paths.section(<projectId>, <sectionId>).jsxePath;
export class sectionPaths {
  constructor(project, section) {
    this.project = dieIfInvalidId(project);
    this.section = dieIfInvalidId(section);
  }
  get jsxe() { return sectionPath(this.project, this.section, "section.jsxe") }
  get css() { return sectionPath(this.project, this.section, "section.css") }
  get script() { return sectionPath(this.project, this.section, "section.js") }
  get pageIndex() { return sectionPath(this.project, this.section, "pages.json") }
  get bundleFile() { return bundlePath("projects", this.project, `${this.section}.bundle.json`) }
}


// Return the path for a section file.
// Default is to return the `section.jsx` file, pass a different `fileName` for something else.
// If you want the path to the section's directory, pass `fileName=""`.
export function sectionPath(project, section, filename = "") {
  const sectionPath = fsPath.join(section, filename);
  return projectPath(project, sectionPath);
}

//////////////////////////////
//  Paths for pages
//////////////////////////////

// Return the path for a page file.
// Default is to return the page's `.jsx` file, pass a different `filename` for something else.
export function pagePath(project, section, page, filename="") {
  const pagePath = fsPath.join(page, filename);
  return sectionPath(project, section, pagePath);
}


//////////////////////////////
//  Build files
//////////////////////////////

// Return build file path for `buildFile`.
export function buildPath(buildFile) {
  if (!isValidPath(buildFile)) throw new TypeError(`Invalid build path: ${buildFile}`);
  return fsPath.join(config.paths.build, buildFile);
}

// Return bundle path for a project
// NOTE: this will be relative to the `build` directory and should NOT return an absolute path.
export function bundlePath(...segments) {
  const path = fsPath.join(...segments);
  if (!isValidPath(path)) throw new TypeError(`Invalid bundle path: ${buildFile}`);
  return path;
}

//////////////////////////////
//  Path utilities
//////////////////////////////

export const VALID_ID_EXPRESSION = /^([\$_\w][\$_\-\w\d$]*)$/;
export function dieIfInvalidId(id) {
  if (typeof id !== "string" || !VALID_ID_EXPRESSION.test(id)) {
    throw new TypeError(`invalid id: ${id}`)
  }
  return id;
}

export function isValidPath(path) {
  if (typeof path !== "string") return false;
  // don't allow '//'
  if (path.includes(fsPath.sep+fsPath.sep)) return false;
  return path.split(fsPath.sep).every(segment => segment !== "." && segment !== "..");
}

// Return `true` if `path` starts with one of the specified `prefixes`
export function hasPrefix(path, ...prefixes) {
  if (typeof path !== "string") return false;
  return prefixes.some(prefix => path.startsWith(prefix));
}

export function isLegalClientPath(path) {
  return isValidPath(path) && hasPrefix(path, "public/", "projects/", "_theme/");
}


// Given a disk file `path` which is either:
//  - an absolute path, or
//  - a path that begins with one of our `config` directories as defined in `webpack.common.js::paths`
// normalize it to an absolute path.
//
// If the `options` specifies:
//  - `basePath`, we'll tack that on the beginning of the `path`
//  - `trusted` as `false`, we'll reject absolute paths or invalid paths according to `isValidPath()`.
//    (e.g., you should set `trusted: false` if the path specification comes from the browser)
export function configPath(path, options = {}) {
  const { basePath = "", trusted = true} = options;
  const fullPath = fsPath.join(basePath, path);
  if (!trusted && !isLegalClientPath(fullPath)) throw new TypeError(`ERROR in configPath(): illegal client path ${fullPath}`);

  // if we got an absolute path, just return it
  if (fullPath.startsWith(fsPath.sep)) return fullPath;

  const segments = fullPath.split(fsPath.sep);
  const pathName = segments[0];
  if (config.paths[pathName] === undefined) throw new TypeError(`ERROR in configPath(): prefix ${pathName} not found for ${fullPath}`);

  segments[0] = config.paths[pathName];
  return fsPath.join(...segments);
}


// Assign all exports as a single object
export default Object.assign({}, exports);
