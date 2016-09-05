//////////////////////////////
// Section class
//////////////////////////////

import ids from "oak-roots/util/ids";
import LoadableIndex from "oak-roots/LoadableIndex";
import { proto } from "oak-roots/util/decorators";
import { dieIfMissing } from "oak-roots/util/die";

import api from "./api";
import ComponentController from "./ComponentController";
import oak from "./oak";
import Page from "./Page";

import SectionComponent from "./components/Section";

export default class Section extends ComponentController {
  constructor(props) {
    super(props);
    dieIfMissing(this, "new Section", ["sectionId", "projectId"]);
  }

  @proto
  type = "section";

  @proto
  ComponentSuperConstructor = SectionComponent;


  //////////////////////////////
  //  Standard Component Identity stuff
  //////////////////////////////

  static splitPath(path) {
    const split = path.split("/");
    return { projectId: split[0], sectionId: split[1] }
  }

  get id() { return this.sectionId }
  set id(id) { this.sectionId = id }

  get parent() { return this.project }
  get parentIndex() { return this.project.childIndex }
  get childIndex() { return this.pageIndex }
  get children() { return this.pages }

  getIndexData() { return { id: this.sectionId, title: this.title } }

  get route() { return oak.getPageRoute(this.projectId, this.sectionId) }

  //////////////////////////////
  //  Syntactic sugar
  //////////////////////////////

  get project() { return oak.account.getProject(this.projectId) }
  get pageIds() { return this.childIds }

  //////////////////////////////
  //  Components
  //////////////////////////////

  // TODO: dynamic components
  get components() { return this.project.components }

  get component() { if (oak.section === this) return oak._sectionComponent }

  //////////////////////////////
  //  Pages
  //////////////////////////////

  get pageIndex() { return this._index || (this._index = this._makeIndex()) }

  get pages() { return this.pageIndex.items }

  getPage(pageIdentifier) {
    return this.pageIndex.getItem(pageIdentifier);
  }

  loadPage(pageIdentifier) {
    return this.pageIndex.loadItem(pageIdentifier);
  }

  //////////////////////////////
  //  Initialization / Loading / Saving
  //////////////////////////////

  // Create the pageIndex on demand.
  _makeIndex() {
    return new LoadableIndex({
      itemType: "page",
      loadData: () => {
        return api.loadPageIndex(this.path);
      },
      createItem: (pageId, props) => {
        return new Page({
          pageId,
          sectionId: this.sectionId,
          projectId: this.projectId,
          ...props,
        });
      }
    });
  }
}


//////////////////////////////
// SectionElement class
//////////////////////////////

import JSXElement from "./JSXElement";

// Create a specialized `SectionElement` and export it
export class SectionElement extends JSXElement {
  static renderVars = {
    ...JSXElement.renderVars,
    _controller: "context._controller",
    oak: "context.oak",
    page: "context.page",
    section: "context.section",
    project: "context.project",
    components: "context.components",
    data: "this.data || {}"
  }
  // Render out outer element as a div with only a few properties
  renderType = "div";

  // Use `getRenderProps()` to massage the props passed in
  _propsToSource(options, indent) {
    const propSource = super._propsToSource(options, indent);
    return `this.getRenderProps(${propSource})`;
  }
}

// Register it so `<Oak-Section>` elements in a jsxe will use `SectionElement`.
import JSXParser from "./JSXParser";
JSXParser.registerType("Section", SectionElement);
JSXParser.registerType("Oak-Section", SectionElement);
