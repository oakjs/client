//////////////////////////////
//
//	<Oak.Panel> component for use with oak e.g.:
//
//    <Oak.Panel>
//      <Oak.PanelHeader>...</Oak.PanelHeader>
//      <Oak.LeftSidebar>...</Oak.LeftSidebar>
//      <Oak.RightSidebar>...</Oak.RightSidebar>
//      <Oak.PanelFooter>...</Oak.PanelFooter>
//      ...main content elements...
//    </Oak.Panel>
//
//  Note that order is not important.
//
// TODO:
//  - rename to QuadPanel or something?
//  - sidebars inside vs. outside headers?
//  - non-`scrolling` sidebars should always scroll?  be sticky?
//  - different scrolling scenarios
//  - <Oak.Panel title> auto-create <Oak.PanelHeader><h2>{title}</h2></Oak.PanelHeader>
//  - <Oak.Panel closeable>   => set hidden dynamically?  how do we re-show it?  pref?
//  - <Oak.Toolbar> ?  <Oak.TopToolbar> vs <Oak.BottomToolbar> ?
//  - better name for "fluid`?  default to "fluid" and have "compact" ?
//  - padding?  applies to body only, with separate setting for header/sidebars/etc?
//      - "tight" | ("normal") | "relaxed" ?
//      - (none) | "padded" | "relaxed"
//      - appearance like SUI = "unpadded" "lightly padded" "padded" "very padded"
//
//////////////////////////////

import { Children, Component, PropTypes } from "react";

import fn from "oak-roots/util/fn";
import { classNames, mergeProps, stringOrFn, boolOrFn } from "oak-roots/util/react";

import OakComponent from "./OakComponent";

import "./Panel.less";


//
//  Panel class
//
export default class Panel extends OakComponent {
  static propTypes = {
    ...OakComponent.propTypes,

    // take up full height?
    // TODO: name???
    fluid: PropTypes.bool,

    // Scroll body?
    scrolling: PropTypes.bool,
  }


  componentDidMount() {
    super.componentDidMount();
    setScrollBodyHeights();
  }

  // if "scrolling" changes, clear explicitly body height
  // TESTME
  componentWillReceiveProps(nextProps) {
    if (this.props.scrolling && !nextProps.scrolling) {
      this.$ref("body").height("auto");
    }
  }

  componentDidUpdate() {
    super.componentDidUpdate();
    setScrollBodyHeights();
  }

  // Munge children into:
  //  <PanelHeader>
  //  <.body>
  //      <LeftSidebar>
  //      <.contents> ...loose content elements ... </.contents>
  //      <RightSidebar/>
  //  </.body>
  //  <PanelFooter>
  mungeChildren(props) {
    // Pull children out for possible reordering, unknown stuff goes in `contents`.
    let header, footer, left, right, contents = [];
    Children.forEach( props.children, (child) => {
      switch (child.type) {
        case PanelHeader:
          header = child; break;
        case PanelFooter:
          footer = child; break;
        case LeftSidebar:
          left = child; break;
        case RightSidebar:
          right = child;  break;
        default:
          contents.push(child);
      }
    });

    const children = [];
    // header
    if (header) children.push(header);
    // "main" row contains <LeftSidebar>...contents...<RightSidebar>
    const main = [];
    if (left) main.push(left);
    main.push(React.createElement("div", { className: "contents", ref: "contents" }, ...contents));
    if (right) main.push(right);
    children.push(React.createElement("div", { className: "body", ref: "body" }, ...main));
    // footer
    if (footer) children.push(footer);

    return children;
  }

  getRenderProps(props) {
    props = { ...props };

    const { fluid, scrolling } = props;
    props.className = classNames(
      "oak",
      { fluid, scrolling },
      "Panel",
      props.className
    );

    props.children = this.mungeChildren(props);
    return props;
  }

  render() {
    if (this.hidden) return;
    const props = this.getRenderProps(this.props);
    return React.createElement("div", props, ...props.children);
  }
}


// <PanelHeader> class inside a <Panel>
// TODO: <PanelHeader> ???
export class PanelHeader extends OakComponent {
  getRenderProps(props) {
    props = { ...props };

    // Add known className
    props.className = classNames("oak PanelHeader", props.className);

    // height => style.height
    if (props.height) {
      props.style = mergeProps(props.style, { height: props.height });
      delete props.height;
    }

    return props;
  }

	render() {
	  if (this.hidden) return null;
    const props = this.getRenderProps(this.props);
    return React.createElement("header", props, ...props.children);
  }
}


// <PanelFooter> class inside a <Panel>
export class PanelFooter extends OakComponent {
  getRenderProps(props) {
    props = { ...props };
    props.className = classNames("oak PanelFooter", props.className);

    // height => style.height
    if (props.height) {
      props.style = mergeProps(props.style, { height: props.height });
      delete props.height;
    }
    return props;
  }

	render() {
	  if (this.hidden) return null;
    const props = this.getRenderProps(this.props);
    return React.createElement("footer", props, props.children);
  }
}


// <LeftSidebar> class inside a <Panel>
export class LeftSidebar extends OakComponent {
  static propTypes = {
    ...OakComponent.propTypes,
    width: PropTypes.number,
  }

  getRenderProps(props) {
    props = { ...props };
    props.className = classNames("oak LeftSidebar", props.className);
    // width => style.width
    if (props.width) {
      props.style = mergeProps(props.style, { width: props.width });
      delete props.width;
    }
    return props;
  }

	render() {
	  if (this.hidden) return null;
    const props = this.getRenderProps(this.props);
    return React.createElement("div", props, props.children);
  }
}


// <RightSidebar> class inside a <Panel>
export class RightSidebar extends OakComponent {
  getRenderProps(props) {
    props = { ...props };
    props.className = classNames("oak RightSidebar", props.className);
    // width => style.width
    if (props.width) {
      props.style = mergeProps(props.style, { width: props.width });
      delete props.width;
    }
    return props;
  }

	render() {
	  if (this.hidden) return null;
    const props = this.getRenderProps(this.props);
    return React.createElement("div", props, props.children);
  }
}


//
//  Panel sizing:
//  Set ALL <Oak.Panel scrolling> body element heights, from the outside in.
//  This is called on a slight delay after drawing.
//

const DEBUG_SCROLL = true;
function _setScrollBodyHeights() {
  const $scrollingPanels = $(".oak.scrolling.Panel");
  if (DEBUG_SCROLL) console.info("setScrollBodyHeights", $scrollingPanels);
  if ($scrollingPanels.length === 0) return;

  // first reset all body heights so we get an accurate measurement
  $scrollingPanels.children(".body").height(1);

  // now size bodies according to panel size
  $scrollingPanels.each(function (index, panel) {
    const $panel = $(panel);
    const panelHeight = $panel.innerHeight();
    const headerHeight = $panel.children(".oak.PanelHeader").outerHeight();
    const footerHeight = $panel.children(".oak.PanelFooter").outerHeight();
    const bodyHeight = panelHeight - headerHeight - footerHeight;

    const $body = $panel.children(".body");
    $body.height(bodyHeight);
  });
}

// Actually set scrollBodyHeights on an immediate debounce.
const setScrollBodyHeights = fn.debounce(_setScrollBodyHeights, 0);

// And make sure heights are set on resize with a larger throttle.
$(window).on("resize", fn.throttle(_setScrollBodyHeights, 100));

