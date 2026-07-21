import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const RGB_ALPHA_PATTERN = /^rgb\(\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s*\/\s*(\d{1,3})%\s*\)$/;

export const approvedThemeColorValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const value = control.value;

  if (typeof value !== 'string')
    return { approvedThemeColor: true };

  if (HEX_COLOR_PATTERN.test(value))
    return null;

  const rgbMatch = RGB_ALPHA_PATTERN.exec(value);

  if (!rgbMatch)
    return { approvedThemeColor: true };

  const channels = [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])];
  const alphaPercentage = Number(rgbMatch[4]);
  const hasInvalidChannel = channels.some((channel) => channel > 255);

  if (hasInvalidChannel || alphaPercentage > 100)
    return { approvedThemeColor: true };

  return null;
};
