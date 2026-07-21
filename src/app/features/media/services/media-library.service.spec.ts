import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MediaAsset } from '@shared/models/media-asset.model';

import { MediaUploadRequest } from '../models/media-upload-request.model';
import { MediaLibraryService } from './media-library.service';

describe('MediaLibraryService', () => {
  let service: MediaLibraryService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), MediaLibraryService],
    });
    service = TestBed.inject(MediaLibraryService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTestingController.verify());

  it('uploads directly with every required presigned header and completes registration', async () => {
    const request: MediaUploadRequest = {
      fileName: 'casa.webp',
      mimeType: 'image/webp',
      sizeBytes: 4,
      sha256: '0102',
      width: 1200,
      height: 800,
      provenance: 'project',
    };
    const requestBuilder = service as unknown as {
      buildRequest: () => Promise<MediaUploadRequest>;
    };
    vi.spyOn(requestBuilder, 'buildRequest').mockResolvedValue(request);
    const file = new File(['test'], 'casa.webp', { type: 'image/webp' });
    let completedAsset: MediaAsset | null = null;

    service.upload(file, 'project', (asset) => completedAsset = asset);

    await new Promise<void>((resolve) => queueMicrotask(resolve));
    const presignRequest = httpTestingController.expectOne('/api/v1/media/uploads');
    expect(presignRequest.request.method).toBe('POST');
    expect(presignRequest.request.headers.get('X-Admin-CSRF')).toBe('1');
    expect(presignRequest.request.body).toEqual(request);
    presignRequest.flush({
      uploadId: 'upload-1',
      assetId: 'asset-1',
      objectKey: 'media/0102.webp',
      uploadUrl: 'https://upload.example.test/object',
      expiresAt: '2026-07-21T03:00:00.000Z',
      requiredHeaders: {
        'content-type': 'image/webp',
        'cache-control': 'public, max-age=31536000, immutable',
        'if-none-match': '*',
      },
    });

    const objectRequest = httpTestingController.expectOne('https://upload.example.test/object');
    expect(objectRequest.request.method).toBe('PUT');
    expect(objectRequest.request.headers.get('content-type')).toBe('image/webp');
    expect(objectRequest.request.headers.get('cache-control')).toBe(
      'public, max-age=31536000, immutable',
    );
    expect(objectRequest.request.headers.get('if-none-match')).toBe('*');
    objectRequest.flush('');

    const completeRequest = httpTestingController.expectOne('/api/v1/media/uploads/upload-1/complete');
    expect(completeRequest.request.method).toBe('POST');
    expect(completeRequest.request.headers.get('X-Admin-CSRF')).toBe('1');
    const asset: MediaAsset = {
      id: 'asset-1',
      path: '/content/media/0102.webp',
      mimeType: 'image/webp',
      width: 1200,
      height: 800,
      sha256: '0102',
      provenance: 'project',
    };
    completeRequest.flush(asset);

    expect(completedAsset).toEqual(asset);
    expect(service.assets()).toEqual([asset]);
    expect(service.uploading()).toBe(false);
  });
});
