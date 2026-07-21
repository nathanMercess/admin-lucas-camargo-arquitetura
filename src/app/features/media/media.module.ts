import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { DataViewModule } from 'primeng/dataview';
import { FileUploadModule } from 'primeng/fileupload';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';

import { MediaRoutingModule } from './media-routing.module';
import { MediaComponent } from './media.component';
import { MediaLibraryService } from './services/media-library.service';

@NgModule({
  declarations: [MediaComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DataViewModule,
    FileUploadModule,
    MessageModule,
    ProgressSpinnerModule,
    SelectModule,
    TagModule,
    MediaRoutingModule,
  ],
  providers: [MediaLibraryService],
})
export class MediaModule {}
