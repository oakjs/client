//////////////////////////////
// Section class
//////////////////////////////

import ids from "oak-roots/util/ids";
import LoadableIndex from "oak-roots/LoadableIndex";
import { proto } from "oak-roots/util/decorators";
import { dieIfMissing } from "oak-roots/util/die";

import api from "./api";
import ComponentController from "./ComponentController";
import JSXElement from "./JSXElement";
import oak from "./oak";
import Page from "./Page";

import SectionComponent from "./components/Section";

export default class Section extends ComponentController {
  constructor(props) {
    super(props);
    dieIfMissing(this, "new Section", ["account", "sectionId", "projectId"]);
  }

  @proto
  type = "Section";

  @proto
  ComponentConstructor = SectionComponent;

  // Load as editable JSXE by default.
  @proto
  loadStyle = api.EDITABLE;

  //////////////////////////////
  //  Project + Page Syntactic sugar
  //////////////////////////////

  get project() { return this.parent }
  get pages() { return this.children }

  getPage(pageId) { return this.getChild(pageId) }
  loadPage(pageId) { return this.loadChild(pageId) }


  //////////////////////////////
  //  ChildController stuff
  //////////////////////////////

  // Map `id` to `sectionId`
  get id() { return this.sectionId }
  set id(id) { this.sectionId = id }

  get parent() { return this.account.getProject(this.projectId) }
  get route() { return this.account.getPageRoute(this.projectId, this.sectionId) }

  // Create the index of Pages/Components on demand.
  _makeChildIndex() {
    return new LoadableIndex({
      itemType: "page",
      loadData: () => {
        return api.loadControllerIndex(this);
      },
      createItem: (pageId, props) => {
        // Create a Page or a generic ComponentController?
        const Constructor = (props.type === "Component" ? ComponentController : Page);
        return new Constructor({
          pageId,
          sectionId: this.sectionId,
          projectId: this.projectId,
          account: this.account,
          ...props,
        });
      }
    });
  }

}

