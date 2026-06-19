import type { AWS } from '@serverless/typescript';

import { dynamodbResources, itemsTableName } from './resources/dynamodb';
import { appSecretName, secretsManagerResources } from './resources/secrets-manager';

const serviceName = process.env.SERVICE_NAME ?? 'nn-aws-cicd-demo';

// Lambda execution runtime — matches the Node 24 local toolchain (see .nvmrc).
// Override per environment with NODE_RUNTIME (e.g. nodejs22.x) if a region ever
// lacks nodejs24.x; the esbuild `target` below is derived from this automatically.
// Use `||` (not `??`) so an empty NODE_RUNTIME (e.g. an unset GitHub Environment
// var, which expands to "") falls back to the default instead of an invalid "".
const nodeRuntime = (process.env.NODE_RUNTIME || 'nodejs24.x') as NonNullable<AWS['provider']['runtime']>;
const esbuildTarget = nodeRuntime.replace('nodejs', 'node').replace('.x', '');

// serverless-iam-roles-per-function augments each function with these optional fields.
type FunctionWithIam = NonNullable<AWS['functions']>[string] & {
  iamRoleStatementsName?: string;
  iamRoleStatements?: {
    Effect: string;
    Action: string[];
    Resource: unknown[];
  }[];
};

type AwsWithIamFunctions = Omit<AWS, 'functions'> & {
  functions?: Record<string, FunctionWithIam>;
};

const serverlessConfiguration: AwsWithIamFunctions = {
  service: serviceName,
  frameworkVersion: '3',
  plugins: ['serverless-esbuild', 'serverless-iam-roles-per-function', 'serverless-offline'],
  provider: {
    name: 'aws',
    runtime: nodeRuntime,
    stage: '${opt:stage, env:STAGE, "dev"}',
    region: '${opt:region, env:AWS_REGION, "ap-southeast-2"}' as AWS['provider']['region'],
    memorySize: 256,
    timeout: 15,
    logRetentionInDays: 14,
    // No account-wide IAM role here — every function gets its own least-privilege role
    // via serverless-iam-roles-per-function (see iamRoleStatements below).
    environment: {
      SERVICE_NAME: serviceName,
      STAGE: '${sls:stage}',
      APP_SECRET_NAME: appSecretName,
      ITEMS_TABLE_NAME: itemsTableName,
      CONNECT_INSTANCE_ID: '${env:CONNECT_INSTANCE_ID, ""}'
    },
    httpApi: {
      cors: {
        allowedOrigins: ['*'],
        allowedHeaders: ['content-type', 'authorization'],
        allowedMethods: ['GET', 'OPTIONS']
      }
    }
  },
  package: {
    individually: true
  },
  custom: {
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      target: esbuildTarget,
      platform: 'node',
      // AWS SDK v3 is provided by the Lambda runtime — don't bundle it.
      external: ['@aws-sdk/*']
    }
  },
  functions: {
    helloWorld: {
      handler: 'src/functions/hello-world.handler',
      iamRoleStatementsName: '${self:service}-${sls:stage}-hello-world-role',
      events: [{ httpApi: { method: 'GET', path: '/hello' } }],
      iamRoleStatements: [
        {
          Effect: 'Allow',
          Action: ['secretsmanager:GetSecretValue'],
          Resource: [{ Ref: 'AppSecret' }]
        },
        {
          Effect: 'Allow',
          Action: ['dynamodb:GetItem'],
          Resource: [{ 'Fn::GetAtt': ['ItemsTable', 'Arn'] }]
        },
        {
          Effect: 'Allow',
          Action: ['connect:DescribeInstance'],
          Resource: [{ 'Fn::Sub': 'arn:aws:connect:${AWS::Region}:${AWS::AccountId}:instance/*' }]
        }
      ]
    }
  },
  resources: {
    Resources: {
      ...secretsManagerResources,
      ...dynamodbResources
    },
    Outputs: {
      AppSecretName: {
        Description: 'Seed this secret with your application config/credentials.',
        Value: appSecretName
      },
      ItemsTableName: {
        Value: itemsTableName
      },
      HelloWorldUrl: {
        Description: 'Public endpoint for the hello-world sample.',
        Value: {
          'Fn::Sub': 'https://${HttpApi}.execute-api.${AWS::Region}.amazonaws.com/hello'
        }
      }
    }
  }
};

module.exports = serverlessConfiguration;
