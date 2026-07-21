import { VisualBuilderTemplateCategory } from './visual-builder-template-category.type';

export interface VisualBuilderTemplate {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: VisualBuilderTemplateCategory;
  readonly thumbnail: 'blank' | 'editorial' | 'portfolio' | 'contact' | 'custom';
  readonly content?: string;
  readonly styles?: string;
  readonly projectData?: Readonly<Record<string, unknown>>;
  readonly html?: string;
  readonly css?: string;
  readonly custom: boolean;
}
