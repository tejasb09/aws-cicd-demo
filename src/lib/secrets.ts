import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

// One client per container — reused across warm invocations.
const secretsManagerClient = new SecretsManagerClient({});

/**
 * Fetch a Secrets Manager secret and parse its SecretString as JSON.
 * Throws if the secret has no string value.
 */
export const getSecretJson = async <T>(secretId: string): Promise<T> => {
  const response = await secretsManagerClient.send(
    new GetSecretValueCommand({
      SecretId: secretId
    })
  );

  if (!response.SecretString) {
    throw new Error(`Secret "${secretId}" does not contain a SecretString value.`);
  }

  return JSON.parse(response.SecretString) as T;
};
