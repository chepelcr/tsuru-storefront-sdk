import { Amplify } from "aws-amplify";

export interface StorefrontAuthOptions {
  /** W7 anonymous identity pool, e.g. "us-east-1:be94bc45-...". */
  identityPoolId: string;
  /** AWS region, e.g. "us-east-1". */
  region: string;
}

let configured = false;

/**
 * Configure Amplify for guest (unauthenticated) access to the W7 identity pool.
 * Idempotent — safe to call once at app startup. Guest AWS credentials are then
 * available via `fetchAuthSession()` and used to SigV4-sign public-API calls.
 */
export function configureStorefrontAmplify(opts: StorefrontAuthOptions): void {
  if (configured) return;
  Amplify.configure({
    Auth: {
      Cognito: {
        identityPoolId: opts.identityPoolId,
        allowGuestAccess: true,
      } as any,
    },
  });
  configured = true;
}
