import { VisualBuilderAnimation } from './visual-builder-animation.type';
import { VisualBuilderSectionField } from './visual-builder-section-field.model';

export interface VisualBuilderSelection {
  readonly id: string;
  readonly label: string;
  readonly tagName: string;
  readonly isSection: boolean;
  readonly sectionFields: readonly VisualBuilderSectionField[];
  readonly detailedEditing: boolean;
  readonly canEditText: boolean;
  readonly canEditLink: boolean;
  readonly canEditMedia: boolean;
  readonly text: string;
  readonly href: string;
  readonly src: string;
  readonly alt: string;
  readonly targetBlank: boolean;
  readonly color: string;
  readonly backgroundColor: string;
  readonly padding: number;
  readonly fontSize: number;
  readonly width: number;
  readonly borderRadius: number;
  readonly textAlign: 'left' | 'center' | 'right';
  readonly displayMobile: boolean;
  readonly hidden: boolean;
  readonly canMoveUp: boolean;
  readonly canMoveDown: boolean;
  readonly canRemove: boolean;
  readonly variation: string;
  readonly animation: VisualBuilderAnimation;
  readonly animationDelay: number;
  readonly animationDuration: number;
}
