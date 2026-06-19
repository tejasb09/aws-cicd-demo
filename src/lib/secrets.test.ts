import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { mockClient } from 'aws-sdk-client-mock';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getSecretJson } from './secrets';

const secretsMock = mockClient(SecretsManagerClient);

describe('getSecretJson', () => {
  beforeEach(() => {
    secretsMock.reset();
  });

  afterEach(() => {
    secretsMock.reset();
  });

  it('parses the SecretString as JSON', async () => {
    secretsMock.on(GetSecretValueCommand).resolves({
      SecretString: JSON.stringify({ greeting: 'Hi there' })
    });

    await expect(getSecretJson<{ greeting: string }>('my-secret')).resolves.toEqual({ greeting: 'Hi there' });
  });

  it('throws when the secret has no SecretString', async () => {
    secretsMock.on(GetSecretValueCommand).resolves({});

    await expect(getSecretJson('my-secret')).rejects.toThrow('does not contain a SecretString value');
  });
});
