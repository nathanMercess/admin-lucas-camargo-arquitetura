import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
  HttpResponse,
} from '@angular/common/http';
import { Injectable, InjectionToken, Signal, inject, isDevMode, signal } from '@angular/core';
import { DEFAULT_SITE_CONFIG } from '@shared/config/default-site-config';
import { SiteConfigV1 } from '@shared/models/site-config-v1.model';
import { finalize, take } from 'rxjs';

const CONTENT_DRAFT_ENDPOINT = '/api/v1/content/draft';

export const CONTENT_DRAFT_DEVELOPMENT_FALLBACK = new InjectionToken<boolean>(
  'CONTENT_DRAFT_DEVELOPMENT_FALLBACK',
  {
    providedIn: 'root',
    factory: () => isDevMode(),
  },
);

@Injectable({
  providedIn: 'root',
})
export class ContentDraftService {
  private readonly httpClient = inject(HttpClient);
  private readonly developmentFallbackEnabled = inject(CONTENT_DRAFT_DEVELOPMENT_FALLBACK);
  private readonly draftState = signal<SiteConfigV1 | null>(null);
  private readonly loadingState = signal(false);
  private readonly savingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly dirtyState = signal(false);
  private readonly etagState = signal<string | null>(null);
  private readonly developmentFallbackState = signal(false);
  private saveQueued = false;

  public readonly draft: Signal<SiteConfigV1 | null> = this.draftState.asReadonly();
  public readonly loading: Signal<boolean> = this.loadingState.asReadonly();
  public readonly saving: Signal<boolean> = this.savingState.asReadonly();
  public readonly error: Signal<string | null> = this.errorState.asReadonly();
  public readonly dirty: Signal<boolean> = this.dirtyState.asReadonly();
  public readonly etag: Signal<string | null> = this.etagState.asReadonly();
  public readonly developmentFallback: Signal<boolean> =
    this.developmentFallbackState.asReadonly();

  public load(): void {
    if (this.loadingState())
      return;

    this.loadingState.set(true);
    this.errorState.set(null);

    this.httpClient
      .get<SiteConfigV1>(CONTENT_DRAFT_ENDPOINT, { observe: 'response' })
      .pipe(
        take(1),
        finalize(() => this.loadingState.set(false)),
      )
      .subscribe({
        next: (response) => this.handleLoadSuccess(response),
        error: (error: unknown) => this.handleLoadError(error),
      });
  }

  public updateDraft(draft: SiteConfigV1): void {
    this.draftState.set(draft);
    this.dirtyState.set(true);
  }

  public save(): void {
    const draft = this.draftState();

    if (!draft)
      return;

    if (this.savingState()) {
      this.saveQueued = true;
      return;
    }

    if (this.developmentFallbackState()) {
      this.dirtyState.set(false);
      this.errorState.set(
        $localize`:@@admin.content.fallbackSaved:Modo local de desenvolvimento: alterações aplicadas apenas nesta sessão.`,
      );
      return;
    }

    const etag = this.etagState();

    this.savingState.set(true);
    this.errorState.set(null);

    let headers = new HttpHeaders({ 'X-Admin-CSRF': '1' });

    if (etag)
      headers = headers.set('If-Match', etag);
    else
      headers = headers.set('If-None-Match', '*');

    this.httpClient
      .put<SiteConfigV1>(CONTENT_DRAFT_ENDPOINT, draft, { headers, observe: 'response' })
      .pipe(
        take(1),
        finalize(() => this.finishSave()),
      )
      .subscribe({
        next: (response) => this.handleSaveSuccess(response, draft),
        error: (error: unknown) => this.handleSaveError(error),
      });
  }

  private handleLoadSuccess(response: HttpResponse<SiteConfigV1>): void {
    if (!response.body) {
      this.handleLoadError();
      return;
    }

    this.draftState.set(response.body);
    this.etagState.set(response.headers.get('ETag'));
    this.dirtyState.set(false);
    this.developmentFallbackState.set(false);
  }

  private handleLoadError(error?: unknown): void {
    this.etagState.set(null);

    if (error instanceof HttpErrorResponse && error.status === 404) {
      this.draftState.set(structuredClone(DEFAULT_SITE_CONFIG));
      this.dirtyState.set(true);
      this.developmentFallbackState.set(false);
      this.errorState.set(
        $localize`:@@admin.content.bootstrapDraft:O rascunho ainda não existe. Revise a configuração inicial e salve para criá-lo.`,
      );
      return;
    }

    if (this.developmentFallbackEnabled) {
      this.draftState.set(structuredClone(DEFAULT_SITE_CONFIG));
      this.dirtyState.set(false);
      this.developmentFallbackState.set(true);
      this.errorState.set(
        $localize`:@@admin.content.developmentFallback:A API de rascunhos está indisponível. O editor carregou a configuração padrão em modo local de desenvolvimento.`,
      );
      return;
    }

    this.draftState.set(null);
    this.dirtyState.set(false);
    this.developmentFallbackState.set(false);
    this.errorState.set(
      $localize`:@@admin.content.loadError:Não foi possível carregar o rascunho. Tente novamente.`,
    );
  }

  private handleSaveSuccess(
    response: HttpResponse<SiteConfigV1>,
    submittedDraft: SiteConfigV1,
  ): void {
    const hasNewerDraft = this.draftState() !== submittedDraft;

    if (response.body && !hasNewerDraft)
      this.draftState.set(response.body);

    const nextEtag = response.headers.get('ETag');

    if (nextEtag)
      this.etagState.set(nextEtag);

    this.dirtyState.set(hasNewerDraft);
  }

  private handleSaveError(error: unknown): void {
    this.saveQueued = false;

    if (error instanceof HttpErrorResponse && error.status === 412) {
      this.errorState.set(
        $localize`:@@admin.content.conflictError:Este rascunho foi alterado em outra sessão. Recarregue antes de salvar novamente.`,
      );
      return;
    }

    this.errorState.set(
      $localize`:@@admin.content.saveError:Não foi possível salvar o rascunho. Suas alterações continuam pendentes.`,
    );
  }

  private finishSave(): void {
    this.savingState.set(false);

    if (!this.saveQueued)
      return;

    this.saveQueued = false;
    this.save();
  }
}
