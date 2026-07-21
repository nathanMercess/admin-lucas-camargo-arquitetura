import { VisualBuilderPropertyName } from './visual-builder-property-name.type';

export interface VisualBuilderPropertyChange {
  readonly componentId?: string;
  readonly property: VisualBuilderPropertyName;
  readonly value: boolean | number | string;
}
