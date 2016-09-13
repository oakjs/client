//////////////////////////////
//
// Generic ComponentController class
//
//////////////////////////////

import babel from "oak-roots/util/babel";
import ChildController from "oak-roots/ChildController";
import Eventful from "oak-roots/Eventful";
import Stylesheet from "oak-roots/Stylesheet";
import { autobind, proto, throttle } from "oak-roots/util/decorators";
import ids from "oak-roots/util/ids";

import api from "./api";
import JSXFragment from "./JSXFragment";
import oak from "./oak";

import OakComponent from "./components/OakComponent";
import Stub from "./components/Stub";


export default class ComponentController extends Eventful(ChildController) {
  // Your subclass should override to add variables that you want to expose to the render() method.
  static renderVars = {
    props: "this.props",
    state: "this.state",
    context: "this.context",
    oak: "context.oak",
    controller: "context.controller",
    components: "(controller && controller.components) || oak.components",
    page: "context.page",
    section: "context.section",
    project: "context.project",
    data: "this.data || {}"
  };

  constructor(props) {
    super();
    Object.assign(this, props);
    this.cache = {};
  }

  // Return the `type` of this component, either "Component" for a generic component
  // or a more specific name for a subclass (eg: "Page").
  // This will, eg, be used to load the component, for filenames on the server, etc.
  @proto
  type = "Component";

  //////////////////////////////
  //  ChildController stuff
  //////////////////////////////

  // Override to make the index for the children of this Component.
  // If you don't override, we'll assume you don't have any children that you manage.
  // If you do have children, call this in your `constructor` so the index is always available.
  _makeChildIndex() {}

  // Return the data to save in our PARENT's index for this object.
  // Override if you need to save something else...
  // NOTE: server assumes we're only saving this as well for all components...
  getIndexData() { return { type: this.type, id: this.id, title: this.title } }

  // Return the route used to display this component.
  // DEPRECATE: this is highly-app-setup-specific
  get route() { throw new TypeError("You must implement get route()") }


  //////////////////////////////
  //  Component Sugar
  //////////////////////////////

  // "private" things are findable, but don't show up in menus, etc
  get isPrivate() { return this.id.startsWith("_") }

  // Props come from the root element of our JSXE
  get props() {
    return this.jsxFragment && this.jsxFragment.root.props;
  }

  // State comes from our instantiated component
  get state() { return this.component && this.component.state }
  setState(state) { if (this.component) this.component.setState(state) }
  forceUpdate() { if (this.component) this.component.forceUpdate() }

  // don't call more than once per MSEC
  @throttle(1)
  updateSoon(){ this.forceUpdate() }

  // Refs come from our instantiated component
  get refs() { return this.component ? this.component.refs : {} }

  // Oid of this component
  get oid() {
    const props = this.props;
    return props && (props.oid || props["data-oid"]);
  }

  //////////////////////////////
  //  Components
  //////////////////////////////

  // Called when our component JSX, Script or Styles change.
  // Forces full page update.
  onComponentChanged() {
    if (this.component) oak.updateSoon();
  }

  // Return all `oids` this component knows about.
  get oids() {
    return this.jsxFragment && this.jsxFragment.oids
  }

  // Return the component DEFINITION for the specified `oid`.
  getComponentForOid(oid) {
    const oids = this.oids;
    return oid && oids && oids[oid];
  }

  // Return a list of oids of all of our descendents (not including this node)
  get descendentOids() {
    const oids = Object.keys(this.oids || {});
    const index = oids.indexOf(this.oid);
    if (index > -1) oids.splice(index, 1);
    return oids;
  }

  //////////////////////////////
  //  Loading
  //////////////////////////////

  // We load our data in a JSON bundle.
  // The base class automatically handles:
  //    - `jsxe` as a JSXFragment (override `_loadedJSXE()` to do something slecei
  //    - `script` as javascript for the JSXFragment
  //    - `styles` as CSS styles
  //    - `index` as a LoadableIndex
  loadData() {
    return api.loadComponentBundle({ component: this });
  }

  onLoaded(bundle) {
    if (typeof bundle === "string") bundle = JSON.parse(bundle);

    this.cache = {};
    if (bundle.jsxe) this._loadedJSXE(bundle.jsxe);
    if (bundle.index) this._loadedIndex(bundle.index);
    this._loadedScript(bundle.script);
    this._loadedStyles(bundle.styles);

    this.onComponentChanged();
    return bundle;
  }


  //////////////////////////////
  //  Saving
  //////////////////////////////

  // Return the data to be saved in the JSON bundle.
  // The baseclass saves:
  //    - `jsxe` as a JSXFragment
  //    - `script` as javascript for the JSXFragment
  //    - `styles` as CSS styles
  // If your subclass has an index or something, add that to the `super()`'s data.
  getDataToSave() {
    return {
      jsxe: this._getJSXEData(),
      script: this._getScriptData(),
      styles: this._getStyleData(),
      index: this._getIndexData()
    }
  }

  saveData() {
    const data = this.getDataToSave();
    console.warn(`${this}.saveData(): `, data);
//TODO: update data from returned bundle???
    return api.saveComponentBundle({ component: this, data });
  }

  // Clear our cache when we're marked as dirty
  dirty(dirty) {
    super.dirty(dirty);
    if (this.isDirty) {
      this.cache = {};
      this.onComponentChanged();
    }
  }


  //////////////////////////////
  //  JSXE
  //////////////////////////////

  // Called when your loaded bundle specifies "jsxe".
  _loadedJSXE(jsxe) {
    this.jsxFragment = JSXFragment.parse(jsxe, { controller: this });
  }

  // Return JSXE data to save.
  _getJSXEData() {
    if (this.jsxFragment) return this.jsxFragment.toJSX();
  }


  // The constructor we use to base our dynamically load component on
  //  MUST be a subclass of OakComponent or we won't have context set up properly
  //  for our render function.
  @proto
  ComponentConstructor = OakComponent;

  // Return the Component class for our JSXE, etc.
  get Component() {
    if (this.cacheComponent) return this.cache.Component;

    if (this.loadError) {
      console.warn(`${this}: load error: ${this.loadError}!`);
      return Stub;
    }

    // Can't do much if we don't have a fragment or script
    const fragment = this.jsxFragment;
    const script = this._script;
    if (this.isLoaded && !fragment && !script) {
      console.warn(`${this}: loaded but no jsxFragment or script!`);
      return Stub;
    }

    // if we haven't loaded, load and then update the entire page
    if (!this.isLoaded) {
      this.load().then( oak.updateSoon );
      return Stub;
    }

    // Create our Component and cache it.
    // The cache will automatically be cleared when any source of the component changes.
    if (!this.cache.Component) {
      this.cache.Component = this.createComponent(fragment, script);
    }

    return this.cache.Component
  }

// UGH: this requires babel, move this somewhere else???
  @proto
  DEBUG_CLASS_GENERATION = false;

  createComponent(fragment, script = "") {
    const Super = this.ComponentConstructor;
    const componentName = ids.normalizeIdentifier(`${Super.name}_${this.path}`);

    let fragmentRenderScript, classScript, Component;
    try {
      fragmentRenderScript = (fragment ? fragment._getRenderSource() : "");
    }
    catch (error) {
      console.error(`Error creating parsing JSXE for ${this.path}: `, error);
      console.log("Component:", this);
      console.log("Fragment:", fragment.toJSX());
      return Stub;
    }

    try {
      classScript = [
        // NOTE: Put the fragment render script BEFORE any manually-created script
        //       in case they implemented a custom render() function.
        fragmentRenderScript,
        script,
      ].join("\n");

      if (this.DEBUG_CLASS_GENERATION) {
        console.groupCollapsed(this.path);
        console.log(classScript);
        console.groupEnd();
      }

      Component = babel.createClass(classScript, Super, componentName);
//window.Constructor = Component;
      Component.controller = this;
      return Component;
    }
    catch (error) {
      console.error(`Error creating component constructor for ${this.path}: `, error);
      console.log("Component:", this);
      console.log("Class Script:", classScript);
      return Stub;
    }
  }

  // Return map of components we know about.
  get components() { return this.parent.components }

  //////////////////////////////
  //  Script
  //////////////////////////////

  // Called when your loaded bundle specifies "script".
  _loadedScript(script) {
    this._script = script;
  }

  // Return script data to save.
  _getScriptData() {
    return this._script;
  }

  // Call this to change your Script after you've loaded.
  updateScript(script) {
    this._script = script;
    this.dirty();
  }


  //////////////////////////////
  //  Stylesheets
  //////////////////////////////

  // Called when your loaded bundle specifies "styles".
  _loadedStyles(css) {
    if (!this.stylesheet) {
      if (css) {
        const id = ids.normalizeIdentifier(this.path);
        this.stylesheet = new Stylesheet({css, id });
      }
    }
    else {
      this.stylesheet.update(css);
    }
  }

  // Return stylesheet data to save.
  _getStyleData() {
    if (this.stylesheet) return this.stylesheet.css;
  }

  // Call this to change your CSS after you've loaded.
  updateStyles(css) {
    this._loadedStyles(css);
    this.dirty();
  }


  //////////////////////////////
  //  Debug
  //////////////////////////////

  toString() {
    return `<${this.type} ${this.path}/>`;
  }

}
