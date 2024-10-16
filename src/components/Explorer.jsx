import localforage from "localforage";
import { forwardRef, useState } from "react";
import {
  Menu,
  Item,
  Separator,
  Submenu,
  useContextMenu,
} from "react-contexify";
import "react-contexify/dist/ReactContexify.css";
import useEffectAsync from "../hooks/useEffectAsync";
import "./Explorer.scss";
import { cx } from "../lib/utils.ts";

function FileNode({ selected, node, onSelect, showContextMenu }) {
  function handleClick(e) {
    e.stopPropagation();
    onSelect(node.path);
  }

  function handleContextMenu(e) {
    e.preventDefault();
    e.stopPropagation();

    showContextMenu(e, node);
  }

  return (
    <div
      className={cx("FileNode Node", { selected })}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      {node.name}
    </div>
  );
}

function FolderNode({ currentPath, node, onSelect, showContextMenu }) {
  const [isOpen, setIsOpen] = useState(false);

  function handleClick(e) {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  }

  function handleContextMenu(e) {
    e.preventDefault();
    e.stopPropagation();

    showContextMenu(e, node);
  }

  return (
    <div
      className={["FolderNode Node", isOpen ? "open" : "closed"].join(" ")}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      <div className="label">{node.name}</div>
      {isOpen && (
        <ChildContainer
          currentPath={currentPath}
          node={node}
          onSelect={onSelect}
          showContextMenu={showContextMenu}
        />
      )}
    </div>
  );
}

function ChildContainer({ currentPath, node, onSelect, showContextMenu }) {
  return (
    <div className="children">
      {node.children.map((child) => {
        if (child.children) {
          return (
            <FolderNode
              node={child}
              key={child.path}
              onSelect={onSelect}
              showContextMenu={showContextMenu}
              currentPath={currentPath}
            />
          );
        } else {
          return (
            <FileNode
              node={child}
              key={child.path}
              onSelect={onSelect}
              showContextMenu={showContextMenu}
              selected={child.path === currentPath}
            />
          );
        }
      })}
    </div>
  );
}

/*
  node format:
  {
    name: string,
    path: string,
    children: folder ? node[] : undefined
  }
*/

function joinPaths(...paths) {
  return paths
    .map((path) => {
      if (path.startsWith("/")) {
        path = path.substr(1);
      }

      if (path.endsWith("/")) {
        path = path.substr(0, path.length - 1);
      }

      return path;
    })
    .filter((p) => p)
    .join("/");
}

const Explorer = forwardRef(
  ({ currentPath, onSelect, dirtree, setDirtree }, ref) => {
    const { show } = useContextMenu({ id: "explorer" });

    useEffectAsync(async () => {
      setDirtree((await localforage.getItem("dirtree")) || dirtree);
    }, []);

    function showContextMenu(e, node) {
      show({ event: e, props: { node } });
    }

    function nodeFromPath(path) {
      const pathParts = path.split("/").filter((p) => p);
      let node = dirtree;

      for (
        let pathPartIndex = 0;
        pathPartIndex < pathParts.length;
        pathPartIndex++
      ) {
        const child = (node.children || []).find(
          (n) => n.path.split("/").at(-1) === pathParts[pathPartIndex]
        );

        if (!child) {
          throw `bad path: ${path}`;
        }

        node = child;
      }

      return node;
    }

    async function addFile({ props: { node: parentNode = dirtree } }) {
      const name = prompt("Enter name for new file");
      if (!name) return;

      parentNode.children.push({
        name,
        path: joinPaths(parentNode.path, name),
      });
      setDirtree({ ...dirtree });
      await localforage.setItem("dirtree", dirtree);
    }

    async function addFolder({ props: { node: parentNode = dirtree } }) {
      const name = prompt("Enter name for new folder");
      if (!name) return;

      parentNode.children.push({
        name,
        path: joinPaths(parentNode.path, name),
        children: [],
      });
      setDirtree({ ...dirtree });
      await localforage.setItem("dirtree", dirtree);
    }

    async function deleteItem({ props: { node } }) {
      if (!node) return;

      const parentPath = `/${node.path}`.split("/").at(-2);
      const parentNode = nodeFromPath(parentPath);

      parentNode.children = parentNode.children.filter((n) => n !== node);
      setDirtree({ ...dirtree });
      await localforage.setItem("dirtree", dirtree);
    }

    return (
      <>
        <div
          ref={ref}
          className="Explorer"
          onContextMenu={(e) => showContextMenu(e)}
        >
          <ChildContainer
            node={dirtree}
            onSelect={onSelect}
            showContextMenu={showContextMenu}
            currentPath={currentPath}
          />
        </div>
        <Menu id="explorer">
          <Item onClick={addFile}>New File</Item>
          <Item onClick={addFolder}>New Folder</Item>
          <Item onClick={deleteItem} hidden={({ props }) => !props.node}>
            Delete
          </Item>
        </Menu>
      </>
    );
  }
);

export default Explorer;
