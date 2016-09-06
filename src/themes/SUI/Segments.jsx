"use strict";
//////////////////////////////
//
//  <Segments> component for use with SemanticUI
//
//////////////////////////////

import React, { PropTypes } from "react";
import { classNames } from "oak-roots/util/react";

function SUISegments(props) {
  const { id, className, style, appearance, horizontal, children, ...extraProps } = props;

  const segmentsProps = {
    ...extraProps,
    id,
    className: classNames(className, "ui", appearance, { horizontal }, "segments"),
    style
  }
  return <div {...segmentsProps}>{children}</div>;
}

SUISegments.defaultProps = {}

SUISegments.propTypes = {
  id: PropTypes.string,
  className: PropTypes.string,
  style: PropTypes.object,

  appearance: PropTypes.string,   // "raised", "stacked", "piled"
  horizontal: PropTypes.bool
};

// add render() method so we get hot code reload.
SUISegments.render = Function.prototype;

export default SUISegments;
