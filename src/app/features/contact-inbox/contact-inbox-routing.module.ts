import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ContactInboxComponent } from './contact-inbox.component';

const routes: Routes = [{ path: '', component: ContactInboxComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ContactInboxRoutingModule {}
