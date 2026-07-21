import { VisualBuilderBlockCategory } from './visual-builder-block-category.model';
import { VisualBuilderBlockKind } from './visual-builder-block-kind.type';
import { VisualBuilderBlockPreview } from './visual-builder-block-preview.type';
import { VisualBuilderBlockVariation } from './visual-builder-block-variation.model';

export interface VisualBuilderBlock {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly category: VisualBuilderBlockCategory;
  readonly kind: VisualBuilderBlockKind;
  readonly icon: string;
  readonly preview: VisualBuilderBlockPreview;
  readonly configurableFields: readonly string[];
  readonly animationLabel: string;
  readonly variations: readonly VisualBuilderBlockVariation[];
  readonly keywords: readonly string[];
  readonly content: string;
}
