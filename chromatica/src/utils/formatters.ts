/**
 * Formatting Utilities
 */

/**
 * Format a date to readable string
 */
export function formatDate(date: Date | string | number): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Format a time string
 */
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Format duration in minutes to readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

/**
 * Format color hex to human-readable name
 */
export function formatColorName(hex: string): string {
  // Simple mapping for common colors
  const colorMap: Record<string, string> = {
    '#FF6B6B': 'Coral Red',
    '#4ECDC4': 'Turquoise',
    '#45B7D1': 'Sky Blue',
    '#96CEB4': 'Sage Green',
    '#FFEAA7': 'Butter Yellow',
    '#DDA0DD': 'Plum Purple',
    '#98D8C8': 'Mint Green',
    '#F7DC6F': 'Honey Gold',
    '#BB8FCE': 'Lavender',
    '#85C1E9': 'Periwinkle Blue',
    '#F8B500': 'Marigold',
    '#82E0AA': 'Celadon',
    '#F1948A': 'Salmon Pink',
    '#D5A6BD': 'Rose Pink',
    '#AED6F1': 'Powder Blue'
  };
  
  return colorMap[hex.toUpperCase()] || `Color ${hex}`;
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Capitalize first letter
 */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}
