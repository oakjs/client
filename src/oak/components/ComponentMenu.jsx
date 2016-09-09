//////////////////////////////
//
//  Menu showing a list of components.
//
//////////////////////////////

import React, { PropTypes } from "react";
import { classNames } from "oak-roots/util/react";

function getComponentItemProps(component, menuProps) {
  const active = (component === menuProps.selected);
  const itemProps = {
    key: component.path,
    label: component.title,
    className: classNames("ProjectMenu", { active } ),
    onClick: () => oak.actions.navigateTo({ route: component.route })
  }

  if (menuProps.checkSelected) itemProps.icon = (active ? "checkmark" : "none");

  return itemProps;
}

export default function ComponentMenu(props, context) {
  const { oak } = context;
  const { Oak, SUI } = context.components;
  let { components, checkSelected, emptyMessage, publicOnly, selected } = props;

  // Forget it if we didn't get any component to render
  if (!components) return null;

  // NOTE: this implicitly references the `account` singleton.
  if (publicOnly) components = components.filter(component => !component.isPrivate)

  let menuItems;
  if (components.length === 0) {
    menuItems = <SUI.MenuHeader disabled title={emptyMessage}/>
  }
  else {
    menuItems = components.map(component => <SUI.MenuItem {...getComponentItemProps(component, props)}/>);
  }

  // pass all props including className along to menu
  return React.createElement(SUI.Menu, props, menuItems);
}

ComponentMenu.propTypes = {
  publicOnly: PropTypes.bool,       // If `true`, we only show published components.
  checkSelected: PropTypes.bool,    // If `true`, we check the selected component in the menu.
  emptyMessage: PropTypes.string,   // Message to show if there are no components.
}

ComponentMenu.defaultProps = {
  publicOnly: true,
  className: "ComponentMenu",
  emptyMessage: "(Nothing to show)"
}

// Pull context in so we can get components and pointer to the current section.
ComponentMenu.contextTypes = {
  components: PropTypes.any
};


// Export subclasses for Projects | Sections | Pages
export function ProjectMenu(props, context) {
  return <ComponentMenu className="ProjectMenu" components={oak.projects} selected={oak.project} {...props}/>;
}

export function SectionMenu(props, context) {
  return <ComponentMenu className="SectionMenu" components={oak.project && oak.project.sections} selected={oak.section} {...props}/>;
}

export function PageMenu(props, context) {
  return <ComponentMenu className="PageMenu" components={oak.section && oak.section.pages} selected={oak.page} {...props}/>;
}


// Oak editor prefs
import { editify } from "../EditorProps";
editify({ draggable: true, droppable: false }, ComponentMenu);
