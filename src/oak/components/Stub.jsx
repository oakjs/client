"use strict"
//////////////////////////////
//
//  <Stub> component
//
//////////////////////////////

import React from "react";

const STYLE = { display: "none", position: "absolute", left:-100, top:-100, width: 0, height: 0 };
const STUB = <span className="oak Stub" style={STYLE}/>;

export default class Stub extends React.Component {
  render() {
    return STUB;
  }
}

// Oak editor prefs
import { editify } from "../EditorProps";
editify("Oak", { draggable: true, droppable: false }, Stub);
