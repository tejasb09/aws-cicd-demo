import { beforeEach, vi } from 'vitest';

beforeEach(() => {
  vi.stubEnv('SERVICE_NAME', 'aws-serverless-template');
  vi.stubEnv('STAGE', 'test');
  vi.stubEnv('AWS_REGION', 'ap-southeast-2');
  vi.stubEnv('APP_SECRET_NAME', 'aws-serverless-template-test-app');
  vi.stubEnv('ITEMS_TABLE_NAME', 'aws-serverless-template-test-items');
  vi.stubEnv('CONNECT_INSTANCE_ID', '');
});
