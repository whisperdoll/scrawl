import localforage from "localforage";
import { forwardRef, SetStateAction, useState } from "react";
import { Menu, Item, useContextMenu } from "react-contexify";
import "react-contexify/dist/ReactContexify.css";
import useEffectAsync from "../hooks/useEffectAsync.js";
import "./Explorer.scss";
import { cx, SetStateType } from "../lib/utils.ts";

export type Node = {
  name: string;
  path: string;
  children?: Node[];
};

export type NodeWithChildren = Node & { children: Required<Node>["children"] };

function hasChildren(node: Node | undefined): node is NodeWithChildren {
  return !!node?.children;
}

function FileNode(opts: {
  selected: boolean;
  node: Node;
  onSelect: (path: string) => any;
  showContextMenu: (e: React.MouseEvent, node: Node) => any;
}) {
  const { selected, node, onSelect, showContextMenu } = opts;
  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    onSelect(node.path);
  }

  function handleContextMenu(e: React.MouseEvent) {
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

function FolderNode(opts: {
  currentPath: string;
  node: NodeWithChildren;
  onSelect: (path: string) => any;
  showContextMenu: (e: React.MouseEvent, node: Node) => any;
}) {
  const { currentPath, node, onSelect, showContextMenu } = opts;
  const [isOpen, setIsOpen] = useState(false);

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  }

  function handleContextMenu(e: React.MouseEvent) {
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

function ChildContainer(opts: {
  currentPath: string;
  node: NodeWithChildren;
  onSelect: (path: string) => any;
  showContextMenu: (e: React.MouseEvent, node: Node) => any;
}) {
  const { currentPath, node, onSelect, showContextMenu } = opts;
  return (
    <div className="children">
      {node.children.map((child) => {
        if (hasChildren(child)) {
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

function joinPaths(...paths: string[]) {
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

type ContextMenuProps = {
  props?: { node?: Node };
};

const Explorer = forwardRef<
  HTMLDivElement,
  {
    currentPath: string;
    onSelect: (path: string) => any;
    dirtree: NodeWithChildren;
    setDirtree: SetStateType<NodeWithChildren>;
  }
>((opts, ref) => {
  const { currentPath, onSelect, dirtree, setDirtree } = opts;
  const { show } = useContextMenu({ id: "explorer" });

  useEffectAsync(async () => {
    setDirtree((await localforage.getItem("dirtree")) || dirtree);
  }, []);

  function showContextMenu(e: React.MouseEvent, node?: Node) {
    show({ event: e, props: { node } });
  }

  function nodeFromPath(path: string) {
    const pathParts = path.split("/").filter((p) => p);
    let node: Node = dirtree;

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

  async function addFile(props: ContextMenuProps) {
    const parentNode = hasChildren(props.props?.node)
      ? props.props.node
      : dirtree;

    const name = prompt("Enter name for new file");
    if (!name) return;

    parentNode.children.push({
      name,
      path: joinPaths(parentNode.path, name),
    });
    setDirtree({ ...dirtree });
    await localforage.setItem("dirtree", dirtree);
  }

  async function addFolder(props: ContextMenuProps) {
    const parentNode = hasChildren(props.props?.node)
      ? props.props.node
      : dirtree;

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

  async function deleteItem(props: ContextMenuProps) {
    const node = props.props?.node;
    if (!node) return;

    const parentPath = `/${node.path}`.split("/").at(-2);
    if (!parentPath) return;

    const parentNode = nodeFromPath(parentPath);

    parentNode.children = parentNode.children?.filter((n) => n !== node);
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
});

export default Explorer;
