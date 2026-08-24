import { SiteConfigV1 } from '../models/site-config-v1.model';
import { SiteConfigV2 } from '../models/site-config-v2.model';

export function isSiteConfigV1(value: unknown): value is SiteConfigV1 {
  return isRecord(value) && value['schemaVersion'] === 1;
}

export function isSiteConfigV2(value: unknown): value is SiteConfigV2 {
  return isRecord(value) && value['schemaVersion'] === 2;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
