export interface VisualBuilderDocument {
  readonly enabled: boolean;
  readonly projectData: Readonly<Record<string, unknown>>;
  readonly html: string;
  readonly css: string;
}
