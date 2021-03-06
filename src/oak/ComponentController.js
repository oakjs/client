//////////////////////////////
//
// Generic ComponentController class
//
//////////////////////////////

import babel from "oak-roots/util/babel";
import ChildController from "oak-roots/ChildController";
import Stylesheet from "oak-roots/Stylesheet";
import { proto, throttle } from "oak-roots/util/decorators";
import elements from "oak-roots/util/elements";
import ids from "oak-roots/util/ids";

import api from "./api";
import JSXFragment from "./JSXFragment";
import { getComponentState, setComponentStateTransaction } from "./actions/app";

import OakComponent from "./components/OakComponent";
import Stub from "./components/Stub";


export default class ComponentController extends ChildController {
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
  //  State management
//TODO: how to integrate this with our Page etc component?
//TODO: initial state?
//TODO: HOC for this?
  //////////////////////////////

	// Path for the state of your component.
  get statePath() {
  	return `projects/${this.path}`;
  }

	// Return the current state for your component.
	// Returns an empty object if state has never been defined or initialized.
	get state() {
		return getComponentState(this.statePath) || {};
	}

	// Set state for your component as part of the global `appState`.
	// Will cause the entire app to update eventually.
	//
	// Returns an `UndoTransaction`.
	// Normally calling this will create a new `UndoTransaction` which will execute immediately.
	//	To use this as part of a larger transaction, pass `undoOptions` as `{ autoExecute: false }`.
	setState(deltas, undoOptions) {
		return setComponentStateTransaction(this.statePath, deltas, undoOptions);
	}


  //////////////////////////////
  //  Rendering sub-components
  //////////////////////////////

  // Return map of components we know about.
  get components() { return this.parent.components }

  // Create an element.
  // Same semantics as `React.createElement()` except that it looks up components for you.
  createElement(type, props, ...children) {
    const component = oak.lookupComponent(type, this.components, `${this} couldn't find type ${type}`);
    return React.createElement(component, props, ...children);
  }


  //////////////////////////////
  //  Selection of sub-components
  //////////////////////////////

	// Return the list of our child `oids` which are currently selected.
	// ALWAYS returns an array.
//TODO: filter to only oids that are in our oids map???
  get selection() {
  	if (!this.state.selection || !this.oids) return [];
  	return this.state.selection.filter( oid => !!this.oids[oid] );
  }

	// Return pointers to the JSXElements for our selection.
	// ALWAYS returns an array.
  get selectedElements() {
    return this.selection.map( oid => this.getJSXElementForOid(oid) ).filter(Boolean);
  }

  // Return the FIRST selected component of the specified type.
  // Returns `undefined` if no such component was found.
  getSelectedElementOfType(type) {
    return this.selectedElements.filter( component => component.type === type )[0];
  }

  // Are we currently in `selecting` mode?
  get isSelecting() {
  	return this.state.selecting;
  }



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

  // Oid of our root component
  get oid() {
    return this.jsxFragment && this.jsxFragment.root.oid;
  }
  // Props come from the root element of our JSXE
  get props() {
    return this.jsxFragment && this.jsxFragment.root.props;
  }

  // don't call more than once per MSEC
//TODO: debounce???
  @throttle(1)
  updateSoon(){ this.forceUpdate() }

  // State comes from our instantiated component
  forceUpdate() { if (this.component) this.component.forceUpdate() }

  // Refs come from our instantiated component
  get refs() { return this.component ? this.component.refs : {} }


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

  // Return a list of oids of all of our descendents (not including this node)
  get descendentOids() {
    const oids = Object.keys(this.oids || {});
    const index = oids.indexOf(this.oid);
    if (index > -1) oids.splice(index, 1);
    return oids;
  }

  // Return `{ oid, dom, jsxe, rect }` for the specified `oid`.
  // Returns `undefined` if oid not found in our children or is not accessible because of rendering.
  // Only works if our render was drawn while we were 'editable'.
  getInfoForOid(oid) {
    const jsxe = this.getJSXElementForOid(oid);
    const dom = this.getDOMElementForOid(oid);
    if (!jsxe || !dom) return undefined;
    return {
      oid,
      jsxe,
      dom,
      rect: elements.clientRect(dom)
    }
  }


  // Return the JSXElement for the specified `oid`.
  // Only works if our render was drawn while we were 'editable'.
  getJSXElementForOid(oid) {
    if (this.jsxFragment) return this.jsxFragment.getElement(oid);
  }

  // Return the DOM element associated with an `oid`.
  // Only works if our render was drawn while we were 'editable'.
  getDOMElementForOid(oid) {
    if (!this.component) return undefined;
    const component = this.component.refs[oid];
    if (component) return component.domElement;
  }

  // Return the current `clientRect` for the specified `oid`.
  // Only works if our render was drawn while we were 'editable' and we're not redrawing.
  getRectForOid(oid) {
    const element = this.getDOMElementForOid(oid);
    if (element) return elements.clientRect(element);
  }

  // Return list of ALL `{ oid, dom, jsxe, rect }` for ALL JSXElements
  //  at a particular `clientPoint` (in "clientRect" space).
  //
  // The OUTERMOST element is the first item in the list, with the innermost element being last.
  //
  // NOTE: Although they will be returned with the innermost-JSXElement LAST,
  //       you can't rely on this ordering in terms how the browser sees the actual DOM elements
  //       because CSS z-index can make things appear out of order.
  //
//TODO: absolute positioning could put two elements from diffrent parents in the same place,
//      which might mess the order up, no???
  getElementsAtPoint(clientPoint) {
    if (!clientPoint) return [];

    return this.reduceChildren((results, jsxe, controller) => {
      const oid = jsxe.oid;
      if (oid) {
        const dom = controller.getDOMElementForOid(oid);
        if (dom) {
          const rect = elements.clientRect(dom);
          if (rect && rect.containsPoint(clientPoint)) {
            results.push({ oid, dom, jsxe, rect });
          }
        }
      }
      return results;
    }, []);
  }

  // Return list of ALL `{ oid, dom, jsxe, rect }` for ALL JSXElements
  //  which interset a particular `clientRect`.
  //
  // NOTE: this ignores text-only nodes...
  //
  // NOTE: order of this list is not reliable...
  getElementsIntersectingRect(clientRect, includeRoot = false) {
    if (!clientRect || clientRect.isEmpty) return [];
    return this.reduceChildren((results, jsxe, controller) => {
      const oid = jsxe.oid;
      if (oid && (includeRoot || oid !== controller.oid)) {
				const dom = controller.getDOMElementForOid(oid);
				if (dom) {
					const rect = elements.clientRect(dom);
					if (rect && rect.intersects(clientRect)) {
						results.push({ oid, dom, jsxe, rect });
					}
				}
			}
      return results;
    }, []);
  }


  // Return the top-most element at the given `clientPoint` (in "clientRect" space)
  //  as `{ oid, dom, jsxe, rect }`.
  //
  // If you pass `domElementAtPoint`, we'll use that to figure out the exact element
  //  according to css `z-index`.
  //
  // If you do NOT pass `domElementAtPoint`, we'll just return the innermost jsx element,
  //  and IT MAY OR MAY NOT BE THE TOP-MOST ELEMENT VISUALLY.
  getTopElementAtPoint(clientPoint, domElementAtPoint) {
    // Get the list of elements at the point, with the innermost one first.
    const elementsAtPoint = this.getElementsAtPoint(clientPoint).reverse();

    // if no `domElementAtPoint`, just return the innermost element
    if (!domElementAtPoint) return elementsAtPoint.pop();

    // Find the innermost element who contains the `domElementAtPoint`
//TODO: check levels of nesting???
    for (let element of elementsAtPoint) {
      if (elements.contains(element.dom, domElementAtPoint)) return element;
    }

    return undefined;
  }

  // Return `{ oid, dom, jsxe, rect }` for the top-most jsxElement IN Z-INDEX ORDER
  //  at the CURRENT mouse location.  This DOES take z-index into account!
  getMouseInfo() {
    return this.getTopElementAtPoint(oak.event.clientLoc, oak.event.mouseTarget);
  }

  // Return `{ oid, dom, jsxe, rect }` for the top-most jsxElement IN Z-INDEX ORDER
  //  at the location where the mouse last went down.  This DOES take z-index into account!
  //
  // NOTE: only valid while the mouse is actually down.
//TESTME: make sure scrolling after the mouse goes down doesn't affect this!
  getMouseDownInfo() {
    return this.getTopElementAtPoint(oak.event.downClientLoc, oak.event.downTarget);
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
  loadData(args) {
    if (args === api.COMPILED) {
      return api.loadControllerComponent(this)
              // convert to a "bundle"-looking-thing
              .then( Component => {
                return { Component }
              });
    }
    return api.loadComponentBundle({ component: this });
  }

  onLoaded(bundle) {
    if (typeof bundle === "string") bundle = JSON.parse(bundle);

    this.cache = {};

    // in "component" mode, our API call will return a compiled Component
    this._loadedComponent(bundle.Component);

    // Otherwise we'll return { jsxe, index, script, styles }
    if (bundle.jsxe) this._loadedJSXE(bundle.jsxe);
    this._loadedScript(bundle.script);
    this._loadedStyles(bundle.styles);
    if (bundle.index) this._loadedIndex(bundle.index);

    this.onComponentChanged();
    return bundle;
  }

  // Load our JSXE + CSS as a compiled file and install as our `Component`.
  // This is more efficient on the front-end, as we don't have to compile.
//TODO: this does NOT handle loading our index if necessary!!!
  loadComponent() {
    return this.load(api.COMPILED);
  }

  // Loaded a `Component` as an instantiated class object (eg: already `eval()`d).
  //
  // Typically this will be from `onLoaded()`, but you can call this manually
  //  if you get a Component instance another way.
  _loadedComponent(Component) {
    // If we didn't actually get a component to install...
    if (!Component) {
      // and we already have installed one...
      if (this.hasOwnProperty("Component")) {
        // remove css
        if (this.Component.css) this._loadedStyles(undefined);
        // and remove the currently installed component
        delete this.Component;
      }
      return;
    }

    // Install as our `Component` (ignoring the `cache` stuff).
    // NOTE: subsequent to this, you can `delete controller.Component`
    //       to go back to the normal JSXE `get Controller` controller setup below.
    Object.defineProperty(this, "Component", {
      get() { return Component },
      configurable: true
    });

    // install CSS for the component if provided
    // TODO: un-install the CSS if the component is changed/deleted above...
    if (Component.css) {
      this._loadedStyles(Component.css);
    }
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
  dirty(isDirty) {
    super.dirty(isDirty);
    if (this.isDirty) this.onComponentChanged();
  }


  //////////////////////////////
  //  JSXE
  //////////////////////////////

  // Called when your loaded bundle specifies "jsxe".
  _loadedJSXE(jsxe) {
    this.jsxFragment = JSXFragment.parse(jsxe, { controller: this });
  }

	// Set our JSXFragment.
	// If we've already rendered, this will update just the render method of our component.
	// Otherwise it'll update the entire thing.
	_setFragment(fragment) {
		this.jsxFragment = fragment;

		// If we've already created the Component, just update its `render()` method.
		if (this.cache.Component) {
			try {
				const renderSource = "function " + this._getFragmentRenderScript();
				const renderMethod = babel.evaluateExpression(renderSource);
				this.cache.Component.prototype.render = renderMethod;
			}
			catch (error) {
				console.error(`Error creating updating component render for ${this.path}: `, error);
				console.log("Component:", this);
				console.log("render source:", renderSource);
			}
		}

		this.dirty();
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

  // Should we load the compiled component, or editable JSXE?
  @proto
  loadStyle = api.COMPILED;

  // Return the Component class for our JSXE, etc.
  get Component() {
    if (this.cache.Component) return this.cache.Component;

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
      this.load(this.loadStyle).then( oak.updateSoon );
      return Stub;
    }

    // Create our Component and cache it.
    // The cache will automatically be cleared when any source of the component changes.
    if (!this.cache.Component) {
      this.cache.Component = this.createComponent(fragment, script);
    }

    return this.cache.Component
  }

	// Set to `true` to debug class generation from jsxe.
  @proto
  DEBUG_CLASS_GENERATION = false;

  createComponent(fragment, script = "") {
    const Super = this.ComponentConstructor;
    const componentName = ids.normalizeIdentifier(`${Super.name}_${this.path}`);

		try {
			const editable = (this === oak.editController);
			const fragmentRenderScript = this._getFragmentRenderScript(fragment, editable);

			const classScript = [
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

			try {
				const Component = babel.createClass(classScript, Super, componentName);
				Component.controller = this;
				return Component;
			}
			catch (error) {
				console.error(`Error creating component constructor for ${this.path}: `, error);
				console.log("Component:", this);
				console.log("Class Script:", classScript);
				throw error;
			}
    }
    catch (error) {
      return Stub;
    }
  }

	// Transform a `jsxFragment` into a `render()` routine.
	// If `editable` is `true`, we'll wrap components in `<Referent>`s so we can manipulate them.
  _getFragmentRenderScript(fragment = this.jsxFragment, editable = (this === oak.editController)) {
  	if (!fragment) return "";

    try {
      return fragment._getRenderSource("", { editable });
    }
    catch (error) {
      console.error(`Error creating parsing JSXE for ${this.path}: `, error);
      console.log("Component:", this);
      console.log("Fragment:", fragment.toJSX());
      throw error;
    }
  }

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
		// delete our Component so we'll recalculate it on the next update
		delete this.cache.Component;
    this.dirty();
  }


  //////////////////////////////
  //  Stylesheets
  //////////////////////////////

  // Called when your loaded bundle specifies "styles".
  _loadedStyles(css) {
    if (!this.stylesheet) {
      if (css) {
        this.stylesheet = Stylesheet.get(this.path);
        this.stylesheet.update(css);
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
