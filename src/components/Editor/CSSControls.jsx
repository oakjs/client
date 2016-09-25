//////////////////////////////
// Editor.Control subclasses for dealing with CSS values
//
// TODO: !important ???
//////////////////////////////

import React, { PropTypes } from "react";

import Control from "./Control";
import NumericUnitControl from "./NumericUnitControl";

// EITHER:  `""` / `undefined`
//     OR:  `"auto"
//     OR:  `"<number><lengthType>"`
export class CSSLength extends NumericUnitControl {
  static defaultProps = {
    typeName: "length",
    stringValues: [ "auto" ],
    unitValues: [ "px", "%", "em", "rem", "vh", "vw", "vmin", "vmax" ],
    defaultUnits: "px"
  }
}

// Make everything draggable but not droppable
import { editifyMap } from "oak/EditorProps";
editifyMap("Editor", { draggable: true, droppable: false }, exports);

// export all as one map
export default {...exports};
