//////////////////////////////
// Specialized JSXElement Parser
//////////////////////////////

import AcornParser from "oak-roots/AcornParser";
import ids from "oak-roots/util/ids";

import JSXElement from "./JSXElement";
import JSXFragment from "./JSXFragment";

export default class JSXParser extends AcornParser {
  //////////////////////////////
  // Parsing Registry
  // Add classses which you want to have ALWAYS instantiate as a certain type of JSXElement
  //  as:  `JSXParser.registerType("YourTypeName", YourSubclass);`
  //////////////////////////////

  getElementConstructor(type) {
    return JSXElement;
  }

  // Assign a unique (within this parse run, anyway) `oid` to the element.
  // NOTE: this will NOT be saved with the node...
  parseProps(element, astElement, code, options) {
    // assign a unique `oid` to the element
    const { fragment } = options;
    if (fragment) {
      element.oid = fragment.getUniqueOid();
      fragment.oids[element.oid] = element;
    }
    return super.parseProps(element, astElement, code, options) || {};
  }

  // Have children point back to their parent.
  parseChild(parent, astElement, code, options) {
    const child = super.parseChild(parent, astElement, code, options);
    if (child instanceof JSXElement) {
      if (parent.oid) child._parent = parent.oid;
    }
    return child;
  }

}
