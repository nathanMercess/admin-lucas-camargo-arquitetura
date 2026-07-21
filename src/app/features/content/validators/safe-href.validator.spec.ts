import { FormControl } from '@angular/forms';

import { safeHrefValidator, safeOptionalHrefValidator } from './safe-href.validator';

describe('safeHrefValidator', () => {
  it('accepts supported internal and external destinations', () => {
    expect(safeHrefValidator(new FormControl('#portfolio', { nonNullable: true }))).toBeNull();
    expect(safeHrefValidator(new FormControl('https://example.com', { nonNullable: true }))).toBeNull();
    expect(safeHrefValidator(new FormControl('mailto:contato@example.com', { nonNullable: true }))).toBeNull();
  });

  it('rejects executable and protocol-relative destinations', () => {
    expect(safeHrefValidator(new FormControl('javascript:alert(1)', { nonNullable: true }))).toEqual({
      unsafeHref: true,
    });
    expect(safeHrefValidator(new FormControl('//malicious.example', { nonNullable: true }))).toEqual({
      unsafeHref: true,
    });
  });

  it('allows an absent optional destination', () => {
    expect(safeOptionalHrefValidator(new FormControl('', { nonNullable: true }))).toBeNull();
  });
});
