import { SiteTemplateId } from '@shared/models/site-template-id.type';
import { ThemeConfig } from '@shared/models/theme-config.model';

export interface SiteTemplatePreset {
  readonly id: SiteTemplateId;
  readonly name: string;
  readonly description: string;
  readonly bestFor: string;
  readonly theme: ThemeConfig;
}
