import { RichTextBlock } from './rich-text-block.model';
import { SiteSectionBase } from './site-section-base.model';

export interface WhatsappCtaSectionConfig extends SiteSectionBase {
  readonly type: 'whatsapp-cta';
  readonly variant: 'editorial-v1';
  readonly overline: string;
  readonly title: RichTextBlock;
  readonly body: readonly string[];
  readonly label: string;
  readonly message: string;
}
