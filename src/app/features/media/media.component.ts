import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MediaAsset } from '@shared/models/media-asset.model';

import { ContentDraftService } from '../content/services/content-draft.service';
import { SessionService } from '../../core/session/services/session.service';
import { MediaProvenanceOption } from './models/media-provenance-option.model';
import { MediaLibraryService } from './services/media-library.service';

@Component({
  selector: 'app-media',
  templateUrl: './media.component.html',
  styleUrl: './media.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class MediaComponent implements OnInit {
  protected readonly mediaService = inject(MediaLibraryService);
  protected readonly draftService = inject(ContentDraftService);
  private readonly sessionService = inject(SessionService);
  protected readonly provenanceControl = new FormControl<'brand' | 'project' | 'reference'>(
    'project',
    { nonNullable: true },
  );
  protected readonly provenanceOptions: MediaProvenanceOption[] = [
    { label: $localize`:@@admin.media.provenance.brand:Marca`, value: 'brand' },
    { label: $localize`:@@admin.media.provenance.project:Projeto`, value: 'project' },
    { label: $localize`:@@admin.media.provenance.reference:Referência`, value: 'reference' },
  ];

  public ngOnInit(): void {
    this.mediaService.load();
    this.draftService.load();
  }

  protected upload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file)
      return;

    this.mediaService.upload(file, this.provenanceControl.value, (asset) => {
      input.value = '';
      this.draftService.registerAndSaveMediaAsset(asset);
    });
  }

  protected assetUrl(asset: MediaAsset): string {
    return this.sessionService.resolvePublishedContentPath(asset.path);
  }

}
