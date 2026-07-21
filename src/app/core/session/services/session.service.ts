import { HttpClient } from '@angular/common/http';
import { Injectable, Signal, inject, signal } from '@angular/core';
import { finalize, take } from 'rxjs';

import { AdminSession } from '../models/admin-session.model';

const SESSION_ENDPOINT = '/api/v1/session';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private readonly httpClient = inject(HttpClient);
  private readonly sessionState = signal<AdminSession | null>(null);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  public readonly session: Signal<AdminSession | null> = this.sessionState.asReadonly();
  public readonly loading: Signal<boolean> = this.loadingState.asReadonly();
  public readonly error: Signal<string | null> = this.errorState.asReadonly();

  public load(): void {
    if (this.loadingState())
      return;

    this.loadingState.set(true);
    this.errorState.set(null);

    this.httpClient
      .get<AdminSession>(SESSION_ENDPOINT)
      .pipe(
        take(1),
        finalize(() => this.loadingState.set(false)),
      )
      .subscribe({
        next: (session) => this.sessionState.set(session),
        error: () => {
          this.sessionState.set(null);
          this.errorState.set(
            $localize`:@@admin.session.loadError:Não foi possível identificar a sessão atual.`,
          );
        },
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
}
