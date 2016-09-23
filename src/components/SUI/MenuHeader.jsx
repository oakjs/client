//////////////////////////////
//  <MenuHeader> component
//////////////////////////////

import React, { PropTypes } from "react";
import { classNames } from "oak-roots/util/react";

import ElementBuffer from "./ElementBuffer";

function SUIMenuHeader(props) {
  if (props.hidden) return null;
  const {
    hidden, className,
    icon, label, children,
    // including id, style
    ...extraProps
  } = props;

  const elements = new ElementBuffer({
    props: {
      ...extraProps,
      className: [className, "header item"]
    }
  });

  if (icon) elements.appendIcon(icon);
  if (label) elements.append(label);
  if (children) elements.append(children);

  return elements.render();
}

SUIMenuHeader.propTypes = {
  id: PropTypes.string,
  className: PropTypes.string,
  style: PropTypes.object,

  icon: PropTypes.string,
  label: PropTypes.string,
};

// add render() method so we get hot code reload.
SUIMenuHeader.render = Function.prototype;

export default SUIMenuHeader;
