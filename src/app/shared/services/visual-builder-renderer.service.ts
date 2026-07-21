import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { SafeHtml, DomSanitizer } from '@angular/platform-browser';

import { VisualBuilderDocument } from '../models/visual-builder-document.model';

const BLOCKED_ELEMENTS = 'script, iframe, object, embed, link, meta, base';
const URL_ATTRIBUTES = new Set(['action', 'formaction', 'href', 'poster', 'src', 'xlink:href']);

@Injectable({
  providedIn: 'root',
})
export class VisualBuilderRendererService {
  private readonly document = inject(DOCUMENT);
  private readonly sanitizer = inject(DomSanitizer);

  public createPreviewSource(document: VisualBuilderDocument): SafeHtml {
    const html = this.sanitizeHtml(document.html);
    const css = this.sanitizeCss(document.css);
    const source = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>${html}</body></html>`;

    return this.sanitizer.bypassSecurityTrustHtml(source);
  }

  public sanitizeHtml(value: string): string {
    const parsedDocument = this.document.implementation.createHTMLDocument('Visual builder preview');
    parsedDocument.body.innerHTML = value;
    parsedDocument.querySelectorAll(BLOCKED_ELEMENTS).forEach((element) => element.remove());
    parsedDocument.querySelectorAll('*').forEach((element) => this.sanitizeElement(element));

    return parsedDocument.body.innerHTML;
  }

  public sanitizeCss(value: string): string {
    return value
      .replace(/@import\s+[^;]+;?/gi, '')
      .replace(/expression\s*\([^)]*\)/gi, '')
      .replace(/(?:javascript|vbscript)\s*:/gi, '')
      .replace(/-moz-binding\s*:[^;]+;?/gi, '')
      .replace(/behavior\s*:[^;]+;?/gi, '')
      .replace(/<\/style/gi, '');
  }

  public isSafeHref(value: string): boolean {
    const trimmedValue = value.trim();

    if (!trimmedValue)
      return true;

    if (trimmedValue.startsWith('#') || trimmedValue.startsWith('/'))
      return !trimmedValue.startsWith('//');

    try {
      const url = new URL(trimmedValue);

      return ['https:', 'mailto:', 'tel:'].includes(url.protocol);
    } catch {
      return false;
    }
  }

  public extractText(value: string): string {
    const parsedDocument = this.document.implementation.createHTMLDocument('Visual builder text');
    parsedDocument.body.innerHTML = this.sanitizeHtml(value);

    return parsedDocument.body.textContent?.trim() ?? '';
  }

  private sanitizeElement(element: Element): void {
    for (const attribute of [...element.attributes]) {
      const attributeName = attribute.name.toLowerCase();

      if (attributeName.startsWith('on') || attributeName === 'srcdoc') {
        element.removeAttribute(attribute.name);
        continue;
      }

      if (attributeName === 'style') {
        element.setAttribute(attribute.name, this.sanitizeCss(attribute.value));
        continue;
      }

      if (URL_ATTRIBUTES.has(attributeName) && !this.isSafeResource(attributeName, attribute.value))
        element.removeAttribute(attribute.name);
    }

    if (element.getAttribute('target') === '_blank')
      element.setAttribute('rel', 'noopener noreferrer');
  }

  private isSafeResource(attributeName: string, value: string): boolean {
    if (attributeName === 'src' && /^data:image\/(?:avif|gif|jpeg|png|webp);base64,/i.test(value))
      return true;

    return this.isSafeHref(value);
  }
}
