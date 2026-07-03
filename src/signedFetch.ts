import { fetchAuthSession } from "aws-amplify/auth";
import { AwsClient } from "aws4fetch";

/**
 * SigV4-signed fetch for the AWS_IAM-protected Tsuru public API, using the guest
 * (unauthenticated) Cognito credentials from the W7 identity pool. Requires
 * {@link configureStorefrontAmplify} to have run.
 *
 * The public API accepts unauthenticated *identities* (guest), but every request
 * must still be SigV4-signed — an unsigned call returns 403 "Missing
 * Authentication Token".
 */
export async function signedFetch(
  url: string,
  region: string,
  init?: RequestInit,
): Promise<Response> {
  const session = await fetchAuthSession();
  const creds = session.credentials;
  if (!creds) {
    throw new Error(
      "No guest AWS credentials — did you call configureStorefrontAmplify() with the identity pool?",
    );
  }
  const aws = new AwsClient({
    accessKeyId: creds.accessKeyId,
    secretAccessKey: creds.secretAccessKey,
    sessionToken: creds.sessionToken,
    service: "execute-api",
    region,
  });
  return aws.fetch(url, init);
}
