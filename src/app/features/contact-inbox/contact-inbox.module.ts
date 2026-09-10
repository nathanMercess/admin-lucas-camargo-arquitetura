import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { ContactInboxRoutingModule } from './contact-inbox-routing.module';
import { ContactInboxComponent } from './contact-inbox.component';

@NgModule({
  declarations: [ContactInboxComponent],
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    MessageModule,
    ProgressSpinnerModule,
    SelectModule,
    TableModule,
    TagModule,
    ContactInboxRoutingModule,
  ],
})
export class ContactInboxModule {}
