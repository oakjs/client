//////////////////////////////
// Overlay which shows/manages selection
//////////////////////////////

import Point from "oak-roots/Point";
import Rect from "oak-roots/Rect";
import { UndoTransaction } from "oak-roots/UndoQueue";

import { updateRect } from "oak-roots/util/react";
import { throttle } from "oak-roots/util/decorators";

import { getDragPreviewForElements } from "oak-roots/util/elements";

import DragMovePreview from "./DragMovePreview";
import DragSelectRect from "./DragSelectRect";
import OakComponent from "./OakComponent";
import SelectionRect from "./SelectionRect";
import Resizer from "./Resizer";

import "./SelectionOverlay.less";

export default class SelectionOverlay extends OakComponent {
  constructor() {
    super(...arguments);
    this.state = {};
  }

  componentDidMount() {
    super.componentDidMount();
    this.updateOuterRect();
    // update selection rectangle(s) when window scrolls, zooms or resizes
    $(document).on("scroll", this.onScroll);
    $(document).on("zoom", this.onZoom);
    $(window).on("resize", this.onResize);
  }

  componentDidUpdate() {
    super.componentDidUpdate();
    this.updateOuterRect();
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    $(document).off("scroll", this.onScroll);
    $(document).off("zoom", this.onZoom);
    $(window).off("resize", this.onResize);
  }

  getElement(oid) {
    return oak.editController.jsxFragment.getElement(oid);
  }

  //////////////////////////////
  // Window/document events which change browser geometry
  // and update selection rectangles
  //////////////////////////////

  onScroll = (event) => {
    this._updateSelectionRects();
  }

  onZoom = (event) => {
    this._updateSelectionRects();
  }

  onResize = (event) => {
    this._updateSelectionRects();
  }

  // Update selection due to an event (scroll, zoom, etc).
  @throttle(10)
  _updateSelectionRects() {
    if (!this._isMounted) return;

    // if we have a selection, force update
    if (oak.selection && oak.selection.length) {
      this.forceUpdate();
    }
  }


  //////////////////////////////
  // Mouse events which manipulate selection
  //////////////////////////////

  // Mouse down on overlay itself
  onMouseDown = (event) => {
    event.stopPropagation();
    this.startDragSelecting();
  }

  //////////////////////////////
  //  Mouse events in <SelectionRect> children (including the hover element)
  //////////////////////////////

  onSelectionDown = (event) => {
    // get info for where the mouse went down
    const downInfo = oak.editController && oak.editController.getMouseDownInfo();
    const downOid = downInfo && downInfo.oid;

    // if they went down on the editController root element, start drag selecting
    if (downOid === oak.editController.oid) {
      return this.startDragSelecting(event);
    }
//console.info("onSelectionDown", downOid);
    // if command/meta down
    if (oak.event.commandKey) {
      event.stopPropagation();
      event.preventDefault();
      this.startDragSelecting();
      return;

    // if shift is down,
// TODO: verify that we can multi-select...
    } else if (oak.event.shiftKey) {
      // toggle selection of the element if there is one
      if (downOid) oak.actions.toggleSelection({ elements: downOid });
    }
    // otherwise select just the downOid
    else if (!oak.selection.includes(downOid)) {
      oak.actions.setSelection({ elements: downOid });
    }

    // If anything is selected, start dragging
    if (oak.selection.length) {
      this.startDragMoving(event);
    }
  }

  // mouse went up on selectionRect WITHOUT dragging
  onSelectionRectUp = (event) => {
    // get info for where the mouse went down
    const downInfo = oak.editController && oak.editController.getMouseDownInfo();
    const downOid = downInfo && downInfo.oid;

    console.info("onSelectionRectUp", downOid);
    if (downOid && !oak.event.shiftKey && oak.selection.length > 1) {
      oak.actions.setSelection({ elements: downOid });
    }
  }


  //////////////////////////////
  //  Drag selection
  //////////////////////////////

  // Start drawing a <DragSelectRect> when the mouse goes down.
  startDragSelecting = (event) => {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.setState({ dragSelecting: true });
  }

  renderDragSelectRect() {
    if (!this.state.dragSelecting) return;
    return <DragSelectRect getSelectionForRect={this.getSelectionForRect} onDragEnd={this.onDragSelectionEnd} />
  }

  // Callback to get the selection for the specified `clientRect`.
  getSelectionForRect = (clientRect) => {
    return oak.editController && oak.editController.getElementsIntersectingRect(clientRect);
  }

  // Callback when drag-selection completes:
  //  `event` is the mouseup event
  //  `selection` is the list of `{ oid, dom, jsxe, rect }` for the things to be selected.
  onDragSelectionEnd = (event, { selection } = {}) => {
    if (selection && selection.length) {
      const oids = selection.map( info => info.oid );
      oak.actions.setSelection({ elements: oids });
    }
    else {
      oak.actions.clearSelection();
    }
    this.setState({ dragSelecting: false });
  }


  //////////////////////////////
  //  Drag Move
  //////////////////////////////

  startDragMoving(event) {
    // Get all of the draggable components
    const components = oak.selectedComponents
      .filter(component => component.canDrag());

    if (components.length === 0) {
      console.warn("SelectionOverlay.startDragMoving(): no draggable elements found in selection!");
      return;
    }

    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    // get the DOM elements which correspond to those components
    const elements = components.map( component => component.renderedElement );

    // clone the elements for the preview here, so we only do it once per drag
    const preview = getDragPreviewForElements(elements);

    this.setState({
      dragMoving: true,
      dragComponents: components,
      dragOids: components.map( component => component.oid ),
      dropParent: undefined,
      dropPosition: undefined,
      dragMoveProps: {
        preview: preview.element,
        offset: preview.offset,
        size: preview.size,
        onDragStart: this.onDragMoveStart,
        onDrag: this.onDragMove,
        onDragEnd: this.onDragMoveEnd
      }
    });
  }

  onDragMoveStart = (event, info) => {
console.log("startDragMoving", info, this.state.dragComponents);
// TODO: if option down, drag a clone
    oak.actions.removeElements({ elements: this.state.dragComponents });
    this.setState({ dragMoveStarted: true });
  }

  // `info.target` is the `oid` of the target parent if there is one
  onDragMove = (event, info) => {
    const mouseInfo = oak.editController && oak.editController.getMouseInfo();
    const jsxElement = mouseInfo && mouseInfo.jsxe;
    if (!jsxElement) {
      console.warn(`SelectionOverlay.onDragMove(): couldn't get jsxElement under mouse`);
      return;
    }

    const { dropParent, dropPosition } = this.state;
    const { parent, position } = this.getDropTarget(jsxElement) || {};

    // Forget it if no change
    if (parent === "NO_CHANGE" || (parent === dropParent && position === dropPosition)) return;

//console.info(parent, dropParent, position, dropPosition);

    // if we're already on-screen, undo to remove elements added before
    if (dropParent) {
      oak.undo();
    }

    if (parent) {
      oak.actions.addElements({
        parent,
        position,
        elements: this.state.dragComponents
      });
    }

    this.setState({
      dropParent: parent,
      dropPosition: position,
      dropParentRect: parent && oak.getRectForOid(parent)
    });

    // Call the immediate `forceUpdate` routine
    //  -- `updateSoon()` will fire too late and our UI will get out of sync.
    oak._forceUpdate();
  }


  onDragMoveEnd = (event, info) => {
    // if we started moving...
    if (this.state.dragMoveStarted) {
      // ALWAYS undo the initial `removeElements()`
       oak.undo();

      // if we actually dropped,
      if (this.state.dropParent) {
        // undo the move `addElements()`
        oak.undo();

        // redo the add + remove in one undo transaction
        const elements = this.state.dragComponents;
        const parent = this.state.dropParent;
        const position = this.state.dropPosition;
//console.warn(parent, position, elements);

        oak.actions.moveElements({
          elements, parent, position
        });
      }
    }

    // Clear drag state
    this.setState({
      dragMoving: false,
      dragMoveStarted: undefined,
      dragOids: undefined,
      dragComponents: undefined,
      dropParent: undefined,
      dropParentRect: undefined,
      dropPosition: undefined,
      dragMoveProps: undefined
    });
  }

  // NOTE: called repeatedly, don't do anything expensive in here...
  renderDragMovePreview() {
    if (!this.state.dragMoving) return;
    return <DragMovePreview {...this.state.dragMoveProps} />
  }



  // Return the `{ parent, position }` where drop should happen.
  // `position` ignores the things being dragged so it's stable as the
  //  `dragComponents` are added and removed.
  //
  // Algorithm:
  //  - iterate through the `oid` children of the `dropParent`
  //   - break children up into rows
  //   - iterate through items in each row:
  //    - if dropping on the "left side" of an element, drop before it
  //    - if dropping on the "right side" or "after" an element, drop after it.
  getDropTarget(jsxElement) {
    const parent = this.getDropParent(jsxElement);
    if (!parent) return undefined;

    const position = this.getDropPosition(parent);
    return { parent: parent.oid, position };
  }

  // Figure out the drop parent, starting at the `jsxElement`
  //  and going up until we find something that can accept the `dragComponents`.
  // Returns `undefined` if no parent found.
  getDropParent(jsxElement) {
    if (!jsxElement) return undefined;

    const { dragComponents } = this.state;
    let parent = jsxElement;
    while (parent) {
      if (parent.canDrop(dragComponents)) return parent;
      parent = this.getElement(parent._parent);
    }
  }

  // Return the position (index) of the child we should drop BEFORE inside the `dropParent`.
  getDropPosition(dropParent) {
    if (!dropParent || !dropParent.children) return undefined;

    const childRects = this.getDropChildrenRects(dropParent);
    let i = -1, childRect;
    while ((childRect = childRects[++i])) {
      const { position, rect } = childRect;
      if (rect.containsPoint(oak.event.clientLoc)) {
        return position;
      }
    }
    return dropParent.children.length;
  }

  // Return an array of `{ oid, position, rect }` for children of our dropParent.
  getDropChildrenRects(dropParent) {
    if (typeof dropParent === "string") dropParent = this.getElement(dropParent);
    if (!dropParent || !dropParent.children && !dropParent.children.length) return undefined;

    // divide into rows
    const { dragOids } = this.state;

    // get oid/position/rect for all children
    let positionDelta = 0;
    const children = dropParent.children.map( (child, index) => {
      const oid = child.oid;
      const rect = oid && oak.getRectForOid(oid);
      if (!rect) return;

//       const insideSelection = dragOids.includes(oid);
//       if (insideSelection) positionDelta--;
      const position = Math.max(0, index + positionDelta);

      return { oid, position, rect };
    }).filter(Boolean);

    // divide into rows
    const parentRect = oak.getRectForOid(dropParent.oid);
    let rows = [ [] ];
    let row = 0;
    let rowEnd = parentRect.left;

    children.forEach( (child, index) => {
      // if we're beyond the end of the current row
      if (rowEnd >= child.rect.left) {
        // if there's exactly one thing in the row
        // split it in half vertically
        if (rows[row].length === 1) {
          const element = rows[row][0];
          const cell = { oid: element.oid, position: child.position, rect: element.rect.clone() };
          row++;
          rows[row] = [ cell ];
        }

        // next row
        row++;
        rows[row] = [];
      }
      rowEnd = child.rect.right;
      rows[row].push(child);
    })
//console.dir( rows.map( row => row.map( item => item.oid + ":" + Math.floor(item.rect.left) ).join(",") ));

    // remove empty rows
    rows = rows.filter(row => row.length > 0);

    // adjust lefts and right
    rows.forEach( (row, rowIndex)=> {
      // if only one thing in the row, take up the whole width
      if (row.length === 1) {
        const info = row[0];
        info.rect.set({left: parentRect.left, width: parentRect.width });
      }
      // if multiple in row,
      // adjust lefts and right of all rects and add a capper column at the end
      else {
        let lastLeft = parentRect.left;

        row.forEach( (info, colIndex) => {
          // take up all the space between components
          const right = info.rect.left + info.rect.width;
          info.rect.set({ left: lastLeft, right });
          lastLeft = info.rect.right;
        });

        // add another at the end
        const lastOid = row[row.length - 1];
        if (lastOid) {
          const rect = lastOid.rect.clone({ left: lastLeft, right: parentRect.right });
          rows[rowIndex].push( { position: lastOid.position + 1, rect } );
        }
      }
    });


    const tops = rows.map( row => Math.min(...row.map( cell => cell.rect.top) ) );
    const bottoms = rows.map( row => Math.max(...row.map( cell => cell.rect.bottom) ) );

    // split the difference between tops and bottoms and add padding to top/bottom
    const ROW_PADDING = 5;
    const adjustedTops = tops.map( (top, rowIndex) => {
      if (rowIndex === 0) return top - ROW_PADDING;
      const bottom = bottoms[rowIndex - 1];
      return top + ((bottom - top) / 2);
    });
    adjustedTops.push(bottoms[bottoms.length-1] + ROW_PADDING);

    // adjust tops and bottoms of all rects
    rows.forEach( (row, rowIndex )=> {
      row.forEach( (info, colIndex) => {
        info.rect.set({ top: adjustedTops[rowIndex], bottom: adjustedTops[rowIndex+1] });
      });
    });

    // flatten
    const rects = [].concat(...rows);

    // add a row at the top above the start
    if (adjustedTops[0] > parentRect.top) {
      const topRect = parentRect.clone({ bottom: adjustedTops[0], top: parentRect.top })
      rects.unshift({ position:0, rect: topRect });
    }

    return rects;
  }


  //////////////////////////////
  //  Mouse events in a <ResizeHandle> child
  //////////////////////////////

  onResizeHandleDown = (event, handle) => {
    oak.event.initDragHandlers({
      event,
      onDragStart: (event) => console.info("resize handle drag start"),
      onDrag: (event) => console.info("resize handle drag"),
      onDragEnd: (event) => console.info("resize handle drag end"),
    });
  }


  //////////////////////////////
  //  Hover element -- updates on mouseMove to show the element they're currently "over"
  //////////////////////////////

//TODO: throttle???
  onMouseMove = (event) => {
    if (this.refs.hover) this.refs.hover.updateRect();
  }

  renderHoverElement() {
    if (this.state.dragSelecting) return;
    return <SelectionRect ref="hover" type="hover" onMouseDown={this.onSelectionDown} getRect={this.getHoverRect}/>;
  }

  // Return the dynamic rect to show for the `hover` element.
  getHoverRect() {
    if (!oak.editController) return;

    const mouseInfo = oak.editController.getMouseInfo();
    if (!mouseInfo) return;

    const isInsideHandle = event && $(oak.event.target).is(".ResizeHandle");
    if (isInsideHandle || oak.event.anyButtonDown) return;

    return mouseInfo.rect;
  }



  //////////////////////////////
  //  Rendering
  //////////////////////////////

  // Update our outer rectangle to match the editController's root node.
  updateOuterRect() {
    updateRect(this.ref(), ()=> oak.getRectForOid(oak.editController && oak.editController.oid));
  }

  renderSelection() {
    if (this.state.dragSelecting || this.state.dragMoving) return;
    const props = {
      selection: oak.selection,
      canResizeWidth: true,     // TODO
      canResizeHeight: true,    // TODO
      onSelectionDown: this.onSelectionDown,
      onHandleDown: this.onResizeHandleDown
    }
    return <Resizer {...props} />;
  }

  renderDropChildrenRects() {
    const rects = this.getDropChildrenRects(this.state.dropParent);
    if (!rects) return [];

    return rects.map( ({ oid, position, rect }, rectIndex) => {
      return <SelectionRect key={rectIndex} type="activeDropChild" rect={rect} position={position}/>;
    }).filter(Boolean);
  }

  renderDropTargetRect() {
    const rect = this.state.dropParentRect;
    if (!rect) return;

    return [
      <SelectionRect key="dropTarget" type="activeDropTarget" rect={rect.outset(5)}/>
    ].concat(this.renderDropChildrenRects());
  }


  render() {
    const { oak } = this.context;
    if (!oak.isEditing) return null;

    const props = {
      id: "SelectionOverlay",
      onMouseDown: this.onMouseDown,
      onMouseMove: this.onMouseMove
    }

    return (
      <div {...props}>
        { this.renderHoverElement() }
        { this.renderSelection() }
        { this.renderDragSelectRect() }
        { this.renderDragMovePreview() }
        { this.renderDropTargetRect() }
      </div>
    );
  }
}

// Oak editor prefs
import DragProps from "oak-roots/DragProps";
DragProps.register("Oak", { draggable: false, droppable: false }, SelectionOverlay);
