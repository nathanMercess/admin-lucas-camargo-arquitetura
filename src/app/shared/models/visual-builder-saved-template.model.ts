export interface VisualBuilderSavedTemplate {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly projectData: Readonly<Record<string, unknown>>;
  readonly html: string;
  readonly css: string;
}
