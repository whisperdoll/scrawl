import { forwardRef } from "react";
import "./Toolbar.scss";
import { SetStateType, tryParseInt } from "../lib/utils.ts";
import GoogleIcon from "./GoogleIcon.tsx";
import { cx } from "../lib/utils.ts";
import { ToolString } from "../lib/types.ts";

const colors = [
  "#FFFFFF",
  "#FF8080",
  "#80FF80",
  "#8080FF",
  "#FF80FF",
  "#80FFFF",
  "#FFFF80",
];

const Toolbar = forwardRef<
  HTMLDivElement,
  {
    path: string;
    tool: ToolString;
    onToolChange: SetStateType<ToolString>;
    color: string;
    onColorChange: SetStateType<string>;
    size: number;
    onSizeChange: SetStateType<number>;
  }
>(
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
