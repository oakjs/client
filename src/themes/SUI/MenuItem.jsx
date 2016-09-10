"use strict"
//////////////////////////////
//
//  <MenuItem> component for use with SemanticUI
//
//////////////////////////////

import React, { PropTypes } from "react";
import { classNames } from "oak-roots/util/react";

import ElementBuffer from "./ElementBuffer";

import MenuHeader from "./MenuHeader";
import Divider from "./Divider";

import "./MenuItem.css";

// `appearance`:  any combination of:
//    - `fitted`, `horizontally fitted`, `vertically fitted`
//    - `inverted`, `red`, `blue`, etc
//    -
function SUIMenuItem(props) {
  if (props.hidden) return null;
  const {
    className,
    value, label = value, hint, children,
    appearance, color, icon, image,
    active, hidden, disabled, down,
    href, onClick,
    // including id, style
    ...extraProps
  } = props;

  const isLinkish = (href || onClick);

  const elements = new ElementBuffer({
    type: (href ? "a" : "div"),
    props: {
      ...extraProps,
      className: [ className, appearance, color, { link: isLinkish, active, hidden, disabled, down }, "item"],
      "data-value": value,
      "data-text": label,
      href,
      onClick,
    }
  });

  if (icon) elements.appendIcon(icon);
  if (image) elements.appendIcon(image);
  if (hint) elements.appendWrapped("div", {className: "hint"}, hint);
  if (label) elements.append(label);
  if (children) elements.append(children);

  return elements.render();
}

SUIMenuItem.propTypes = {
  id: PropTypes.string,
  className: PropTypes.string,
  style: PropTypes.object,

  value: PropTypes.any,
  label: PropTypes.string,

  appearance: PropTypes.string,
  color: PropTypes.string,
  icon: PropTypes.any,
  image: PropTypes.any,

  active: PropTypes.bool,
  disabled: PropTypes.bool,
  down: PropTypes.bool,

  href: PropTypes.string,       // action to take when menu item is clicked
  onClick: PropTypes.func       // onClick action

};

// add render() method so we get hot code reload.
SUIMenuItem.render = Function.prototype;

export default SUIMenuItem;
