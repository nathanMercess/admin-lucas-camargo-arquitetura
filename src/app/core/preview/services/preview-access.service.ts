import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

const PREVIEW_QUERY_PARAMETER = 'key';
const PREVIEW_QUERY_VALUE = '2026082414';
const PREVIEW_SESSION_STORAGE_KEY = 'lucas-camargo-admin.preview-session-enabled';

@Injectable({ providedIn: 'root' })
export class PreviewAccessService {
  private readonly document = inject(DOCUMENT);

  isEnabled(): boolean {
    const browserWindow = this.document.defaultView;

    if (!browserWindow)
      return false;

    const queryValue = new URLSearchParams(browserWindow.location.search).get(PREVIEW_QUERY_PARAMETER);

    if (queryValue !== null && queryValue !== PREVIEW_QUERY_VALUE)
      return false;

    if (queryValue === PREVIEW_QUERY_VALUE) {
      this.enableForCurrentSession(browserWindow);
      return true;
    }

    return this.isEnabledForCurrentSession(browserWindow);
  }

  private enableForCurrentSession(browserWindow: Window): void {
    try {
      browserWindow.sessionStorage.setItem(PREVIEW_SESSION_STORAGE_KEY, 'true');
    } catch {
      // A chave atual continua liberando a prévia quando o storage está indisponível.
    }
  }

  private isEnabledForCurrentSession(browserWindow: Window): boolean {
    try {
      return browserWindow.sessionStorage.getItem(PREVIEW_SESSION_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }
}
