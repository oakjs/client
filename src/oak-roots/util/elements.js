//////////////////////////////
//
//  Classes for manipulating / working directly with DOM elements.
//  Similar to stuff you'd do with jQuery,
//  but using HTML5 APIs and as fast as possible.
//
//////////////////////////////

import global from "./global";

import Rect from "../Rect";
import Point from "../Point";


// Return the OFFSET rect -- relative to the DOCUMENT, INCLUDING scrolling.
// Returns empty rectangle if element doesn't exist.
// TODO: scale???
export function clientRect(element) {
  if (!element || !element.getBoundingClientRect) return new Rect();
  const rect = element.getBoundingClientRect();
  return new Rect(rect.left, rect.top, rect.width, rect.height);
}

// Return `true` if the specified `element` matches the `selector`.
var matchesMethod = "matches";
if (global.isBrowser && !Element.prototype.matches) {
  if (Element.prototype.msMatchesSelector) matchesMethod = "msMatchesSelector";
  if (Element.prototype.webkitMatchesSelector) matchesMethod = "webkitMatchesSelector";
}
export function matches(element, selector) {
  if (typeof element[matchesMethod] !== "function") return false;
  return element[matchesMethod](selector);
}


// Given a node or element, return element or closest parent which matches selector.
export function closestMatching(element, selector) {
  if (!element) return undefined;
  let ancestor = (element instanceof Element ? element : element.parentElement);
  while (ancestor.parentElement) {
    if (matches(ancestor, selector)) return ancestor;
    ancestor = ancestor.parentElement;
  }
  return undefined;
}

// Return true if `parent` is a parent of the `potentialChild`.
// Pass `false` to `includingParent` to NOT count the parent in the comparison.
export function contains(parent, potentialChild, includingParent = true) {
  // boundary conditions
  if (!(parent instanceof Element)) return false;
  if (!(potentialChild instanceof Node)) return false;
  // pop up from a text node to the Element above it
  let current = (potentialChild instanceof Element ? potentialChild : potentialChild.parentElement);
  // if not including parent, go up one
  if (!includingParent) current = current.parentElement;
  while (current) {
    if (current === parent) return true;
    current = current.parentElement
  }
  return false;
}

// Given a set of elements:
//  - `clone()` each and stick inside a wrapper which positions it relative to
//  - an outerWrapper which is sized to the clientRect which encompasses the elements.
// Returns the `outerWrapper`.
export function getDragPreviewForElements(elements) {
//TODO: what if elements is empty???
  const rects = elements.map(element => clientRect(element));
  const outerRect = Rect.containingRect(rects);

  const $outerWrapper = $("<div class='oak DragMovePreviewWrapper'/>");
  $outerWrapper.css({ width: outerRect.width, height: outerRect.height });

  const outerOffset = outerRect.topLeft.invert();
  elements.forEach( (element, index) => {
    // Create an item itemWrapper, offset from the outerWrapper
    const $itemWrapper = $("<div class='oak DragMovePreviewItemWrapper'/>");
    const itemWrapperRect = rects[index].offset(outerOffset);
    $itemWrapper.css(itemWrapperRect.style);

    // clone the node and clear its margin
    // TODO: check this in IE -- may need "!important" ?
    const clone = element.cloneNode(true);
    clone.style.setProperty("margin", "0", "important");

    // add the clone to the itemWrapper
    $itemWrapper.append( clone );

    // add the itemWrapper to the preview
    $outerWrapper.append( $itemWrapper );
  });

  // remove reacty bits
  $outerWrapper.find("[data-reactid]").removeAttr("data-reactid");

  return {
    element: $outerWrapper[0],
    clientRect: outerRect,
    size: outerRect.size,
    offset: oak.event.clientLoc.subtract(outerRect.topLeft)
  }
}


export default {...exports};
