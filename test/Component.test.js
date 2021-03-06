import "babel-core/external-helpers";
import { expect } from "chai";
import nock from "nock";

import Component from "../src/oak/redux/Component";
import api from "../src/oak/api";

// Set up mock redux store
import { combineReducers, createStore, applyMiddleware } from "redux";
import thunk from "redux-thunk";

import configureMockStore from "redux-mock-store";
const mockStore = configureMockStore([ thunk ]);

const reducers = combineReducers({
  componentMap: Component.reducer
});


// Mock up store, run before each test.
let store;
function initStore() {
  store = Component.store = createStore(reducers, applyMiddleware(thunk));
}

// Make sure bootstrap worked...
describe("The Component module", () => {
  // Create a new store and assign it to Component before each test
  beforeEach(initStore);

  it("has all of the expected bits", () => {
    expect(Component).to.be.a("function");
    expect(Component.reducer).to.be.a("function");
    expect(Component.actions).to.be.an("object");
  });

  it("gets componentMap properly", () => {
    expect(Component.componentMap).to.be.an("object");
    expect(Component.componentMap).to.be.empty;
  });

  it("joins paths as expected", () => {
    expect(Component.joinPath(undefined, Component.ACCOUNT_PATH)).to.equal(Component.ACCOUNT_PATH);
    expect(Component.joinPath("/", "foo")).to.equal("/foo");
    expect(Component.joinPath("/foo", "bar")).to.equal("/foo/bar");
  });

  it("splits paths as expected", () => {
    expect(Component.splitPath("/")).to.deep.equal([ undefined, "/"]);
    expect(Component.splitPath("/foo")).to.deep.equal([ "/", "foo"]);
    expect(Component.splitPath("/foo/bar")).to.deep.equal([ "/foo", "bar"]);
  });

  it("does getParentPath() correctly", () => {
    expect(Component.getParentPath("/")).to.equal(undefined);
    expect(Component.getParentPath("/foo")).to.equal("/");
    expect(Component.getParentPath("/foo/bar")).to.equal("/foo");
  })
});


describe("Component instances", () => {
  it("can be created directly with a single path argument", () => {
    const component = new Component("/foo/bar");
    expect(component).to.be.an.instanceof(Component);
    expect(component).to.deep.equal({ path: "/foo/bar" });
  });

  it("can be created directly with a single object arguments", () => {
    const component = new Component({ path: "/foo/bar" });
    expect(component).to.be.an.instanceof(Component);
    expect(component).to.deep.equal({ path: "/foo/bar" });
  });

  it("can be created directly with multiple object arguments", () => {
    const component = new Component({ path: "/foo/bar" }, { type: "Project" });
    expect(component).to.be.an.instanceof(Component);
    expect(component).to.deep.equal({ path: "/foo/bar", type: "Project" });
  });

  it("cannot be modified", () => {
    const component = new Component("/foo/bar");
    expect(() => component.foo = "bar").to.throw(TypeError);
    expect(() => component.path = "bar").to.throw(TypeError);
  });

  it("return parentPath and id correctly", () => {
    const account = new Component(Component.ACCOUNT_PATH);
    expect(account.parentPath).to.be.undefined;
    expect(account.id).to.equal(Component.ACCOUNT_PATH);

    const project = new Component("/foo");
    expect(project.parentPath).to.equal(Component.ACCOUNT_PATH);
    expect(project.id).to.equal("foo");

    const page = new Component("/foo/bar/baz");
    expect(page.parentPath).to.equal("/foo/bar");
    expect(page.id).to.equal("baz");
  });

  it("is unloaded when created", () => {
    const component = new Component("/foo/bar");
    expect(component.isUnloaded).to.be.true;
    expect(component.isLoading).to.be.false;
    expect(component.isLoaded).to.be.false;
    expect(component.loadError).to.be.undefined;
  });

  it("returns `isLoading` when loading", () => {
    let component = new Component({ path: "/foo/bar", loadState: "loading" });
    expect(component.isUnloaded).to.be.false;
    expect(component.isLoading).to.be.true;
    expect(component.isLoaded).to.be.false;
    expect(component.loadError).to.be.undefined;
  });

  it("returns `isLoaded` when loading", () => {
    let component = new Component({ path: "/foo/bar", loadState: "loaded" });
    expect(component.isUnloaded).to.be.false;
    expect(component.isLoading).to.be.false;
    expect(component.isLoaded).to.be.true;
    expect(component.loadError).to.be.undefined;
  });

  it("returns `loadError` when error returned on load", () => {
    let component = new Component({ path: "/foo/bar", loadState: new Error("OOPS") });
    expect(component.isUnloaded).to.be.false;
    expect(component.isLoading).to.be.false;
    expect(component.isLoaded).to.be.false;
    expect(component.loadError).to.not.be.undefined;
  });



//TODO: getChildren
//TODO: getDataToSave
//TODO: toJSON


});

// Configure component reducers
describe("Component reducers", () => {
  // Create a new store and assign it to Component before each test
  beforeEach(initStore);

  it("have store properly set up to start", () => {
    expect(Component.store).to.exist;
    const state = store.getState();
    expect(state).to.be.an("object");
    expect(state.componentMap).to.be.an("object");
    expect(state.componentMap).to.be.empty;
  })

  it("correctly process the LOAD_ACCOUNT action", () => {
    const path = Component.ACCOUNT_PATH;

    store.dispatch({ type: "LOAD_ACCOUNT", path });

    const { componentMap } = store.getState();

    // same shape
    const mapData = { [path] : { path, type: "Account", loadState: "loading" } };
    expect(componentMap).to.deep.equal(mapData)
    // instance of Component
    const account = componentMap[path];
    expect(account).to.be.an.instanceof(Component);
    // same object when we do Component.get()
    expect(account).to.equal(Component.get(path));
    expect(account).to.equal(Component.get(path, componentMap));
    // same object when we do `Component.getAccount()`
    expect(account).to.equal(Component.getAccount());
    expect(account).to.equal(Component.getAccount(componentMap));
    // load state
    expect(account.isUnloaded).to.be.false;
    expect(account.isLoading).to.be.true;
    expect(account.isLoaded).to.be.false;
    expect(account.loadError).to.be.undefined;
    // toJSON
    const accountJSON = { path, type: "Account", loadState: "loading" };
    expect(account.toJSON()).to.deep.equal(accountJSON);
  });

  it("correctly process the LOADED_ACCOUNT action", () => {
    const path = Component.ACCOUNT_PATH;
    const loadData = {
      index: [ { id: "foo", type: "Project", title: "FOOO" } ]
    };
    // account object set up
    const projectPath = "/foo";
    const accountIndex = { ALL: [projectPath], Project: [projectPath] };
    const accountData = { path, type: "Account", loadState: "loaded", index: accountIndex };

    store.dispatch({ type: "LOAD_ACCOUNT", path });
    const originalAccount = Component.get(path);

    store.dispatch({ type: "LOADED_ACCOUNT", path, data: loadData });

    const { componentMap } = store.getState();
    const newAccount = componentMap[path];
    // make sure account has changed
    expect(newAccount).to.not.equal(originalAccount);
    expect(newAccount).to.deep.equal(accountData);
    expect(newAccount.toJSON()).to.deep.equal(accountData);
    expect(newAccount.isUnloaded).to.be.false;
    expect(newAccount.isLoading).to.be.false;
    expect(newAccount.isLoaded).to.be.true;
    expect(newAccount.loadError).to.be.undefined;

    // project is of correct shape
    const projectData = { path: projectPath, type: "Project", title: "FOOO" };
    const project = componentMap[projectPath];

    expect(project).to.deep.equal(projectData);
    expect(project).to.equal(Component.get(projectPath));
    expect(project).to.be.an.instanceof(Component);

    // account index set up properly
    expect(newAccount.childPaths).to.deep.equal([projectPath]);
    expect(newAccount.getChildPaths("Project")).to.deep.equal([projectPath]);
    expect(newAccount.children).to.deep.equal([project]);
    expect(newAccount.getChildren("Project")).to.deep.equal([project]);
  });

  it("correctly process errors in the LOADED_ACCOUNT action", () => {
    const path = Component.ACCOUNT_PATH;

    store.dispatch({ type: "LOAD_ACCOUNT", path });
    const originalAccount = Component.get(path);

    store.dispatch({ type: "LOADED_ACCOUNT", path, error: "OOPS" });
    const { componentMap } = store.getState();
    const newAccount = componentMap[path];

    // make sure account has changed
    expect(newAccount).to.not.equal(originalAccount);

    // account object set up
    const accountData = { path, type: "Account", loadState: new Error("OOPS") };
    expect(newAccount).to.deep.equal(accountData);
    expect(newAccount.isUnloaded).to.be.false;
    expect(newAccount.isLoading).to.be.false;
    expect(newAccount.isLoaded).to.be.false;
    expect(newAccount.loadError).to.not.be.undefined;
  });
});

describe("Component actions", () => {
  // Create a new store and assign it to Component before each test
  beforeEach(initStore);

  it("execute loadAccount() as expected", () => {
    const path = Component.ACCOUNT_PATH;
    const projectPath = "/foo";
    // mock api calls
    api.loadProjectIndex = () => Promise.resolve({
      index: [ { id: "foo", type: "Project", title: "FOOO" } ]
    });

    return Component.actions.loadAccount()
      .then(() => {
        const account = Component.getAccount();
        const accountIndex = { ALL: [projectPath], Project: [projectPath] };
        const accountData = { path: path, type: "Account", loadState: "loaded", index: accountIndex };
        expect(account).to.be.an.instanceof(Component);
        expect(account).to.deep.equal(accountData);
        expect(account.isUnloaded).to.be.false;
        expect(account.isLoading).to.be.false;
        expect(account.isLoaded).to.be.true;
        expect(account.loadError).to.be.undefined;

        // project is of correct shape
        const projectData = { path: projectPath, type: "Project", title: "FOOO" };
        const project = Component.get(projectPath);
        expect(project).to.be.an.instanceof(Component);
        expect(project).to.deep.equal(projectData);
        expect(project.isUnloaded).to.be.true;
        expect(project.isLoading).to.be.false;
        expect(project.isLoaded).to.be.false;
        expect(project.loadError).to.be.undefined;
      });
  });

  it("execute loadAccount() as expected when error returned", () => {
    const path = Component.ACCOUNT_PATH;
    const projectPath = "/foo";
    // mock api calls
    api.loadProjectIndex = () => Promise.reject("OOPS");

    return Component.actions.loadAccount()
      .then(() => {
        const account = Component.getAccount();
        const accountData = { path: path, type: "Account", loadState: new Error("OOPS") };
        expect(account).to.be.an.instanceof(Component);
        expect(account).to.deep.equal(accountData);
        expect(account.isUnloaded).to.be.false;
        expect(account.isLoading).to.be.false;
        expect(account.isLoaded).to.be.false;
        expect(account.loadError).to.not.be.undefined;
    })
  });

  it("execute loadComponent() as expected", () => {
    const projectPath = "/foo";
    const projectIndexData = { type: "Project", title: "FOO" };
    const projectLoadData = {
      css: "div { color: red }",
      js: "function() {}",
      jsx: "class Foo extends Component {}",
      jsxe: "<div/>",
    }
    const pagePath = "/foo/bar";
    const pageIndexData = { type: "Page", title: "BAAR" };

    // mock api calls
    api.loadProjectIndex = () => Promise.resolve({
      index: [ { id: "foo", ...projectIndexData } ]
    });
    api.loadComponentBundle = () => Promise.resolve({
      ...projectLoadData,
      index: [ { id: "bar", ...pageIndexData } ]
    });

    return Component.actions.loadAccount()
      .then(() => Component.actions.loadComponent(projectPath))
      .then(() => {
        const account = Component.getAccount();
        const accountIndex = { ALL: [projectPath], Project: [projectPath] };
        const accountData = { path: Component.ACCOUNT_PATH, type: "Account", loadState: "loaded", index: accountIndex };
        expect(account).to.be.an.instanceof(Component);
        expect(account).to.deep.equal(accountData);
        expect(account.isUnloaded).to.be.false;
        expect(account.isLoading).to.be.false;
        expect(account.isLoaded).to.be.true;
        expect(account.loadError).to.be.undefined;

        // project is of correct shape
        const projectData = {
          path: projectPath,
          index: { ALL: [pagePath], Page: [pagePath] },
          loadState: "loaded",
          ...projectIndexData,
          ...projectLoadData
        };
        const project = Component.get(projectPath);
        expect(project.toJSON()).to.deep.equal(projectData);
        expect(project).to.be.an.instanceof(Component);
        expect(project.isUnloaded).to.be.false;
        expect(project.isLoading).to.be.false;
        expect(project.isLoaded).to.be.true;
        expect(project.loadError).to.be.undefined;

        // page is of correct shape
        const pageData = { path: pagePath, ...pageIndexData };
        const page = Component.get(pagePath);
        expect(page).to.be.an.instanceof(Component);
        expect(page).to.deep.equal(pageData);
        expect(page.isUnloaded).to.be.true;
        expect(page.isLoading).to.be.false;
        expect(page.isLoaded).to.be.false;
        expect(page.loadError).to.be.undefined;
      })
  });

  it("execute reloadComponent() with same data with minimal churn", () => {
    const pagePath = "/foo/bar";
    const pageIndexData = { type: "Page", title: "BAAR" };
    const pageData = { path: pagePath, ...pageIndexData };

    const projectPath = "/foo";
    const projectIndexData = { type: "Project", title: "FOO" };
    const projectLoadData = {
      css: "div { color: red }",
      js: "function() {}",
      jsx: "class Foo extends Component {}",
      jsxe: "<div/>",
    }
    const projectData = {
      path: projectPath,
      index: { ALL: [pagePath], Page: [pagePath] },
      loadState: "loaded",
      ...projectIndexData,
      ...projectLoadData
    };

    // mock api calls
    api.loadProjectIndex = () => Promise.resolve({
      index: [ { id: "foo", ...projectIndexData } ]
    });
    api.loadComponentBundle = () => Promise.resolve({
      ...projectLoadData,
      index: [ { id: "bar", ...pageIndexData } ]
    });

    var account, project, page;
    return Component.actions.loadAccount()
      .then(() => Component.actions.loadComponent(projectPath))
      .then(() => {
        account = Component.getAccount();
        expect(account).to.be.an.instanceof(Component);

        // project is of correct shape
        project = Component.get(projectPath);
        expect(project).to.be.an.instanceof(Component);
        expect(project.toJSON()).to.deep.equal(projectData);

        // page is of correct shape
        page = Component.get(pagePath);
        expect(page).to.be.an.instanceof(Component);
        expect(page).to.deep.equal(pageData);
      })
      // reload with the same data
      .then(() => Component.actions.reloadComponent(projectPath))
      .then(() => {
        // account shouldn't change
        const newAccount = Component.getAccount();
        expect(newAccount).to.be.an.instanceof(Component);
        expect(newAccount).to.equal(account);

        // project changed because its `loadState` changed while it was loading... :-(
        // but it's functionally equivalent
        const newProject = Component.get(projectPath);
        expect(newProject).to.be.an.instanceof(Component);
        expect(newProject).to.not.equal(project);
        expect(newProject).to.deep.equal(project);

        // page should't change!
        const newPage = Component.get(pagePath);
        expect(newPage).to.be.an.instanceof(Component);
        expect(newPage).to.equal(page);
      });
  });

  it("correctly updates children on reloadComponent() with different data", () => {
    const projectPath = "/foo";
    const barPath = "/foo/bar";
    const bonkPath = "/foo/bonk";

    // mock api calls
    api.loadProjectIndex = () => Promise.resolve({
      index: [ { id: "foo", type: "Project", title: "FOO" } ]
    });

    api.loadComponentBundle = () => Promise.resolve({
      index: [ { id: "bar", type: "Page", title: "BAAR" } ]
    });

    return Component.actions.loadAccount()
      .then(() => Component.actions.loadComponent(projectPath))
      // reload with the DIFERENT data
      .then(() => {
        // change api results
        api.loadComponentBundle = () => Promise.resolve({
          index: [ { id: "bonk", type: "Section", title: "BONK" } ]
        });
        return Component.actions.reloadComponent(projectPath);
      })
      .then(() => {
        // project has new index
        const project = Component.get(projectPath);
        expect(project).to.be.an.instanceof(Component);
        expect(project).to.deep.equal({
          path: projectPath,
          index: { ALL: [bonkPath], Section: [bonkPath] },
          loadState: "loaded",
          type: "Project",
          title: "FOO"
        });

        // bar page should be gone
        const barPage = Component.get(barPath);
        expect(barPage).to.be.undefined;

        // bonk page should be present
        const bonkPage = Component.get(bonkPath);
        expect(bonkPage).to.be.an.instanceof(Component);
        expect(bonkPage).to.deep.equal({
          path: bonkPath,
          type: "Section",
          title: "BONK"
        });
      });
  });


// TODO: loadComponent() returning an error
// TODO: reloadComponent()
// TODO: unloadComponent()


});
