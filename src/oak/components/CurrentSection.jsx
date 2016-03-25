import React, { PropTypes } from "react";
import Stub from "./Stub";

export default class CurrentSection extends React.Component {
  static contextTypes = {
    app: PropTypes.any,
  }

  componentDidMount() {
    app.sectionComponent = this.refs.section;
  }

  componentDidUpdate() {
    app.sectionComponent = this.refs.section;
  }

  componentWillUpdate() {
    delete app.sectionComponent;
  }

  componentWillUnmount() {
    delete app.sectionComponent;
  }

  render() {
    const section = this.context.app.section;
    if (!section) return false;
    return React.createElement(section.Component, { ref: "section" });
  }
}
