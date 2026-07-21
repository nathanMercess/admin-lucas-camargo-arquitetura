import { FormControl } from '@angular/forms';
import { SiteSection } from '@shared/models/site-section.model';

export interface ContentSectionEditorItem {
  readonly id: string;
  readonly label: string;
  readonly section: SiteSection;
  readonly visibilityControl: FormControl<boolean>;
}
