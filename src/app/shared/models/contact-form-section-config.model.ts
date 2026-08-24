import { RichTextBlock } from './rich-text-block.model';
import { SiteSectionBase } from './site-section-base.model';

export interface ContactFormSectionConfig extends SiteSectionBase {
  readonly type: 'contact-form';
  readonly variant: 'default-v1';
  readonly overline: string;
  readonly title: RichTextBlock;
  readonly description: readonly string[];
  readonly nameLabel: string;
  readonly emailLabel: string;
  readonly phoneLabel: string;
  readonly subjectLabel: string;
  readonly messageLabel: string;
  readonly submitLabel: string;
  readonly successMessage: string;
  readonly errorMessage: string;
  readonly privacyNotice: string;
}
