export function getHorizontalRailStep(containerWidth: number) {
  return Math.max(220, Math.round(containerWidth * 0.82));
}

export function hasHorizontalOverflow(
  scrollWidth: number,
  clientWidth: number,
) {
  return scrollWidth - clientWidth > 24;
}
