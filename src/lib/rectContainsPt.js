export default function rectContainsPt(rect, pt) {
  const right = rect.x + rect.w;
  const bottom = rect.y + rect.h;

  return (
    pt.x >= rect.x && pt.x <= right &&
    pt.y >= rect.y && pt.y <= bottom
  );
}