import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MediaAsset } from '@shared/models/media-asset.model';

import { VisualBuilderPropertyChange } from '../../models/visual-builder-property-change.model';
import { VisualBuilderPropertyName } from '../../models/visual-builder-property-name.type';
import { VisualBuilderSectionField } from '../../models/visual-builder-section-field.model';
import { VisualBuilderSelection } from '../../models/visual-builder-selection.model';

@Component({
  selector: 'app-visual-builder-properties',
  standalone: false,
  templateUrl: './visual-builder-properties.component.html',
  styleUrl: './visual-builder-properties.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisualBuilderPropertiesComponent {
  private uploadedAsset: MediaAsset | null = null;
  protected readonly animationOptions = [
    { label: $localize`:@@admin.visualBuilder.animation.none:Sem animação`, value: 'none' },
    { label: $localize`:@@admin.visualBuilder.animation.fade:Suave`, value: 'fade' },
    { label: $localize`:@@admin.visualBuilder.animation.fadeUp:Subir suavemente`, value: 'fade-up' },
    { label: $localize`:@@admin.visualBuilder.animation.revealLeft:Revelar da esquerda`, value: 'reveal-left' },
    { label: $localize`:@@admin.visualBuilder.animation.zoom:Aproximar suavemente`, value: 'zoom' },
  ];
  protected readonly variationOptions = [
    { label: $localize`:@@admin.visualBuilder.variation.default:Padrão`, value: 'default' },
    { label: $localize`:@@admin.visualBuilder.variation.compact:Compacta`, value: 'compact' },
    { label: $localize`:@@admin.visualBuilder.variation.contrast:Alto contraste`, value: 'contrast' },
  ];

  public readonly selection = input<VisualBuilderSelection | null>(null);
  public readonly assets = input.required<readonly MediaAsset[]>();
  public readonly validationMessage = input<string | null>(null);
  public readonly propertyChange = output<VisualBuilderPropertyChange>();
  public readonly assetUploaded = output<MediaAsset>();
  public readonly duplicate = output<void>();
  public readonly remove = output<void>();
  public readonly moveUp = output<void>();
  public readonly moveDown = output<void>();
  public readonly internalEdit = output<void>();
  protected readonly selectedAssetId = computed(() => {
    const source = this.selection()?.src;
    return this.assets().find((asset) => asset.path === source)?.id ?? '';
  });

  protected emitText(property: VisualBuilderPropertyName, event: Event): void {
    if (!(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement))
      return;

    this.emitValue(property, event.target.value);
  }

  protected emitValue(property: VisualBuilderPropertyName, value: boolean | number | string | null): void {
    if (value === null)
      return;

    this.propertyChange.emit({ property, value });
  }

  protected emitSectionText(field: VisualBuilderSectionField, event: Event): void {
    if (!(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement))
      return;

    this.propertyChange.emit({
      componentId: field.componentId,
      property: field.property,
      value: event.target.value,
    });
  }

  protected selectSectionMedia(field: VisualBuilderSectionField, assetId: string): void {
    const asset = this.assets().find((current) => current.id === assetId)
      ?? (this.uploadedAsset?.id === assetId ? this.uploadedAsset : null);

    if (!asset)
      return;

    this.propertyChange.emit({
      componentId: field.componentId,
      property: field.property,
      value: asset.path,
    });
  }

  protected handleSectionAssetUploaded(field: VisualBuilderSectionField, asset: MediaAsset): void {
    this.uploadedAsset = asset;
    this.assetUploaded.emit(asset);
    this.propertyChange.emit({
      componentId: field.componentId,
      property: field.property,
      value: asset.path,
    });
  }

  protected assetIdFor(path: string): string {
    return this.assets().find((asset) => asset.path === path)?.id
      ?? (this.uploadedAsset?.path === path ? this.uploadedAsset.id : '');
  }

  protected internalEditLabel(detailed: boolean): string {
    return detailed
      ? $localize`:@@admin.visualBuilder.section.collapseInternal:Recolher elementos internos`
      : $localize`:@@admin.visualBuilder.section.editInternal:Editar elementos internos`;
  }

  protected visibilityLabel(hidden: boolean): string {
    return hidden
      ? $localize`:@@admin.visualBuilder.section.show:Mostrar`
      : $localize`:@@admin.visualBuilder.section.hide:Ocultar`;
  }

  protected selectMedia(assetId: string): void {
    const asset = this.assets().find((current) => current.id === assetId)
      ?? (this.uploadedAsset?.id === assetId ? this.uploadedAsset : null);

    if (asset)
      this.emitValue('src', asset.path);
  }

  protected handleAssetUploaded(asset: MediaAsset): void {
    this.uploadedAsset = asset;
    this.assetUploaded.emit(asset);
    this.emitValue('src', asset.path);
  }
}
