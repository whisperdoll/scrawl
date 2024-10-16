import { forwardRef } from "react";
import "./Toolbar.scss";
import { tryParseInt } from "../lib/utils";
import GoogleIcon from "./GoogleIcon.tsx";
import { cx } from "../lib/utils.ts";

const colors = [
  "#FFFFFF",
  "#FF8080",
  "#80FF80",
  "#8080FF",
  "#FF80FF",
  "#80FFFF",
  "#FFFF80",
];

const Toolbar = forwardRef(
  (
    { path, tool, onToolChange, color, onColorChange, size, onSizeChange },
    ref
  ) => {
    return (
      <div className="Toolbar" ref={ref}>
        <button
          className={cx("tool", { selected: tool === "draw" })}
          onClick={() => onToolChange("draw")}
        >
          <GoogleIcon icon="stylus_note" />
          Draw
        </button>
        <button
          className={cx("tool", { selected: tool === "erase" })}
          onClick={() => onToolChange("erase")}
        >
          <GoogleIcon icon="ink_eraser" />
          Erase
        </button>
        <button
          className={cx("tool", { selected: tool === "select" })}
          onClick={() => onToolChange("select")}
        >
          <GoogleIcon icon="select" />
          Select
        </button>
        <button
          className={cx("tool", { selected: tool === "lasso" })}
          onClick={() => onToolChange("lasso")}
        >
          <GoogleIcon icon="lasso_select" />
          Lasso
        </button>
        <div>Color:</div>
        <input
          type="color"
          value={color}
          onChange={(e) => onColorChange(e.currentTarget.value)}
        />
        {colors.map((c) => (
          <button
            key={c}
            className={cx("color", { selected: c === color })}
            onClick={() => onColorChange(c)}
            style={{ backgroundColor: c }}
          ></button>
        ))}
        <div>Size:</div>
        <input
          type="number"
          value={size}
          onChange={(e) =>
            onSizeChange(tryParseInt(e.currentTarget.value, size))
          }
        />
        <div className="path">{path}</div>
      </div>
    );
  }
);

export default Toolbar;
