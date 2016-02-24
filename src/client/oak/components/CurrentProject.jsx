import React, { PropTypes } from "react";
import Stub from "./Stub";

export default function CurrentProject(props, context) {
  const project = context.app.project;
  if (!project) return <Stub/>;
  return React.createElement(project.ComponentConstructor);
}

CurrentProject.contextTypes = {
  app: PropTypes.any,
}