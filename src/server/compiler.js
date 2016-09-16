//////////////////////////////
//  "Compile" JSXE/JS/etc code into a single class expression, write it to a file, etc.
//
//  JSX: assume we should just compile and return the exports???
//  JSXE + JS: combine with JS into a class (based on what?)
//  LESS => compile into CSS
//  CSS => attach a stylesheet load to loading of the class
//
//////////////////////////////

import babel from "../oak-roots/util/babel.js";
import ComponentController from "../oak/ComponentController";
import JSXFragment from "../oak/JSXFragment";

import util from "./util";


// Set to `true` to output debug messages during compilation
export const DEBUG = false;



// Compile the files that make up a server side 'Component' into a single `class` definition script.
// Returns a promise which yields the resulting class script.
//
//  `className`, `superClassName` and `format` are the same as `compileJSXE()`
// TODO: index?
export function compileComponent(options) {
  // figure out the paths based on the component
  const { component, ...compileOptions } = options;
  const paths = [
    component.jsxePath,
    component.stylesPath,
    component.scriptPath
  ];
  return util.readPaths(paths, { optional: true })
    .then( ([ jsxe, js, css ]) => {

      // pull the file results into the `compileOptions`
      compileOptions.jsxe = jsxe;
      compileOptions.js = js;
      compileOptions.css = css;

      return compileJSXE(compileOptions);
    })
}




// Compile `jsxe`, `js` and/or `css` files into a single `class` definition script.
//
// If `format` is "ES5", we'll output as an `ES5` script,
//  otherwise we'll return the `ES2015` source.
//
// TODO: stick CSS in there somehow to be auto-installed...
// TODO: index?
// TODO: `less`
// TODO: `ignoreOids`
export function compileJSXE(options) {
  const {
    jsxe,                               // optional JSXE string fragment
    js = "",                            // optional JS class methods/etc
    css,                                // optional CSS code
    className,                          // Name for output `class`
    superClassName = "oak.Component",   // Name of superclass.
    format = "ES2015"                   // "ES5" or "ES2015" for language version.
  } = options;

  let render = "";
  // construct render method dynamically from jsxe
  if (jsxe) {
    try {
      // UGH, we need a `controller` to get the render source (for renderVars)
      const controller = new ComponentController();
      const fragment = JSXFragment.parse(jsxe, { controller });
      render = fragment._getRenderSource("  ");
    }
    catch(e) {
      console.error("Error creating render from jsxe fragment:", e);
      console.log(jsxe);
      render = "";
    }
  }

  const scripts = [
    render,
    js,
    // TODO: css script in there somehow...
  ];

  try {
    var es2015Class = babel.getClassScript(scripts, superClassName, className);
  }
  catch(e) {
    console.error("Error creating class script:", e);
    console.log(jsxe);
    render = "";
  }
//console.warn(es2015Class);

  if (format === "ES5") {
    return babel.transformExpression(es2015Class);
  }
  return es2015Class;
}



// Export all as a single object.
export default Object.assign({}, exports);
