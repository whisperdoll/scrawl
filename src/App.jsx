// index.html
import { useEffect, useRef, useState } from "react";
import Explorer from "./components/Explorer";
import Toolbar from "./components/Toolbar";
import Whiteboard from "./components/Whiteboard";
import useWindowSize from "./hooks/useWindowSize";
import "./App.scss";

const defaultParentNode = {
  name: "root",
  path: "",
  children: [],
};

export default function App() {
  const windowSize = useWindowSize();
  const explorerEl = useRef(null);
  const toolbarEl = useRef(null);
  const [canvasSize, setCanvasSize] = useState(calcCanvasSize());
  const [dirtree, setDirtree] = useState({ ...defaultParentNode });
  const [currentPath, setCurrentPath] = useState("");
  const [tool, setTool] = useState("draw");
  const [color, setColor] = useState("#eeeeee");
  const [size, setSize] = useState(3);

  useEffect(() => {
    setCanvasSize(calcCanvasSize());
  }, [windowSize]);

  function calcCanvasSize() {
    if (!explorerEl.current || !toolbarEl.current) {
      return {
        width: 100,
        height: 100,
      };
    }

    return {
      width:
        windowSize.width - explorerEl.current.getBoundingClientRect().width,
      height:
        windowSize.height - toolbarEl.current.getBoundingClientRect().height,
    };
  }

  function handleSelect(path) {
    console.log(path);
    setCurrentPath(path);
  }

  return (
    <div className="container">
      <Explorer
        currentPath={currentPath}
        ref={explorerEl}
        dirtree={dirtree}
        setDirtree={setDirtree}
        onSelect={handleSelect}
      />
      <div className="col">
        <Toolbar
          path={currentPath}
          tool={tool}
          onToolChange={setTool}
          ref={toolbarEl}
          size={size}
          onSizeChange={setSize}
          color={color}
          onColorChange={setColor}
        />
        <Whiteboard
          path={currentPath}
          size={canvasSize}
          toolConfig={{ tool, size, color }}
        />
      </div>
    </div>
  );
}
