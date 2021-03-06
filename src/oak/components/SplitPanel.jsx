//////////////////////////////
//
//  <Oak.SplitPanel> component for use with oak e.g.:
//
//    <Oak.SplitPanel>
//      <Some-Element/>
//      <Some-Other-Element/>
//    </Oak.SplitPanel>
//
//  NOTE: only works with TWO internal components
//
//
//  TODO:
//  - `resizable`
//      - add a splitter div
//      - remember sizes somehow
//
//////////////////////////////

import React, { Children, Component, PropTypes } from "react";
import ReactDOM from "react-dom";

import fn from "oak-roots/util/fn";
import { classNames, unknownProps } from "oak-roots/util/react";

import OakComponent from "./OakComponent";

import "./SplitPanel.less";

export default class SplitPanel extends OakComponent {
  static propTypes = {
    ...OakComponent.propTypes,

    // direction? e.g. direction="vertical" means divide panel up into vertical chunks.
    direction: PropTypes.oneOf(["horizontal","vertical"]),

    // Do we automatically set up scrolling in the panes?
    scrolling: PropTypes.bool,

    // Can the user resize the panes?
    resizable: PropTypes.bool,

    // Appearance:  "inverted", "bordered", "fluid"
    appearance: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.arrayOf(PropTypes.string)
    ]),

    // Ratio of components, eg: `[ "50%", "50%" ]` or `[ 30, "100%" ]`
    sizes: PropTypes.array
  }

  static defaultProps = {
    direction: "vertical",
    resizable: false,
    sizes: [ "50%", "50%" ]
  }


  componentDidMount() {
    super.componentDidMount();
    this.setChildSizes();
  }

  componentDidUpdate() {
    super.componentDidUpdate();
    this.setChildSizes();
  }

  setChildSizes() {
    const { direction, sizes } = this._props;
    if (!sizes) return;

    const $root = this.$getElement();
    const $children = $root.children(":not(.oak.divider)");

    sizes.forEach( (size, index) => {
      const child = $children[index];
      if (!child) return;

      const flex = (typeof size === "number" ? 0 : 1);
      const sizeString = (typeof size === "number" ? `${size}px` : size);

      child.style.flex = `${flex} ${flex} ${sizeString}`;
    });
  }

  mungeChildren(props) {
    const { resizable, scrolling, appearance } = props;
    let children = Children.toArray(props.children);

    // if scrolling, wrap children in a "Scroller" div
    if (scrolling) {
      children = children.map( child => <div className="oak Scroller">{child}</div> );
    }

    // if resizable, interleave `<div.oak.divider>` divs.
    if (resizable || (appearance && appearance.split(" ").includes("bordered"))) {
      const interleaved = children.map( (child, index) => {
        if (index === 0) return child;
        return [<div className="oak divider"/>, child];
      });
      // flatten the interleaved list
      children = [].concat(...interleaved);
    }

    return children;
  }

  // Clone and munge the props before rendering.
  mungeProps(props) {
    props = { ...props };
    let { appearance, className, direction, resizable, scrolling, } = props;

    // Add standard classNames to those passed in with `props`
    props.className = classNames(
      "oak",
      appearance,
      { scrolling, resizable },
      direction,
      "SplitPanel",
      className
    );

    // munge children
    props.children = this.mungeChildren(props);

    return props;
  }

  getRenderProps(props) {
    return unknownProps(props, this.constructor, "id", "className", "style")
  }

  render() {
    if (this.hidden) return null;
    // Munge props and remember for `setChildSizes` above
    const props = this._props = this.mungeProps(this.props);

    // only apply unknown properties to the root element
    const elementProps = this.getRenderProps(props);
    return React.createElement("div", elementProps, ...props.children);
  }

}
