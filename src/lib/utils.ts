import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isValidUrl(url: string | undefined | null): url is string {
  if (!url) return false;
  // A simple check for http, https, or relative / paths.
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/');
}

/**
 * Recursively removes a specified key from an object or from objects within an array.
 * This is useful for cleaning data from react-hook-form's useFieldArray before sending to Firestore,
 * which adds a temporary 'id' field for keying that Firestore cannot serialize.
 * @param obj The object or array to clean.
 * @param keyToRemove The key to remove.
 * @returns A new object or array with the specified key removed.
 */
export function removeKeyRecursively(obj: any, keyToRemove: string): any {
    if (Array.isArray(obj)) {
        return obj.map(item => removeKeyRecursively(item, keyToRemove));
    }

    if (obj !== null && typeof obj === 'object') {
        const newObj: { [key: string]: any } = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                if (key === keyToRemove) {
                    continue; // Skip this key
                }
                newObj[key] = removeKeyRecursively(obj[key], keyToRemove);
            }
        }
        return newObj;
    }

    return obj;
}
