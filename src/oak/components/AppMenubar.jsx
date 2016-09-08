//////////////////////////////
//  Menubar for the entire app.
//  TODO: the actual <AppMenu> contents should come from project component...
//  TODO: allow runner project/section/page to add menus & menuItems
//////////////////////////////

import React, { PropTypes } from "react";
import { classNames } from "oak-roots/util/react";

import OakComponent from "./OakComponent";
import "./AppMenubar.less";

export default class AppMenubar extends OakComponent {
  getProjectItems() {
    if (!oak.account || !oak.account.projects) return undefined;
    return oak.account.projects.map(project => {
      return {
        label: project.title,
        onClick: () => oak.actions.showProject({ project }),
        icon: (oak.project === project ? "checkmark" : "none")
      };
    })
  }

  getSectionItems() {
    if (!oak.project || !oak.project.sections) return undefined;
    return oak.project.sections.map(section => {
      return {
        label: section.title,
        onClick: () => oak.actions.showSection({ section }),
        icon: (oak.section === section ? "checkmark" : "none")
      };
    })
  }

  getPageItems() {
    if (!oak.section || !oak.section.pages) return undefined;
    return oak.section.pages.map(page => {
      return {
        label: page.title,
        onClick: () => oak.actions.showPage({ page }),
        icon: (oak.page === page ? "checkmark" : "none")
      };
    })
  }

  render() {
    if (this.hidden) return null;
    const { oak, components } = this.context;
    const { Oak, SUI } = components;
    // NOTE: Zindex MUST be above the <EditorToolbar> and <SelectionSidebar>
    return (
      <Oak.FixedPanel id="AppMenubar" appearance="inverted" style={{ zIndex: 100000 }}>

        <Oak.AppMenu text="OakJS">
          <SUI.MenuItem disabled label="About OakJS"/>
          <SUI.MenuItem disabled label="Get Help"/>
        </Oak.AppMenu>

        <Oak.AppMenu text="File">
          <SUI.MenuItem disabled label="Open Project..."/>
          <SUI.Submenu disabled label="Open Recent..."/>
          <SUI.MenuItem disabled label="Close Project"/>
        </Oak.AppMenu>

        <Oak.AppMenu text="Edit">
          <Oak.ActionItem id="oak.undo"/>
          <Oak.ActionItem id="oak.redo"/>
          <SUI.Divider/>
          <Oak.ActionItem id="oak.cutElements"/>
          <Oak.ActionItem id="oak.copyElements"/>
          <Oak.ActionItem id="oak.pasteElements"/>
          <Oak.ActionItem id="oak.removeElements"/>
          <SUI.Divider/>
          <Oak.ActionItem id="oak.selectAll"/>
          <Oak.ActionItem id="oak.deselectAll"/>
        </Oak.AppMenu>

        <Oak.AppMenu text="Project">
          <SUI.MenuItem disabled label={`Project: “${oak.project && oak.project.title}”`}/>
          <SUI.MenuItem disabled label="Project Settings..."/>
          <Oak.ActionItem id="oak.saveProject"/>
          <Oak.ActionItem id="oak.startEditingProject"/>
          <Oak.ActionItem id="oak.stopEditingProject"/>
          <SUI.Divider/>
          <SUI.Submenu label="Show Project:" items={this.getProjectItems()}/>
          <SUI.Divider/>
          <Oak.ActionItem id="oak.showFirstProject"/>
          <Oak.ActionItem id="oak.showPreviousProject"/>
          <Oak.ActionItem id="oak.showNextProject"/>
          <Oak.ActionItem id="oak.showLastProject"/>
          <SUI.Divider/>
          <Oak.ActionItem id="oak.createProject"/>
          <Oak.ActionItem id="oak.deleteProject"/>
          <Oak.ActionItem id="oak.renameProject"/>
          <Oak.ActionItem id="oak.duplicateProject"/>
        </Oak.AppMenu>

        <Oak.AppMenu text="Section">
          <SUI.MenuItem disabled label={`Section: “${oak.section && oak.section.title}”`}/>
          <SUI.MenuItem disabled label="Section Settings..."/>
          <Oak.ActionItem id="oak.saveSection"/>
          <Oak.ActionItem id="oak.startEditingSection"/>
          <Oak.ActionItem id="oak.stopEditingSection"/>
          <SUI.Divider/>
          <SUI.Submenu label="Show Section:" items={this.getSectionItems()}/>
          <SUI.Divider/>
          <Oak.ActionItem id="oak.showFirstSection"/>
          <Oak.ActionItem id="oak.showPreviousSection"/>
          <Oak.ActionItem id="oak.showNextSection"/>
          <Oak.ActionItem id="oak.showLastSection"/>
          <SUI.Divider/>
          <Oak.ActionItem id="oak.createSection"/>
          <Oak.ActionItem id="oak.deleteSection"/>
          <Oak.ActionItem id="oak.renameSection"/>
          <Oak.ActionItem id="oak.duplicateSection"/>
          <SUI.MenuItem disabled label="Rearrange Sections..."/>
        </Oak.AppMenu>

        <Oak.AppMenu text="Page">
          <SUI.MenuItem disabled label={`Page: “${oak.page && oak.page.title}”`}/>
          <SUI.MenuItem disabled label="Page Settings..."/>
          <Oak.ActionItem id="oak.savePage"/>
          <Oak.ActionItem id="oak.startEditingPage"/>
          <Oak.ActionItem id="oak.stopEditingPage"/>
          <SUI.Divider/>
          <SUI.Submenu label="Show Page:" items={this.getPageItems()}/>
          <SUI.Divider/>
          <Oak.ActionItem id="oak.showFirstPage"/>
          <Oak.ActionItem id="oak.showPreviousPage"/>
          <Oak.ActionItem id="oak.showNextPage"/>
          <Oak.ActionItem id="oak.showLastPage"/>
          <SUI.Divider/>
          <Oak.ActionItem id="oak.createPage"/>
          <Oak.ActionItem id="oak.deletePage"/>
          <Oak.ActionItem id="oak.renamePage"/>
          <Oak.ActionItem id="oak.duplicatePage"/>
          <SUI.MenuItem disabled label="Rearrange Pages..."/>
        </Oak.AppMenu>
      </Oak.FixedPanel>
    );
  }
}

// Oak editor prefs
import { editify } from "../EditorProps";
editify({ draggable: false, droppable: true }, AppMenubar);
