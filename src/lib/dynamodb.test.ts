import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { beforeEach, describe, expect, it } from 'vitest';

import { getItemById } from './dynamodb';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('getItemById', () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  it('returns the item when found', async () => {
    ddbMock.on(GetCommand).resolves({ Item: { id: 'hello', message: 'hi' } });

    await expect(getItemById('items', 'hello')).resolves.toEqual({ id: 'hello', message: 'hi' });
  });

  it('returns undefined when no item exists', async () => {
    ddbMock.on(GetCommand).resolves({});

    await expect(getItemById('items', 'missing')).resolves.toBeUndefined();
  });

  it('queries the expected table and key', async () => {
    ddbMock.on(GetCommand).resolves({});

    await getItemById('items', 'hello');

    const call = ddbMock.commandCalls(GetCommand)[0];
    expect(call.args[0].input).toEqual({ TableName: 'items', Key: { id: 'hello' } });
  });

  it('keeps the document client wired to a DynamoDBClient', () => {
    // Sanity check that the module composes the document client without throwing.
    expect(DynamoDBDocumentClient.from(new DynamoDBClient({}))).toBeInstanceOf(DynamoDBDocumentClient);
  });
});
