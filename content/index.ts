import type { DeepPartial, Profile } from './types';
import { profile } from './profile';
import { overrides } from './overrides';

export * from './types';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

/**
 * Deep-merge `patch` (DeepPartial) onto `base`.
 *
 * - Plain objects are merged key-by-key (recursively).
 * - Arrays and primitives from `patch` REPLACE the corresponding value in `base`.
 * - `undefined` values in `patch` are ignored (they do not clobber `base`).
 *
 * `patch` always wins on conflict, so the override layer has highest precedence.
 */
function deepMerge<T>(base: T, patch: DeepPartial<T>): T {
  if (!isPlainObject(base) || !isPlainObject(patch)) {
    return (patch as unknown as T) ?? base;
  }

  const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };

  for (const [key, patchValue] of Object.entries(patch)) {
    if (patchValue === undefined) continue;

    const baseValue = (base as Record<string, unknown>)[key];
    if (isPlainObject(baseValue) && isPlainObject(patchValue)) {
      result[key] = deepMerge(baseValue, patchValue as DeepPartial<typeof baseValue>);
    } else {
      result[key] = patchValue;
    }
  }

  return result as T;
}

function mergeProfile(base: Profile, patch: DeepPartial<Profile>): Profile {
  return deepMerge(base, patch);
}

/** Canonical, fully-merged profile. Import this everywhere. */
export const PROFILE = mergeProfile(profile, overrides);

