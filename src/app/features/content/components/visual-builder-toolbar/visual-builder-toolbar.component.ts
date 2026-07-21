import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { VisualBuilderDevice } from '../../models/visual-builder-device.type';
import { VisualBuilderViewMode } from '../../models/visual-builder-view-mode.type';

@Component({
  selector: 'app-visual-builder-toolbar',
  standalone: false,
  templateUrl: './visual-builder-toolbar.component.html',
  styleUrl: './visual-builder-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisualBuilderToolbarComponent {
  public readonly pageName = input.required<string>();
  public readonly dirty = input(false);
  public readonly saving = input(false);
  public readonly error = input<string | null>(null);
  public readonly canUndo = input(false);
  public readonly canRedo = input(false);
  public readonly device = input<VisualBuilderDevice>('desktop');
  public readonly zoom = input(100);
  public readonly viewMode = input<VisualBuilderViewMode>('fit');
  public readonly fullscreen = input(false);
  public readonly enabled = input(false);
  public readonly canPublish = input(false);

  public readonly back = output<void>();
  public readonly pageNameChange = output<string>();
  public readonly undo = output<void>();
  public readonly redo = output<void>();
  public readonly deviceChange = output<VisualBuilderDevice>();
  public readonly zoomChange = output<number>();
  public readonly zoomIn = output<void>();
  public readonly zoomOut = output<void>();
  public readonly fitViewport = output<void>();
  public readonly actualSize = output<void>();
  public readonly centerPage = output<void>();
  public readonly fullscreenChange = output<void>();
  public readonly templates = output<void>();
  public readonly preview = output<void>();
  public readonly save = output<void>();
  public readonly publish = output<void>();
  public readonly enabledChange = output<boolean>();

  protected readonly statusLabel = computed(() => {
    if (this.saving())
      return $localize`:@@admin.visualBuilder.status.saving:Salvando...`;

    if (this.error())
      return $localize`:@@admin.visualBuilder.status.error:Falha ao salvar`;

    if (this.dirty())
      return $localize`:@@admin.visualBuilder.status.unsaved:Alterações não salvas`;

    return $localize`:@@admin.visualBuilder.status.saved:Salvo`;
  });

  protected handlePageNameChange(event: Event): void {
    if (!(event.target instanceof HTMLInputElement))
      return;

    this.pageNameChange.emit(event.target.value);
  }

  protected handleZoomChange(event: Event): void {
    if (!(event.target instanceof HTMLInputElement))
      return;

    this.zoomChange.emit(Number(event.target.value));
  }
}
