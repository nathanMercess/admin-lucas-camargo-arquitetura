import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';

import { MediaAssetPickerComponent } from './components/media-asset-picker/media-asset-picker.component';
import { VisualBuilderPreviewComponent } from './components/visual-builder-preview/visual-builder-preview.component';

@NgModule({
  declarations: [MediaAssetPickerComponent, VisualBuilderPreviewComponent],
  imports: [CommonModule, FormsModule, SelectModule],
  exports: [MediaAssetPickerComponent, VisualBuilderPreviewComponent],
})
export class SharedModule {}
