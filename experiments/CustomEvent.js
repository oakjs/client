//////////////////////////////
// Cross-browser custom event for Eventful.
// Mimics a subset of the W3C Event interface
//////////////////////////////

export default class CustomEvent {
  constructor(type, props) {
    if (!type) throw new TypeError(`CustomEvent(${type}): invalid type`);
    this.type = type;
    this.timeStamp = Date.now();
    Object.assign(this, props);
    this._state = {};
    Object.freeze(this);
  }

  get currentTarget() { return this._state.currentTarget }
  _setCurrentTarget(target) { this._state.currentTarget = target }

  preventDefault() { this._state.defaultPrevented = true }
  isDefaultPrevented() { return !!this._state.defaultPrevented }

  stopPropagation() { this._state.propagationStopped = true }
  isPropagationStopped() { return !!this._state.propagationStopped }

  isCustom() { return true }
}

CustomEvent.prototype.bubbles = true;
CustomEvent.prototype.cancelable = true;
