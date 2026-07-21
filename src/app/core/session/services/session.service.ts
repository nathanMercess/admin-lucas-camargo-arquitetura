import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, Signal, inject, isDevMode, signal } from '@angular/core';
import { finalize, take } from 'rxjs';

import { AdminSession } from '../models/admin-session.model';

const SESSION_ENDPOINT = '/api/v1/session';

export const SESSION_DEVELOPMENT_FALLBACK = new InjectionToken<boolean>(
  'SESSION_DEVELOPMENT_FALLBACK',
  {
    providedIn: 'root',
    factory: () => isDevMode(),
  },
);

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private readonly httpClient = inject(HttpClient);
  private readonly developmentFallbackEnabled = inject(SESSION_DEVELOPMENT_FALLBACK);
  private readonly sessionState = signal<AdminSession | null>(null);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly developmentFallbackState = signal(false);

  public readonly session: Signal<AdminSession | null> = this.sessionState.asReadonly();
  public readonly loading: Signal<boolean> = this.loadingState.asReadonly();
  public readonly error: Signal<string | null> = this.errorState.asReadonly();
  public readonly developmentFallback: Signal<boolean> =
    this.developmentFallbackState.asReadonly();

  public load(): void {
    if (this.loadingState())
      return;

    this.loadingState.set(true);
    this.errorState.set(null);
    this.developmentFallbackState.set(false);

    this.httpClient
      .get<AdminSession>(SESSION_ENDPOINT)
      .pipe(
        take(1),
        finalize(() => this.loadingState.set(false)),
      )
      .subscribe({
        next: (session) => this.sessionState.set(session),
        error: () => this.handleLoadError(),
      });
  }

  public resolvePublishedContentPath(path: string): string {
    if (!/^\/?content\//.test(path))
      return path;

    const baseUrl = this.sessionState()?.publishedContentBaseUrl ?? '/content';
    const normalizedPath = path.replace(/^\/?content\//, '');

    if (
      !/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(normalizedPath) ||
      normalizedPath.includes('..') ||
      normalizedPath.includes('//')
    )
      return '';

    if (baseUrl === '/content')
      return `/content/${normalizedPath}`;

    try {
      const parsedBaseUrl = new URL(baseUrl);

      if (
        !['http:', 'https:'].includes(parsedBaseUrl.protocol) ||
        parsedBaseUrl.username !== '' ||
        parsedBaseUrl.password !== '' ||
        parsedBaseUrl.search !== '' ||
        parsedBaseUrl.hash !== '' ||
        parsedBaseUrl.pathname !== '/content'
      )
        return '';

      return new URL(normalizedPath, `${parsedBaseUrl.toString()}/`).toString();
    } catch {
      return '';
    }
  }

  private handleLoadError(): void {
    if (this.developmentFallbackEnabled) {
      this.sessionState.set(null);
      this.developmentFallbackState.set(true);
      return;
    }

    this.errorState.set(
      $localize`:@@admin.session.loadError:Não foi possível identificar a sessão atual. Tente novamente.`,
    );
  }
}
