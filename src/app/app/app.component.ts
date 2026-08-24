import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { PreviewAccessService } from '../core/preview/services/preview-access.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AppComponent {
  protected readonly isPreviewEnabled = inject(PreviewAccessService).isEnabled();
}
