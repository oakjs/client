//////////////////////////////
//  Actions for dealing with elements
//////////////////////////////

import Action from "oak-roots/Action";
import { die } from "oak-roots/util/die";
import UndoQueue, { UndoTransaction } from "oak-roots/UndoQueue";

import oak from "../oak";
import JSXElement from "../JSXElement";

import actions from "./index";
import utils from "./utils";


// Set to `true` to debug adding/removing elements
const DEBUG = false;

//////////////////////////////
//  Element clipboard
//////////////////////////////

// Copy `elements` into the `oak.clipboard`.
// Default is to copy `oak.selection`.
//
// Optional options:  `elements`, `controller`, `autoExecute`, `actionName`
export function copyElements(options = {}) {
  const {
    controller, elements = oak.selectedComponents,
    actionName = "Copy", autoExecute
  } = options;

  if (!Array.isArray(elements)) die(oak, actionName, options, "`options.elements` must be an array");

  const oldClipboard = [].concat(oak.clipboard);
  const newClipboard = [].concat(elements);

  function redo() { oak.clipboard = newClipboard; oak.updateSoon(); }
  function undo() { oak.clipboard = oldClipboard; oak.updateSoon(); }

  return new UndoTransaction({
    redoActions:[redo],
    undoActions:[undo],
    actionName,
    autoExecute
  });
}

new Action({
  id: "oak.copyElements", title: "Copy", shortcut: "Meta C",
  handler: copyElements,
  enabled: () => !oak.selectionIsEmpty
});



// Remove `elements` from `controller` and place in `oak.clipboard`.
// Default is to cut `oak.selection`.
//
// Optional options:  `elements`, `controller`, `autoExecute`, `actionName`
export function cutElements(options = {}) {
  const {
    controller, elements = oak.selectedComponents,
    actionName = "Cut", autoExecute
  } = options;

  if (!Array.isArray(elements)) die(oak, actionName, options, "`options.elements` must be an array");

  return new UndoTransaction({
    actionName: "Cut",
    transactions: [
      copyElements({ controller, elements, actionName, autoExecute: false }),
      actions.removeElements({ controller, elements, actionName, autoExecute: false }),
      actions.clearSelection({ autoExecute: false })
    ],
    autoExecute
  });
}

new Action({
  id: "oak.cutElements", title: "Cut", shortcut: "Meta X",
  handler: cutElements,
  enabled: () => !oak.selectionIsEmpty
});


// Paste `elements` from the `oak.clipboard` inside `parent` at `position`.
// Required options:  `parent`, `position`
// Optional options:  `controller`, `autoExecute`, `actionName`
export function pasteElements(options = {}) {
  const {
    controller, position,
    actionName = "Paste", autoExecute
  } = options;

  // pasting what's in the clipboard
  const elements = oak.clipboard;
  if (!elements || elements.length === 0) die(oak, actionName, options, "Nothing to paste");

  const fragment = utils.getFragmentOrDie(controller, actionName);

  // default to the first selected thing (or whoever of it's parents can accept the elements).
// TODO: paste OVER (replace) selection?  Paste immediately AFTER selection?
  let parent = options.parent || oak.selectedComponents[0];
  if (typeof parent === "string") parent = fragment.getElementOrDie(parent, actionName);

  while (parent && !parent.canDrop(oak.clipboard)) {
    parent = fragment.getParentOrDie(parent, actionName);
  }

  return actions.addElements({
    controller,
    parent,
    position,
    elements: oak.clipboard,
    actionName,
    autoSelect: true,
    autoExecute
  });
}

new Action({
  id: "oak.pasteElements", title: "Paste", shortcut: "Meta V",
  handler: pasteElements,
  enabled: () => oak.clipboard && oak.clipboard.length > 0
});


// Export all as a lump
export default Object.assign({}, exports);

