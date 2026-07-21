import { Injectable } from '@angular/core';
import { AbstractControl, FormArray } from '@angular/forms';

@Injectable({ providedIn: 'root' })
export class FormArrayEditorService {
  public move<TControl extends AbstractControl>(
    controls: FormArray<TControl>,
    index: number,
    offset: -1 | 1,
  ): void {
    const destination = index + offset;

    if (destination < 0 || destination >= controls.length)
      return;

    const control = controls.at(index) as TControl;
    controls.removeAt(index, { emitEvent: false });
    controls.insert(destination, control);
    controls.markAsDirty();
    controls.updateValueAndValidity();
  }

  public remove<TControl extends AbstractControl>(controls: FormArray<TControl>, index: number): void {
    if (index < 0 || index >= controls.length)
      return;

    controls.removeAt(index);
    controls.markAsDirty();
  }
}
