import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ColorPickerModule } from 'primeng/colorpicker';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { MultiSelectModule } from 'primeng/multiselect';
import { OrderListModule } from 'primeng/orderlist';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import { ContentRoutingModule } from './content-routing.module';
import { MediaReferenceEditorComponent } from './components/media-reference-editor/media-reference-editor.component';
import { RichTextBlockEditorComponent } from './components/rich-text-block-editor/rich-text-block-editor.component';
import { SectionContentEditorComponent } from './components/section-content-editor/section-content-editor.component';
import { SiteLinkEditorComponent } from './components/site-link-editor/site-link-editor.component';
import { SiteStructureEditorComponent } from './components/site-structure-editor/site-structure-editor.component';
import { SiteTemplateLibraryComponent } from './components/site-template-library/site-template-library.component';
import { StringListEditorComponent } from './components/string-list-editor/string-list-editor.component';
import { ContentEditorComponent } from './content-editor.component';

@NgModule({
  declarations: [
    ContentEditorComponent,
    MediaReferenceEditorComponent,
    RichTextBlockEditorComponent,
    SectionContentEditorComponent,
    SiteLinkEditorComponent,
    SiteStructureEditorComponent,
    SiteTemplateLibraryComponent,
    StringListEditorComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    ColorPickerModule,
    ConfirmDialogModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    MultiSelectModule,
    OrderListModule,
    ProgressSpinnerModule,
    SelectModule,
    TabsModule,
    TagModule,
    TextareaModule,
    ToggleSwitchModule,
    ContentRoutingModule,
  ],
  providers: [ConfirmationService],
})
export class ContentModule {}
