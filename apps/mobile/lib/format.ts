import i18n from '../i18n';
import { formatDate as sharedFormatDate } from '@joubuild/shared';

function getLocaleString(): string {
  return i18n.language === 'cs' ? 'cs-CZ' : 'en-US';
}

export function formatDate(date: string | Date): string {
  return sharedFormatDate(date, getLocaleString());
}

export function formatDistanceToNow(date: string | Date): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHrs = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  const cs = i18n.language === 'cs';

  if (diffMin < 1) return cs ? 'právě teď' : 'just now';
  if (diffMin < 60) return cs ? `před ${diffMin} min` : `${diffMin}m ago`;
  if (diffHrs < 24) return cs ? `před ${diffHrs} h` : `${diffHrs}h ago`;
  if (diffDays < 30) return cs ? `před ${diffDays} d` : `${diffDays}d ago`;
  return formatDate(date);
}
