import type { KashierConfig } from '@tiraze/core';
import type { AppEnv } from '../auth.ts';
export function kashier(env: AppEnv): KashierConfig | null {
  if (
    !['test', 'live'].includes(env.KASHIER_MODE ?? '') ||
    !env.KASHIER_MERCHANT_ID ||
    !env.KASHIER_API_KEY ||
    !env.KASHIER_SECRET_KEY
  )
    return null;
  return {
    mode: env.KASHIER_MODE as 'test' | 'live',
    merchantId: env.KASHIER_MERCHANT_ID,
    apiKey: env.KASHIER_API_KEY,
    secretKey: env.KASHIER_SECRET_KEY,
  };
}
