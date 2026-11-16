/**
 * IDML export entry point — gated by docs/IDML-SPIKE.md.
 * Throws until a route passes the InDesign/validator exit criteria.
 */
export const writeIdml = async(
  _markdown: string,
  _outFile: string,
  _options?: { rigFile?: string, sourcePath?: string }
): Promise<void> => {
  throw new Error(
    'IDML export is not available yet. See docs/IDML-SPIKE.md — ship only after the spike exit criteria pass.'
  )
}
