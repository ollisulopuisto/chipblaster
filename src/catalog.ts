// The HVSC catalog (about 7 MB as JSON) is loaded after the device has been drawn, in a chunk of its own, instead of being part of the main bundle.
export type HvscMeta = { lengths: Record<string, string[]>; names: Record<string, Record<string, string>> };
export type Catalog = { paths: string[]; meta: HvscMeta; retired: string[] };
let loading: Promise<Catalog> | null = null;
export const loadCatalog = (): Promise<Catalog> => {
  if (!loading) {
    loading = Promise.all([import('./hvsc-index.json'), import('./hvsc-meta.json'), import('./hvsc-retired.json')])
      .then(([i, m, r]) => ({ paths: i.default as string[], meta: m.default as HvscMeta, retired: r.default as string[] }));
    loading.catch(() => { loading = null; });
  }
  return loading;
};
