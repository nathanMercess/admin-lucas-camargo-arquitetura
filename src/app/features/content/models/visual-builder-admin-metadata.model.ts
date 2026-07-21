import { VisualBuilderPage } from '@shared/models/visual-builder-page.model';
import { VisualBuilderSavedTemplate } from '@shared/models/visual-builder-saved-template.model';

export interface VisualBuilderAdminMetadata {
  readonly version: 1;
  readonly page: VisualBuilderPage;
  readonly savedTemplates: readonly VisualBuilderSavedTemplate[];
}
