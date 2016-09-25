import "./Cropper.css";
const { OakComponent } = oak.components.Oak;
export default class Cropper extends OakComponent {
  render() {
    const { width, height, children, showOnHover, ...cropperProps } = this.props;

    cropperProps.className = roots.react.classNames("Cropper", cropperProps.className, { showOnHover });
    cropperProps.style = Object.assign({ width, height }, cropperProps.style);

    return (
      <div {...cropperProps}>{children}</div>
    );
  }
}


import { editify } from "oak/EditorProps";
editify("", { droppable: true }, Cropper);
