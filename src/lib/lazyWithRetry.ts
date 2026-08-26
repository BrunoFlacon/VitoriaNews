import { lazy, ComponentType } from 'react';

/**
 * Resilient lazy loader wrapper that automatically handles Vite chunk load failures (504 / network errors / outdated optimize deps)
 * by retrying the import or performing a single clean page reload instead of getting stuck on a blank/broken state.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<any>
) {
  return lazy(async () => {
    const hasRefreshed = JSON.parse(
      window.sessionStorage.getItem('retry-lazy-refreshed') || 'false'
    );
    try {
      const component = await componentImport();
      window.sessionStorage.setItem('retry-lazy-refreshed', 'false');
      return component.default ? component : { default: component };
    } catch (error) {
      console.warn('Lazy chunk load failed, attempting automatic recovery...', error);
      if (!hasRefreshed) {
        window.sessionStorage.setItem('retry-lazy-refreshed', 'true');
        window.location.reload();
        return new Promise(() => {}) as any;
      }
      throw error;
    }
  });
}
