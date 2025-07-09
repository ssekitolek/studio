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

export function isInvalidId(id: string | null | undefined): boolean {
    if (!id) return true;
    const trimmedId = id.trim();
    return trimmedId === "" || trimmedId.toLowerCase() === "undefined";
}
