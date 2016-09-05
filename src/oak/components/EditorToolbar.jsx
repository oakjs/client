//////////////////////////////
// Sample editor toolbar
// TODO:  actual contents should come from a dynamic structure...
//////////////////////////////

import React, { PropTypes } from "react";
import { classNames } from "oak-roots/util/react";

import JSXFragment from "../JSXFragment";
import OakComponent from "./OakComponent";

import "./EditorToolbar.less";

export default class EditorToolbar extends OakComponent {
  render() {
    const { oak, components: c } = this.context;
    return (
      <c.FixedPanel id="EditorToolbar" height={35}>
        <c.Menu appearance="attached inverted">
          <c.Buttons appearance="transparent">
            <c.Button onClick={oak.actions.stopEditing} icon="pointing up" active={!oak.state.editing}/>
            <c.Button onClick={oak.actions.startEditing} icon="configure" active={oak.state.editing}/>
            <c.Spacer inline/>
          </c.Buttons>
          <c.Buttons appearance="transparent">
            <c.Button onClick={oak.undo} icon="undo" disabled={!oak.canUndo}/>
            <c.Button onClick={oak.redo} icon="repeat" disabled={!oak.canRedo}/>
            <c.Spacer inline/>
          </c.Buttons>
          <c.Buttons appearance="transparent" visible={oak.state.editing && !oak.selectionIsEmpty} color="red">
            <c.Button onClick={oak.actions.removeElements} icon="remove"/>
          </c.Buttons>
        </c.Menu>
      </c.FixedPanel>
    );
  }
}


// Oak editor prefs
import { editify } from "../EditorProps";
editify({ draggable: false, droppable: true }, EditorToolbar);
