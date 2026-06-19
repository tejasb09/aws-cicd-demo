import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';

import { DEFAULT_GREETING, SAMPLE_ITEM_ID } from '../constants';
import { describeConnectInstance } from '../lib/connect';
import { getItemById } from '../lib/dynamodb';
import { optionalEnv, requireEnv } from '../lib/env';
import { json } from '../lib/response';
import { getSecretJson } from '../lib/secrets';
import type { AppSecret, HelloWorldResponse, Item } from '../types';

/**
 * Sample API-Gateway-triggered Lambda that exercises the three integrations a
 * typical service needs:
 *   1. Secrets Manager — read application config/credentials.
 *   2. DynamoDB        — read a record by key.
 *   3. Amazon Connect  — make a (read-only) AWS service API call.
 *
 * Each integration fails soft so the endpoint stays useful before its backing
 * resources are seeded. Adapt this to your real workload.
 */
export const handler: APIGatewayProxyHandlerV2 = async () => {
  const service = requireEnv('SERVICE_NAME');
  const stage = requireEnv('STAGE');

  try {
    // 1. Secrets Manager — pull the configured greeting (falls back to default).
    let greeting = DEFAULT_GREETING;
    try {
      const secret = await getSecretJson<AppSecret>(requireEnv('APP_SECRET_NAME'));
      greeting = secret.greeting?.trim() || DEFAULT_GREETING;
    } catch (error) {
      console.warn('Could not read app secret, using default greeting:', toMessage(error));
    }

    // 2. DynamoDB — read the sample item by primary key.
    let item: Item | null = null;
    try {
      item = (await getItemById<Item>(requireEnv('ITEMS_TABLE_NAME'), SAMPLE_ITEM_ID)) ?? null;
    } catch (error) {
      console.warn('Could not read item from DynamoDB:', toMessage(error));
    }

    // 3. Amazon Connect — describe the configured instance, when one is set.
    let connectInstance: HelloWorldResponse['connectInstance'] = null;
    const connectInstanceId = optionalEnv('CONNECT_INSTANCE_ID');
    if (connectInstanceId) {
      try {
        connectInstance = await describeConnectInstance(connectInstanceId);
      } catch (error) {
        console.warn('Could not describe Connect instance:', toMessage(error));
      }
    }

    const body: HelloWorldResponse = {
      service,
      stage,
      greeting,
      item,
      connectInstance
    };

    return json(200, body);
  } catch (error) {
    console.error('helloWorld error:', toMessage(error));
    return json(500, { message: 'Internal Server Error' });
  }
};

const toMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));
