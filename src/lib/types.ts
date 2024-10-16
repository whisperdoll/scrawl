export type Nullish = null | undefined;
export function isNullish(value: any): value is Nullish {
  return value === null || value === undefined;
}

export type Point = {
  x: number;
  y: number;
};

export type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type DocumentDataElementAction = "draw";

export type DocumentDataElement = {
  points: Point[];
  size: number;
  action: DocumentDataElementAction;
  color: string;
};

export type DocumentData = DocumentDataElement[];
