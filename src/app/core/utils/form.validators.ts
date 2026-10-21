import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { ageOn, toIsoDate } from './date.utils';

export const PHONE_PATTERN = /^\+?[0-9][0-9\s-]{7,14}$/;

/** Requires the control's date value to be at least `years` years in the past. */
export function minAgeValidator(years: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as Date | null;
    if (!value) return null;
    return ageOn(toIsoDate(value)) >= years ? null : { minAge: { requiredAge: years } };
  };
}

/** Group validator: flags `confirmField` with `mismatch` when it differs from `field`. */
export function matchFieldsValidator(field: string, confirmField: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const confirm = group.get(confirmField);
    if (!confirm) return null;
    const mismatch = !!confirm.value && group.get(field)?.value !== confirm.value;
    const { mismatch: _previous, ...otherErrors } = confirm.errors ?? {};
    const errors = mismatch ? { ...otherErrors, mismatch: true } : otherErrors;
    confirm.setErrors(Object.keys(errors).length ? errors : null);
    return null;
  };
}

/** At least one upper case letter, one lower case letter, one digit and one symbol. */
export function strongPasswordValidator(control: AbstractControl): ValidationErrors | null {
  const value = (control.value as string) ?? '';
  if (!value) return null;
  const strong = /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value) && /\W/.test(value);
  return strong ? null : { weakPassword: true };
}
