import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { describeConnectInstance } from '../lib/connect';
import { getItemById } from '../lib/dynamodb';
import { getSecretJson } from '../lib/secrets';
import { handler } from './hello-world';

vi.mock('../lib/secrets', () => ({ getSecretJson: vi.fn() }));
vi.mock('../lib/dynamodb', () => ({ getItemById: vi.fn() }));
vi.mock('../lib/connect', () => ({ describeConnectInstance: vi.fn() }));

const mockedGetSecretJson = vi.mocked(getSecretJson);
const mockedGetItemById = vi.mocked(getItemById);
const mockedDescribeConnectInstance = vi.mocked(describeConnectInstance);

// The handler ignores the event payload, so an empty cast is enough.
const invoke = () => handler({} as APIGatewayProxyEventV2, {} as Context, vi.fn());
const parseBody = (result: Awaited<ReturnType<typeof invoke>>) =>
  JSON.parse((result as { body: string }).body);

describe('hello-world handler', () => {
  beforeEach(() => {
    mockedGetSecretJson.mockResolvedValue({ greeting: 'Hi from secret' });
    mockedGetItemById.mockResolvedValue({ id: 'hello', message: 'stored message' });
    mockedDescribeConnectInstance.mockResolvedValue({ id: 'instance-1', status: 'ACTIVE' });
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('returns greeting, item and skips Connect when no instance configured', async () => {
    const result = await invoke();

    expect(result).toMatchObject({ statusCode: 200 });
    expect(parseBody(result)).toEqual({
      service: 'aws-serverless-template',
      stage: 'test',
      greeting: 'Hi from secret',
      item: { id: 'hello', message: 'stored message' },
      connectInstance: null
    });
    expect(mockedDescribeConnectInstance).not.toHaveBeenCalled();
  });

  it('describes the Connect instance when CONNECT_INSTANCE_ID is set', async () => {
    vi.stubEnv('CONNECT_INSTANCE_ID', 'instance-1');

    const result = await invoke();

    expect(mockedDescribeConnectInstance).toHaveBeenCalledWith('instance-1');
    expect(parseBody(result).connectInstance).toEqual({ id: 'instance-1', status: 'ACTIVE' });
  });

  it('falls back to the default greeting when the secret cannot be read', async () => {
    mockedGetSecretJson.mockRejectedValue(new Error('AccessDenied'));

    const result = await invoke();

    expect(result).toMatchObject({ statusCode: 200 });
    expect(parseBody(result).greeting).toBe('Hello, world!');
  });

  it('returns item: null when the DynamoDB read fails', async () => {
    mockedGetItemById.mockRejectedValue(new Error('ResourceNotFound'));

    const result = await invoke();

    expect(parseBody(result).item).toBeNull();
  });
});
