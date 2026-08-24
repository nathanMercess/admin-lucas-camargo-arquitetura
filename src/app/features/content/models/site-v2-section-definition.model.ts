import { SiteSectionV2 } from '@shared/models/site-section-v2.model';

export interface SiteV2SectionDefinition {
  readonly type: SiteSectionV2['type'];
  readonly label: string;
  readonly description: string;
  readonly icon: string;
}
