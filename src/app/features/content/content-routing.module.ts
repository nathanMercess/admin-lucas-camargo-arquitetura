import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ContentEditorComponent } from './content-editor.component';
import { unsavedContentGuard } from './guards/unsaved-content.guard';

const routes: Routes = [
  {
    path: '',
    component: ContentEditorComponent,
    canDeactivate: [unsavedContentGuard],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ContentRoutingModule {}
