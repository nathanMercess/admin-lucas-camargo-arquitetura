import { FormControl } from '@angular/forms';

import { approvedThemeColorValidator } from './approved-theme-color.validator';

describe('approvedThemeColorValidator', () => {
  it.each(['#e36571', 'rgb(51 51 50 / 20%)'])(
    'accepts the approved color syntax %s',
    (color) => {
      const control = new FormControl(color, {
        nonNullable: true,
        validators: approvedThemeColorValidator,
      });

      expect(control.valid).toBe(true);
    },
  );

  it.each(['url(javascript:alert(1))', 'rgb(999 51 50 / 20%)', 'rgb(51 51 50 / 120%)'])(
    'rejects unsafe or out-of-range color syntax %s',
    (color) => {
      const control = new FormControl(color, {
        nonNullable: true,
        validators: approvedThemeColorValidator,
      });

      expect(control.errors).toEqual({ approvedThemeColor: true });
    },
  );
});
