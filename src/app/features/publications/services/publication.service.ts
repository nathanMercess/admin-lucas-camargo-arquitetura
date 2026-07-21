import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, Signal, inject, signal } from '@angular/core';
import { PublishedManifestV1 } from '@shared/models/published-manifest-v1.model';
import { finalize, take } from 'rxjs';

import { ReleaseRecord } from '../models/release-record.model';

const RELEASES_ENDPOINT = '/api/v1/releases';

@Injectable()
export class PublicationService {
  private readonly httpClient = inject(HttpClient);
  private readonly releasesState = signal<ReleaseRecord[]>([]);
  private readonly loadingState = signal(false);
  private readonly mutatingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly lastManifestState = signal<PublishedManifestV1 | null>(null);

  public readonly releases: Signal<ReleaseRecord[]> = this.releasesState.asReadonly();
  public readonly loading: Signal<boolean> = this.loadingState.asReadonly();
  public readonly mutating: Signal<boolean> = this.mutatingState.asReadonly();
  public readonly error: Signal<string | null> = this.errorState.asReadonly();
  public readonly lastManifest: Signal<PublishedManifestV1 | null> =
    this.lastManifestState.asReadonly();

  public load(): void {
    if (this.loadingState())
      return;

    this.loadingState.set(true);
    this.errorState.set(null);

    this.httpClient
      .get<readonly ReleaseRecord[]>(RELEASES_ENDPOINT)
      .pipe(
        take(1),
        finalize(() => this.loadingState.set(false)),
      )
      .subscribe({
        next: (releases) => this.releasesState.set([...releases]),
        error: () => this.errorState.set(
          $localize`:@@admin.publications.historyError:Não foi possível carregar o histórico.`,
        ),
      });
  }

  public publish(draftEtag: string, completed: () => void): void {
    this.mutate(RELEASES_ENDPOINT, draftEtag, completed);
  }

  public rollback(releaseId: string, draftEtag: string, completed: () => void): void {
    const encodedReleaseId = encodeURIComponent(releaseId);
    this.mutate(`${RELEASES_ENDPOINT}/${encodedReleaseId}/rollback`, draftEtag, completed);
  }

  private mutate(endpoint: string, draftEtag: string, completed: () => void): void {
    if (this.mutatingState())
      return;

    this.mutatingState.set(true);
    this.errorState.set(null);

    const headers = new HttpHeaders({
      'If-Match': draftEtag,
      'X-Admin-CSRF': '1',
    });

    this.httpClient
      .post<PublishedManifestV1>(endpoint, null, { headers })
      .pipe(
        take(1),
        finalize(() => this.mutatingState.set(false)),
      )
      .subscribe({
        next: (manifest) => {
          this.lastManifestState.set(manifest);
          this.load();
          completed();
        },
        error: (error: unknown) => this.handleMutationError(error),
      });
  }

  private handleMutationError(error: unknown): void {
    if (error instanceof HttpErrorResponse && error.status === 412) {
      this.errorState.set(
        $localize`:@@admin.publications.conflict:O rascunho mudou. Recarregue antes de publicar ou restaurar.`,
      );
      return;
    }

    this.errorState.set(
      $localize`:@@admin.publications.mutationError:A operação não foi concluída. Nenhuma versão foi alterada.`,
    );
  }
}
