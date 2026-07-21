import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MediaAsset } from '@shared/models/media-asset.model';
import { FileUpload } from 'primeng/fileupload';
import { FileUploadHandlerEvent } from 'primeng/types/fileupload';

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

  protected upload(event: FileUploadHandlerEvent, uploader: FileUpload): void {
    const [file] = event.files;

    if (!file)
      return;

    this.mediaService.upload(file, this.provenanceControl.value, (asset) => {
      uploader.clear();
      this.registerAssetInDraft(asset);
    });
  }

  protected assetUrl(asset: MediaAsset): string {
    return this.sessionService.resolvePublishedContentPath(asset.path);
  }

  private registerAssetInDraft(asset: MediaAsset): void {
    const draft = this.draftService.draft();

    if (!draft || draft.media.some((current) => current.id === asset.id))
      return;

    this.draftService.updateDraft({ ...draft, media: [...draft.media, asset] });
    this.draftService.save();
  }
}
