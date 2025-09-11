export function showToast(detail) {
  // detail: { title, body, variant: 'success'|'danger'|'info'|'warning' }
  window.dispatchEvent(new CustomEvent('toast:show', { detail }));
}
