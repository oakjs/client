//////////////////////////////
//  Actions for dealing with elements
//////////////////////////////

import Action from "oak-roots/Action";
import { die } from "oak-roots/util/die";
import UndoQueue, { UndoTransaction } from "oak-roots/UndoQueue";

import oak from "../oak";
import JSXElement from "../JSXElement";

import utils from "./utils";


// Set to `true` to debug adding/removing elements
const DEBUG = false;

//////////////////////////////
//  Manipulating element properties
//////////////////////////////


// Change a map of prop `props` of one or more `elements`.
// You can specify an `oid` string or a `JSXElement` or an array of same.
//
// Required options:  `elements`, `props`
// Optional options:  `controller`, `autoExecute`, `actionName`
//
// NOTE: throws if `elements` are not found in `controller`.
export function setElementProps(options) {
  const {
   controller, elements, props,
    actionName = "Set Properties", autoExecute
  } = options;

  if (props == null) die(oak, actionName, options, "`options.props` must be an object");

  return changeFragmentTransaction({
    actionName,
    controller,
    autoExecute,
    transformer: (fragment) => {
      fragment.setProps(props, elements);
    },
  });
}



// Change all props of `elements` to new `props` passed in.
// You can specify an `oid` string or a `JSXElement`.
//
// Required options:  `elements`, `props`
// Optional options:  `controller`, `autoExecute`, `actionName`
//
// NOTE: throws if `elements` are not found in `controller`.
export function resetElementProps(options) {
  const {
    controller, elements, props,
    actionName = "Set Properties", autoExecute
  } = options;

  if (props == null) die(oak, actionName, options, "`options.props` must be an object");

  return changeFragmentTransaction({
    actionName,
    controller,
    autoExecute,
    transformer: (fragment) => {
      fragment.resetProps(props, elements);
    },
  });
}



//////////////////////////////
//  Removing children
//////////////////////////////

// Remove list of `elements` passed as `oid` string or by reference from the `controller`.
//
// Required options:  `elements`
// Optional options:  `controller`, `autoExecute`, `actionName`
//
// NOTE: You cannot reliably use this to remove non-element children,
//       use `removeChildrenAtPositions()` instead.
export function removeElements(options = {}) {
  const {
    controller = oak.editController,
    elements = controller && controller.selectedElements,
    actionName = "Delete Elements", autoExecute
  } = options;

  if (!Array.isArray(elements)) die(oak, actionName, options, "`options.elements` must be an array");

  return changeFragmentTransaction({
    actionName,
    controller,
    autoExecute,
    transformer: (fragment) => {
      // remove the descendents of the elements or we'll get an error removing children
      const roots = fragment._removeDescendents(elements);
      fragment.removeElements(roots);
    }
  });
}

new Action({
  id: "oak.removeElements", title: "Delete", shortcut: "Meta Backspace",
  handler: removeElements,
  disabled: () => !oak.editController || !oak.editController.selection.length
});


//////////////////////////////
//  Adding children
//////////////////////////////

// Add list of `elements` and all descendents to `parent` at `position`,
// pushing other things out of the way.
//
// NOTE: this does NOT clone or otherwise modify the elements!
//
// Required options:  `parent`, `position`, `elements`
// Optional options:  `controller`, `autoExecute`, `actionName`
export function addElements(options = {}) {
  const {
    controller = oak.editController,
    parent, position, elements, autoSelect,
    actionName = "Add Elements", autoExecute
  } = options;

  if (!Array.isArray(elements)) die(oak, actionName, options, "`options.elements` must be an array");

  return changeFragmentTransaction({
    actionName,
    controller,
    autoSelect,
    autoExecute,
    transformer: (fragment) => {
      return fragment.add(parent, position, elements);
    }
  });
}

// Add the `elements` to the `parent` at `position`,
//  defaulting to current selection (or its droppable ancestor) if parent isn't specified.
//
// NOTE: we'll work our way upwards from the `parent` until we find something
//       that which `canDrop()` the elements.
export function addElementsToParentOrSelection(options = {}) {
  const {
    controller = oak.editController,
    position, elements, autoSelect,
    actionName = "Add Elements", autoExecute
  } = options;

  const fragment = utils.getFragmentOrDie(controller, actionName);

  // default to the first selected thing (or whoever of it's parents can accept the elements).
// TODO: paste OVER (replace) selection?  Paste immediately AFTER selection?
  let parent = options.parent || controller.selectedElements[0] || controller.oid;
  if (typeof parent === "string") parent = fragment.getElementOrDie(parent, actionName);

  // Recurse up until we get to a droppable thing.
  // (NOTE: The Page/etc should ALWAYS be droppable for anything.
  while (parent && !parent.canDrop(elements)) {
    parent = fragment.getParentOrDie(parent, actionName);
  }

  if (!parent) die(oak, actionName, options, "can't find viable parent to add to");

  return addElements({
    controller,
    parent,
    position,
    elements,
    actionName,
    autoSelect,
    autoExecute
  });
}


// Create a new element of the specified string component `type`
//  and add it to `parent` at `position` (defaulting to selection as parent).
export function createElement(options = {}) {
  const {
    type, props,
    controller = oak.editController,
    parent, position, autoSelect = true,
    actionName = "Create Element", autoExecute
  } = options;

  if (!type || typeof type !== "string") die(oak, actionName, options, "`options.type` must be a string");
  const element = new JSXElement({ type, props });

  return addElementsToParentOrSelection({
    controller,
    parent,
    position,
    elements: [element],
    actionName,
    autoSelect,
    autoExecute
  });
}


//////////////////////////////
//  Moving children
//////////////////////////////


// Move list of `elements` and all descendents from their current parent
//  to `parent` at `position` pushing other things out of the way.
//
// NOTE: this does NOT clone or otherwise modify the elements!
//
// Required options:  `elements`, `parent`, `position`,
// Optional options:  `controller`, `autoExecute`, `actionName`
export function moveElements(options = {}) {
  const {
    controller = oak.editController,
    elements, parent, position, autoSelect,
    actionName = "Move Elements", autoExecute
  } = options;

  if (!Array.isArray(elements)) die(oak, actionName, options, "`options.elements` must be an array");

  return changeFragmentTransaction({
    actionName,
    controller,
    autoSelect,
    autoExecute,
    transformer: (fragment) => {
      // remove the descendents of the elements or we'll get an error removing children
      const roots = fragment._removeDescendents(elements);
      fragment.removeElements(roots);
      // add elements (which auto-adds their children ???)
      fragment.add(parent, position, elements);
    }
  });
}


//////////////////////////////
//  Generic JSXFragment manipulation
//////////////////////////////


// Create a transaction for a transformation of `props` of one or more elements.
//  We'll call `options.transformer(jsxFragmentClone)` to make the actual change.
//  If `autoSelect` is true, we'll automatically select anything returned by the `transformer`.
//
// NOTE: don't call this directly, use one of the `setElement*()` or `*Element()` calls.
export function changeFragmentTransaction({
  controller = oak.editController, transformer, autoSelect,
  actionName, autoExecute
}) {
  controller = utils.getControllerOrDie(controller, actionName);
  const originalFragment = controller.jsxFragment;
  const originalSelection = autoSelect && controller.selection;

  // clone the original fragment and transform it
  const newFragment = originalFragment.clone();
  const results = transformer(newFragment);
  const newSelection = autoSelect && results.map(element => element.oid);

  function redo() { return _setControllerFragment(controller, newFragment, newSelection) }
  function undo() { return _setControllerFragment(controller, originalFragment, originalSelection) }

  return new UndoTransaction({
    redoActions:[redo],
    undoActions:[undo],
    actionName,
    autoExecute
  });
}

function _setControllerFragment(controller, fragment, selection) {
  controller._setFragment(fragment);
  if (selection) utils.setComponentState(controller, { selection });
}




// Export all as a lump
export default {...exports};

