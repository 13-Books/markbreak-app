/**
 * Runtime product identity for this overlay.
 * Keep electron-builder.yml / package.json / installer.nsh in sync with these values.
 * Feature PRs to the middle fork must not introduce product display strings here —
 * change this file (or the packaging twins) only in the product repo.
 */
export const PRODUCT = {
  name: 'MarkBreak',
  appId: 'com.markbreak.app',
  /** Keychain / dataCenter service label; also CLI binary and data-dir prefix */
  serviceName: 'markbreak',
  cliName: 'markbreak',
  devUserDataDir: 'markbreak-dev',
  portableUserDataDir: 'markbreak-user-data',
  githubRepoUrl: 'https://github.com/markbreak/markbreak-app',
  siteUrl: 'https://markbreak.app',
  dialectUrl: 'https://markbreak.com',
  guidesUrl: 'https://markbreak.app/guides/',
  downloadUrl: 'https://markbreak.app/#download',
  specificationUrl: 'https://markbreak.com/specification.md'
} as const
