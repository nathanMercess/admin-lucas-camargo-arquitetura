import { SiteSection } from '@shared/models/site-section.model';

export interface SiteSectionDefinition {
  readonly type: SiteSection['type'];
  readonly label: string;
  readonly description: string;
  readonly icon: string;
}
