export type SiteV2BuilderSelection =
  | { readonly kind: 'page'; readonly pageId: string }
  | { readonly kind: 'section'; readonly pageId: string; readonly sectionId: string };
