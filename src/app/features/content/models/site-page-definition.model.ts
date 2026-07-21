export interface SitePageDefinition {
  readonly technicalId: string;
  readonly sourceId?: string;
  readonly name: string;
  readonly description: string;
  readonly route: string;
  readonly routePattern: '/' | '/portfolio' | '/portfolio/categoria/:categoryId'
    | '/portfolio/projeto/:slug' | '/**';
  readonly kind: 'concrete-page' | 'shared-template' | 'dynamic-data' | 'system-page';
  readonly routeKind: 'fixed' | 'parameterized' | 'dynamic' | 'fallback';
  readonly templateId?: 'portfolio-category-template' | 'portfolio-project-template';
  readonly group: 'concrete-pages' | 'shared-templates' | 'dynamic-content' | 'system-pages';
  readonly groupLabel: string;
  readonly order: number;
  readonly status: 'available' | 'empty' | 'hidden';
  readonly configurable: boolean;
  readonly listedInNavigation: boolean;
  readonly dataSource: 'site-sections' | 'portfolio-index' | 'portfolio-categories'
    | 'portfolio-projects' | 'router';
  readonly editorArea: 'content' | 'projects' | 'system';
}
