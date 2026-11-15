import { PRODUCT } from './product'

/**
 * Bake `{appName}` into a locale message tree for vue-i18n (which has no
 * global default params). Main-process i18n injects at lookup time instead.
 */
export function applyProductTokens<T>(messages: T): T {
  return JSON.parse(JSON.stringify(messages).replaceAll('{appName}', PRODUCT.name)) as T
}
