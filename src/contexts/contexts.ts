import { createContext, SetStateAction } from "react";
import { StateType } from "../lib/utils.ts";
import { ToolString } from "../lib/types.ts";

export const ToolContext = createContext<StateType<ToolString>>([
  "draw",
  (_: SetStateAction<ToolString>) => {
    throw new Error("mrow");
  },
]);
