import { TestBed } from '@angular/core/testing';

import { VisualBuilderRendererService } from './visual-builder-renderer.service';

describe('VisualBuilderRendererService', () => {
  let service: VisualBuilderRendererService;

  beforeEach(() => {
    service = TestBed.inject(VisualBuilderRendererService);
  });

  it('removes executable markup and unsafe URLs from exported content', () => {
    const sanitized = service.sanitizeHtml(
      '<main><script>alert(1)</script><a href="javascript:alert(1)" onclick="alert(1)">Abrir</a><img src="https://cdn.example.com/image.jpg" onerror="alert(1)"></main>',
    );

    expect(sanitized).not.toContain('<script');
    expect(sanitized).not.toContain('onclick');
    expect(sanitized).not.toContain('onerror');
    expect(sanitized).not.toContain('javascript:');
    expect(sanitized).toContain('https://cdn.example.com/image.jpg');
  });

  it('protects links opened in a new tab', () => {
    const sanitized = service.sanitizeHtml(
      '<a href="https://example.com" target="_blank">Site</a>',
    );

    expect(sanitized).toContain('rel="noopener noreferrer"');
  });

  it('removes dangerous CSS constructs and extracts plain text', () => {
    const sanitizedCss = service.sanitizeCss(
      '@import url(https://example.com/style.css);main{color:red;behavior:url(test.htc)}',
    );

    expect(sanitizedCss).not.toContain('@import');
    expect(sanitizedCss).not.toContain('behavior');
    expect(service.extractText('<strong>Texto</strong> seguro')).toBe('Texto seguro');
  });
});
