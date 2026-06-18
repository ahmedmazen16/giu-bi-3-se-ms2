// src/validation.js — small helpers for inline form validation.

export const isBlank = (v) => v == null || String(v).trim() === '';
export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());
export const isPositiveNum = (v) => v !== '' && v != null && !Number.isNaN(Number(v)) && Number(v) >= 0;

// Run a set of rules against a values object. `rules` maps field -> validator fn
// returning an error string (or falsy when valid). Returns an errors object.
export function runValidation(values, rules) {
  const errors = {};
  for (const field in rules) {
    const msg = rules[field](values[field], values);
    if (msg) errors[field] = msg;
  }
  return errors;
}

// Inline field-error element. Render under an input.
export function FieldError({ msg }) {
  if (!msg) return null;
  return <div className="field-error">{msg}</div>;
}
