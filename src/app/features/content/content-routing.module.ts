import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ContentEditorComponent } from './content-editor.component';

const routes: Routes = [
  {
    path: '',
    component: ContentEditorComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ContentRoutingModule {}
