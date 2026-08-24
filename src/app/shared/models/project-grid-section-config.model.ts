import { RichTextBlock } from './rich-text-block.model';
import { SiteSectionBase } from './site-section-base.model';

export interface ProjectGridSectionConfig extends SiteSectionBase {
  readonly type: 'project-grid';
  readonly variant: 'grid-v1';
  readonly overline: string;
  readonly title: RichTextBlock;
  readonly description: readonly string[];
  readonly projectIds: readonly string[];
  readonly maxColumns: 1 | 2 | 3 | 4;
}
