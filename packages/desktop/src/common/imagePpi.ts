/** Effective pixels-per-inch when an image of `pixelWidth` fills `displayMm` millimetres. */
export const effectivePpi = (pixelWidth: number, displayMm: number): number => {
  if (pixelWidth <= 0 || displayMm <= 0) return 0
  const inches = displayMm / 25.4
  return pixelWidth / inches
}

export const PPI_WARN_THRESHOLD = 300

export const isLowPrintPpi = (pixelWidth: number, displayMm: number): boolean =>
  effectivePpi(pixelWidth, displayMm) > 0 && effectivePpi(pixelWidth, displayMm) < PPI_WARN_THRESHOLD
