import { VisualBuilderPropertyName } from './visual-builder-property-name.type';
import { VisualBuilderSectionFieldType } from './visual-builder-section-field-type.type';

export interface VisualBuilderSectionField {
  readonly id: string;
  readonly componentId: string;
  readonly label: string;
  readonly property: VisualBuilderPropertyName;
  readonly type: VisualBuilderSectionFieldType;
  readonly value: string;
}
