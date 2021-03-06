import React, { PropTypes } from "react";

import oak from "oak/oak";
import { RunnerProject } from "oak/components/ComponentProxy";

import AppRoute from "./AppRoute";

function _normalizeInt(value) {
  if (typeof value === "string") {
    const intValue = parseInt(value, 10);
    if (""+intValue === value) return intValue;
  }
  return value;
}

export default class PageRoute extends AppRoute {
  static childContextTypes = {
    ...AppRoute.childContextTypes,
    page: PropTypes.any,
    components: PropTypes.any
  }

  getChildContext() {
    return {
      ...super.getChildContext(),
      page: oak.page,
      components: oak.components
    }
  }

  render() {
    // get params from the URL and extra stuff stuck directly on the <Route> object
    const params = Object.assign({}, this.props.params, this.props.route);
//    console.dir(params);

    //
    // attempt to load the "Runner" Page
    //
    const { runnerProjectId = "_runner", runnerSectionId = "player", runnerPageId = "showPage" } = params;
    const runnerPage = oak.account.getPage(runnerProjectId, runnerSectionId, runnerPageId);
    // if we got a loaded page:
    if (runnerPage && runnerPage.isLoaded) {
      // assign it to `oak.runner.page` so we'll show it below
      oak.setRunnerPage(runnerPage);
    }
    else {
      // Otherwise if we didn't get a page, or the page hasn't started loading yet
      if (!runnerPage || !runnerPage.isLoading) {
        // load it and then redraw
        oak.account.loadPage(runnerProjectId, runnerSectionId, runnerPageId)
          .then( page => {
            if (this._isMounted) {
              console.log("loaded runner page, updating ");
              this.forceUpdate();
            }
          })
//           .catch(e => {
//             console.error(e);
//             console.log(`Page ${runnerProjectId}/${runnerSectionId}/${runnerPageId} not found!!!`);
//           });
      }
    }

    //
    // attempt to load the "Current" Page
    //
    // NOTE: account for numeric indexes sent as params
    const appProjectId = _normalizeInt(params.appProjectId) || 1;
    const appSectionId = _normalizeInt(params.appSectionId) || 1;
    const appPageId = _normalizeInt(params.appPageId) || 1;

    if (runnerPage && appProjectId !== undefined) {
      const appPage = oak.account.getPage(appProjectId, appSectionId, appPageId);
      // if we got a loaded page
      if (appPage && appPage.isLoaded) {
        // assign it to `oak.page` so `<CurrentPage>` will show it
        oak.setCurrentPage(appPage);
      }
      else {
        // Otherwise if we didn't get a page, or the page hasn't started loading yet
        if (!appPage || !appPage.isLoading) {
          // load it and then redraw
          oak.account.loadPage(appProjectId, appSectionId, appPageId)
            .then( page => {
              if (this._isMounted) {
                console.log("loaded oak page, updating ");
                this.forceUpdate();
              }
            })
  //           .catch(e => {
  //             console.error(e);
  //             console.log(`Page ${appProjectId}/${appSectionId}/${appPageId} not found!!!`);
  //           });
        }
      }
    }

    // Render the runner, which will (eventually) render the current page.
    if (oak.runner.page && oak.runner.page.project) {
      return React.createElement(RunnerProject, params);
    }
    // otherwise return `false` to tell react not to render yet.
    else {
      return false;
    }
  }
}
