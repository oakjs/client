//////////////////////////////
// Drag selection rectangle
//
// Draw this when the mouse goes down and it will draw a dashed rectangle for you
//  and call the `onDrag*` callbacks as the mouse moves.
//////////////////////////////

import React, { PropTypes } from "react";

import Rect from "oak-roots/Rect";
import elements from "oak-roots/util/elements";

import oak from "../oak";
import SelectionRect from "./SelectionRect";

export default class DragSelectRect extends React.Component {
  static propTypes = {
    // Return the `clientRect` for the current mouse position.
    getDragRect: PropTypes.func,

    // Return `{ selection, selectionRects }` for the specified `clientRect`
    getSelectionForRect: PropTypes.func,

    // Callbacks for drag events, called as:
    //  `callback(event, { selection, selectionRects })`
    onDragStart: PropTypes.func,
    onDrag: PropTypes.func,
    onDragEnd: PropTypes.func,
  }

  constructor() {
    super(...arguments);
    if (!this.props.getSelectionForRect) {
      console.warn("<DragSelectRect>: you must pass `getSelectionForRect` prop!");
    }
    this.state = {};
  }

  componentDidMount() {
    this.startDragging();
  }

  //////////////////////////////
  // Drag event handlers
  //////////////////////////////
  startDragging() {
    // Start watching drag when mounted
    oak.event.initDragHandlers({
      flag: "dragSelecting",
      onDragStart: this.props.onDragStart,
      onDrag: this.props.onDrag,
      onDragEnd: this.props.onDragEnd,
      getDragInfo: this.updateSelection
    });
  }

  //////////////////////////////
  // Drag geometry and selection
  //////////////////////////////

  // Return the `clientRect` for the current drag.
  // Defaults to `oak.event.dragClientRect`.
  // If you have another way of calculating it, pass a `getDragRect()` function in your props.
  getDragRect() {
    // Defer to property function if passed
    if (this.props.getDragRect) return this.props.getDragRect();

    return oak.event.dragClientRect;
  }

  // Figure out the intersection of the current `clientRect` and whatever we're selecting.
  //
  // If anything is to be selected, must return an array of objects with at least `{ rect }`
  //  for the clientRect of the thing to be selected.
  getSelectionForRect(clientRect) {
    if (this.props.getSelectionForRect) return this.props.getSelectionForRect(clientRect);
  }


  // Update our `state.selection` and `state.selectionRects` based on current geometry.
  updateSelection = () => {
    const dragRect = this.getDragRect();
    const selection = this.getSelectionForRect(dragRect)
    const state = { dragRect, selection };
    this.setState(state);
    return state;
  }

  //////////////////////////////
  // Rendering
  //////////////////////////////

  renderSelectionRects() {
    const selection = this.state.selection || [];
    return selection.map( (selected, index) => {
      const rect = selected.rect;
      return <SelectionRect key={index} type="dragSelection" rect={rect}/>
    });
  }

  renderDragSelectRect() {
    const rect = this.getDragRect();
    return <SelectionRect type="dragSelect" rect={rect} />
  }

  render() {
    return (
      <div className="oak DragSelectRect">
        { this.renderSelectionRects() }
        { this.renderDragSelectRect() }
      </div>
    );
  }
}

// Oak editor prefs
import DragProps from "oak-roots/DragProps";
DragProps.register("Oak", { draggable: false, droppable: false }, DragSelectRect);
