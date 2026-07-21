import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, Signal, inject, signal } from '@angular/core';
import { MediaAsset } from '@shared/models/media-asset.model';
import { finalize, from, map, switchMap, take } from 'rxjs';

import { MediaProvenance } from '../models/media-provenance.type';
import { MediaMimeType } from '../models/media-mime-type.type';
import { MediaUploadRequest } from '../models/media-upload-request.model';
import { MediaUploadTicket } from '../models/media-upload-ticket.model';

const MEDIA_ASSETS_ENDPOINT = '/api/v1/media/assets';
const MEDIA_UPLOADS_ENDPOINT = '/api/v1/media/uploads';

@Injectable()
export class MediaLibraryService {
  private readonly httpClient = inject(HttpClient);
  private readonly assetsState = signal<MediaAsset[]>([]);
  private readonly loadingState = signal(false);
  private readonly uploadingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  public readonly assets: Signal<MediaAsset[]> = this.assetsState.asReadonly();
  public readonly loading: Signal<boolean> = this.loadingState.asReadonly();
  public readonly uploading: Signal<boolean> = this.uploadingState.asReadonly();
  public readonly error: Signal<string | null> = this.errorState.asReadonly();

  public load(): void {
    if (this.loadingState())
      return;

    this.loadingState.set(true);
    this.errorState.set(null);

    this.httpClient
      .get<readonly MediaAsset[]>(MEDIA_ASSETS_ENDPOINT)
      .pipe(
        take(1),
        finalize(() => this.loadingState.set(false)),
      )
      .subscribe({
        next: (assets) => this.assetsState.set([...assets]),
        error: () => this.errorState.set(
          $localize`:@@admin.media.loadError:Não foi possível carregar a biblioteca de mídia.`,
        ),
      });
  }

  public upload(
    file: File,
    provenance: MediaProvenance,
    completed: (asset: MediaAsset) => void,
  ): void {
    if (this.uploadingState())
      return;

    if (!this.isSupportedMimeType(file.type)) {
      this.errorState.set(
        $localize`:@@admin.media.invalidType:Use uma imagem JPEG, PNG, WebP ou AVIF.`,
      );
      return;
    }

    this.uploadingState.set(true);
    this.errorState.set(null);

    from(this.buildRequest(file, provenance, file.type))
      .pipe(
        switchMap((request) => this.requestUpload(request)),
        switchMap((ticket) => this.putObject(ticket, file)),
        switchMap((ticket) => this.completeUpload(ticket)),
        take(1),
        finalize(() => this.uploadingState.set(false)),
      )
      .subscribe({
        next: (asset) => {
          this.assetsState.update((assets) => [asset, ...assets]);
          completed(asset);
        },
        error: () => this.errorState.set(
          $localize`:@@admin.media.uploadError:O upload não foi concluído. O arquivo não foi registrado na biblioteca.`,
        ),
      });
  }

  private requestUpload(request: MediaUploadRequest) {
    const headers = new HttpHeaders({ 'X-Admin-CSRF': '1' });
    return this.httpClient.post<MediaUploadTicket>(MEDIA_UPLOADS_ENDPOINT, request, { headers });
  }

  private putObject(ticket: MediaUploadTicket, file: File) {
    const headers = new HttpHeaders(ticket.requiredHeaders);
    return this.httpClient
      .put(ticket.uploadUrl, file, { headers, responseType: 'text' })
      .pipe(map(() => ticket));
  }

  private completeUpload(ticket: MediaUploadTicket) {
    const headers = new HttpHeaders({ 'X-Admin-CSRF': '1' });
    const uploadId = encodeURIComponent(ticket.uploadId);
    return this.httpClient.post<MediaAsset>(
      `${MEDIA_UPLOADS_ENDPOINT}/${uploadId}/complete`,
      null,
      { headers },
    );
  }

  private async buildRequest(
    file: File,
    provenance: MediaProvenance,
    mimeType: MediaMimeType,
  ): Promise<MediaUploadRequest> {
    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    const dimensions = await this.readDimensions(file);
    const sha256 = Array.from(new Uint8Array(digest))
      .map((value) => value.toString(16).padStart(2, '0'))
      .join('');

    return {
      fileName: file.name,
      mimeType,
      sizeBytes: file.size,
      sha256,
      width: dimensions.width,
      height: dimensions.height,
      provenance,
    };
  }

  private async readDimensions(file: File): Promise<{ readonly width: number; readonly height: number }> {
    const bitmap = await createImageBitmap(file);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  }

  private isSupportedMimeType(value: string): value is MediaMimeType {
    return ['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(value);
  }
}
