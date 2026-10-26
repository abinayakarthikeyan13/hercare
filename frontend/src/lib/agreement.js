/**
 * Single source of truth for the HerCare Terms & Conditions consent.
 *
 * - AGREEMENT_VERSION: bump whenever the terms text changes MATERIALLY
 *   (new sections, changed data practices). A bump requires every user to
 *   consent again; cosmetic edits do not need a bump.
 * - hasValidAgreement(user): version-aware consent check. It combines the
 *   same two sources the app always used — the server-side account record
 *   (user.privacy_agreement_accepted / privacy_agreement_version from
 *   /auth/me) and the local device record (localStorage) — and now also
 *   compares the stored version against the current one, so consent given
 *   under older terms no longer counts.
 *
 * Consent is ONLY ever written by the Terms page after the user ticks the
 * checkbox and presses "I Agree & Continue" — never automatically.
 */
export const AGREEMENT_VERSION = '2.0';

export function hasValidAgreement(user) {
  if (
    user &&
    user.privacy_agreement_accepted &&
    user.privacy_agreement_version === AGREEMENT_VERSION
  ) {
    return true;
  }
  try {
    return (
      localStorage.getItem('hercare_agreement_accepted') === 'true' &&
      localStorage.getItem('hercare_agreement_version') === AGREEMENT_VERSION
    );
  } catch {
    return false;
  }
}
