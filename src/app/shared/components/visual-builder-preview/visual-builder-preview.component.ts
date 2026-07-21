import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { VisualBuilderDocument } from '../../models/visual-builder-document.model';
import { VisualBuilderRendererService } from '../../services/visual-builder-renderer.service';

@Component({
  selector: 'app-visual-builder-preview',
  standalone: false,
  templateUrl: './visual-builder-preview.component.html',
  styleUrl: './visual-builder-preview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisualBuilderPreviewComponent {
  private readonly renderer = inject(VisualBuilderRendererService);

  public readonly document = input.required<VisualBuilderDocument>();
  public readonly width = input<string>('100%');
  public readonly title = input<string>('Pré-visualização da página');

  protected readonly source = computed(() => this.renderer.createPreviewSource(this.document()));
}
