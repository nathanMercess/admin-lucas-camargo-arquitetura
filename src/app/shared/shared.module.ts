import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';

import { MediaAssetPickerComponent } from './components/media-asset-picker/media-asset-picker.component';

@NgModule({
  declarations: [MediaAssetPickerComponent],
  imports: [CommonModule, FormsModule, SelectModule],
  exports: [MediaAssetPickerComponent],
})
export class SharedModule {}
