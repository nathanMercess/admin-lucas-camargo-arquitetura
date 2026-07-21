import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';

import { MediaRoutingModule } from './media-routing.module';
import { MediaComponent } from './media.component';

@NgModule({
  declarations: [MediaComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MessageModule,
    SelectModule,
    TagModule,
    MediaRoutingModule,
  ],
})
export class MediaModule {}
