import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const SAFE_HREF_PATTERN = /^(?:#[a-z0-9_-]+|\/(?!\/)[^\s]*|https:\/\/[^\s]+|mailto:[^\s]+|tel:\+?[0-9() .-]+)$/i;

export const safeHrefValidator: ValidatorFn = (
  control: AbstractControl<string>,
): ValidationErrors | null => SAFE_HREF_PATTERN.test(control.value.trim())
  ? null
  : { unsafeHref: true };

export const safeOptionalHrefValidator: ValidatorFn = (
  control: AbstractControl<string>,
): ValidationErrors | null => control.value.trim() === '' || SAFE_HREF_PATTERN.test(control.value.trim())
  ? null
  : { unsafeHref: true };
