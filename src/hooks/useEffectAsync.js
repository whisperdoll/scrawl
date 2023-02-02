import React, { useEffect } from "react";

export default function useEffectAsync(fn, ...args) {
  return useEffect(() => {
    fn();
  }, ...args);
}