import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, InjectionToken, Signal, inject, isDevMode, signal } from '@angular/core';
import { finalize, switchMap, take } from 'rxjs';

import { AdminSession } from '../models/admin-session.model';

const SESSION_ENDPOINT = '/api/v1/session';
const LOGIN_ENDPOINT = '/api/v1/auth/login';
const LOGOUT_ENDPOINT = '/api/v1/auth/logout';
const mutationHeaders = { 'X-Admin-CSRF': '1' };

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
  private readonly readyState = signal(false);
  private readonly authenticatingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly developmentFallbackState = signal(false);

  public readonly session: Signal<AdminSession | null> = this.sessionState.asReadonly();
  public readonly loading: Signal<boolean> = this.loadingState.asReadonly();
  public readonly ready: Signal<boolean> = this.readyState.asReadonly();
  public readonly authenticating: Signal<boolean> = this.authenticatingState.asReadonly();
  public readonly error: Signal<string | null> = this.errorState.asReadonly();
  public readonly developmentFallback: Signal<boolean> =
    this.developmentFallbackState.asReadonly();

  public load(): void {
    if (this.loadingState())
      return;

    this.loadingState.set(true);
    this.readyState.set(false);
    this.errorState.set(null);
    this.developmentFallbackState.set(false);

    this.httpClient
      .get<AdminSession>(SESSION_ENDPOINT)
      .pipe(
        take(1),
        finalize(() => this.loadingState.set(false)),
      )
      .subscribe({
        next: (session) => {
          this.sessionState.set(session);
          this.readyState.set(true);
        },
        error: (error: HttpErrorResponse) => this.handleLoadError(error),
      });
  }

  public login(username: string, password: string): void {
    if (this.authenticatingState())
      return;

    this.authenticatingState.set(true);
    this.errorState.set(null);
    this.developmentFallbackState.set(false);

    this.httpClient
      .post<void>(LOGIN_ENDPOINT, { username, password }, { headers: mutationHeaders })
      .pipe(
        switchMap(() => this.httpClient.get<AdminSession>(SESSION_ENDPOINT)),
        take(1),
        finalize(() => this.authenticatingState.set(false)),
      )
      .subscribe({
        next: (session) => {
          this.sessionState.set(session);
          this.readyState.set(true);
        },
        error: (error: HttpErrorResponse) => this.handleLoginError(error),
      });
  }

  public logout(): void {
    if (this.authenticatingState())
      return;

    this.authenticatingState.set(true);
    this.errorState.set(null);

    this.httpClient
      .post<void>(LOGOUT_ENDPOINT, null, { headers: mutationHeaders })
      .pipe(
        take(1),
        finalize(() => this.authenticatingState.set(false)),
      )
      .subscribe({
        next: () => {
          this.sessionState.set(null);
          this.developmentFallbackState.set(false);
          this.readyState.set(true);
        },
        error: () => {
          this.errorState.set(
            $localize`:@@admin.session.logoutError:Não foi possível encerrar a sessão. Tente novamente.`,
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

  private handleLoadError(error: HttpErrorResponse): void {
    this.sessionState.set(null);
    this.readyState.set(true);

    if ([401, 403].includes(error.status))
      return;

    if (this.developmentFallbackEnabled && error.status === 0) {
      this.sessionState.set(null);
      this.developmentFallbackState.set(true);
      return;
    }

    this.errorState.set(
      $localize`:@@admin.session.loadError:Não foi possível identificar a sessão atual. Tente novamente.`,
    );
  }

  private handleLoginError(error: HttpErrorResponse): void {
    this.sessionState.set(null);
    this.readyState.set(true);

    if (error.status === 429) {
      this.errorState.set(
        $localize`:@@admin.session.loginThrottled:Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.`,
      );
      return;
    }

    if ([401, 403].includes(error.status)) {
      this.errorState.set(
        $localize`:@@admin.session.loginInvalid:Usuário ou senha inválidos.`,
      );
      return;
    }

    this.errorState.set(
      $localize`:@@admin.session.loginError:Não foi possível entrar agora. Tente novamente.`,
    );
  }
}
