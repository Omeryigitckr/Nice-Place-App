/**
 * One-shot location result from PickLocationScreen.
 * Prefer this over route params so Add/Edit Place stay mounted and form state is preserved.
 */

export type LocationPickerResult = {
  latitude: number;
  longitude: number;
  addressText?: string | null;
};

let pendingResult: LocationPickerResult | null = null;

export function publishLocationPickerResult(result: LocationPickerResult): void {
  pendingResult = {
    latitude: result.latitude,
    longitude: result.longitude,
    addressText: result.addressText ?? null,
  };
}

/** Read and clear the pending result (call on screen focus). */
export function consumeLocationPickerResult(): LocationPickerResult | null {
  const result = pendingResult;
  pendingResult = null;
  return result;
}

export function clearLocationPickerResult(): void {
  pendingResult = null;
}
