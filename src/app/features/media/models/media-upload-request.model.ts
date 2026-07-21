import { MediaProvenance } from './media-provenance.type';
import { MediaMimeType } from './media-mime-type.type';

export interface MediaUploadRequest {
  readonly fileName: string;
  readonly mimeType: MediaMimeType;
  readonly sizeBytes: number;
  readonly sha256: string;
  readonly width: number;
  readonly height: number;
  readonly provenance: MediaProvenance;
}
