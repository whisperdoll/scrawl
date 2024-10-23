import { useCallback, useRef } from "react";
import { DocumentData } from "../lib/types.ts";
import localforage from "localforage";

export default function useSaveDocument() {
  const saveTimer = useRef<number | null>(null);
  const awaitingSave = useRef<DocumentData | null>(null);
  const lastSaved = useRef<DocumentData | null>(null);

  const save = useCallback((path: string, data: DocumentData) => {
    awaitingSave.current = data;
    if (saveTimer.current) {
      return;
    }

    saveTimer.current = setTimeout(async () => {
      saveTimer.current = null;

      const store = localforage.createInstance({
        name: "notes",
      });

      await store.setItem(path, (lastSaved.current = awaitingSave.current));
      // console.log("saved", path, await store.getItem(path));
    }, 1000);
  }, []);

  return save;
}
