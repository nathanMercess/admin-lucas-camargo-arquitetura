import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { MediaAsset } from '@shared/models/media-asset.model';

import { SessionService } from '../../../core/session/services/session.service';
import { MediaProvenance } from '../../../features/media/models/media-provenance.type';
import { MediaLibraryService } from '../../../features/media/services/media-library.service';

@Component({
  selector: 'app-media-asset-picker',
  templateUrl: './media-asset-picker.component.html',
  styleUrl: './media-asset-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class MediaAssetPickerComponent {
  protected readonly mediaService = inject(MediaLibraryService);
  private readonly sessionService = inject(SessionService);

  public readonly label = input.required<string>();
  public readonly assets = input.required<readonly MediaAsset[]>();
  public readonly value = input.required<string>();
  public readonly provenance = input<MediaProvenance>('reference');
  public readonly optional = input(false);
  public readonly valueChange = output<string>();
  public readonly assetUploaded = output<MediaAsset>();

  protected readonly inputId = `media-file-${crypto.randomUUID()}`;
  protected readonly options = computed(() => {
    const merged = [...this.assets(), ...this.mediaService.assets()];
    return [...new Map(merged.map((asset) => [asset.id, asset])).values()];
  });
  protected readonly selectedAsset = computed(() =>
    this.options().find((asset) => asset.id === this.value()),
  );

  protected selectAsset(assetId: string | null | undefined): void {
    this.valueChange.emit(assetId ?? '');
  }

  protected upload(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const file = inputElement.files?.[0];

    if (!file)
      return;

    this.mediaService.upload(file, this.provenance(), (asset) => {
      inputElement.value = '';
      this.assetUploaded.emit(asset);
      this.valueChange.emit(asset.id);
    });
  }

  protected assetUrl(asset: MediaAsset): string {
    return this.sessionService.resolvePublishedContentPath(asset.path);
  }
}
