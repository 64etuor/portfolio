import type { DeepPartial, Profile } from './types';

/**
 * User-override layer — HIGHEST precedence.
 *
 * Anything set here is deep-merged ON TOP of `profile.ts` (see `index.ts`).
 * Use this file to tweak or correct the canonical SSOT without editing the
 * authored data: change a tagline, fix a number, hide/replace a field, etc.
 *
 * Leave it as `{}` to use the profile as-is. Only fill in the keys you want to
 * override; everything else falls through to `profile`.
 */
export const overrides: DeepPartial<Profile> = {};
