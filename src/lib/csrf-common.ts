export const COOKIE_NAME = 'csrfToken';

/**
 * Client-side utility to get the CSRF token from the cookie.
 * This is used for double-submit CSRF protection in forms.
 */
export function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  
  const name = COOKIE_NAME + "=";
  const decodedCookie = decodeURIComponent(document.cookie);
  const ca = decodedCookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) === 0) {
      return c.substring(name.length, c.length);
    }
  }
  return '';
}
