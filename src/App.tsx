// index.html
import { useEffect, useRef, useState } from "react";
import Explorer, { NodeWithChildren } from "./components/Explorer.tsx";
import Toolbar from "./components/Toolbar.tsx";
import Whiteboard from "./components/Whiteboard.jsx";
import useWindowSize from "./hooks/useWindowSize.js";
import "./App.scss";
import { ToolString } from "./lib/types.ts";
import { ToolContext } from "./contexts/contexts.ts";

const defaultParentNode: NodeWithChildren = {
  name: "root",
  path: "",
  children: [],
};

export default function App() {
  const windowSize = useWindowSize();
  const explorerEl = useRef<HTMLDivElement>(null);
  const toolbarEl = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState(calcCanvasSize());
  const [dirtree, setDirtree] = useState({ ...defaultParentNode });
  const [currentPath, setCurrentPath] = useState("");
  const [tool, setTool] = useState<ToolString>("draw");
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

  function handleSelect(path: string) {
    setCurrentPath(path);
  }

  return (
    <ToolContext.Provider value={[tool, setTool]}>
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
    </ToolContext.Provider>
  );
}
