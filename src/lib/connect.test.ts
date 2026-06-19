import { ConnectClient, DescribeInstanceCommand } from '@aws-sdk/client-connect';
import { mockClient } from 'aws-sdk-client-mock';
import { beforeEach, describe, expect, it } from 'vitest';

import { describeConnectInstance } from './connect';

const connectMock = mockClient(ConnectClient);

describe('describeConnectInstance', () => {
  beforeEach(() => {
    connectMock.reset();
  });

  it('returns a trimmed instance summary', async () => {
    connectMock.on(DescribeInstanceCommand).resolves({
      Instance: { InstanceStatus: 'ACTIVE', InstanceAlias: 'my-connect' }
    });

    await expect(describeConnectInstance('instance-1')).resolves.toEqual({
      id: 'instance-1',
      status: 'ACTIVE',
      instanceAlias: 'my-connect'
    });
  });

  it('passes the instance id to DescribeInstance', async () => {
    connectMock.on(DescribeInstanceCommand).resolves({});

    await describeConnectInstance('instance-1');

    const call = connectMock.commandCalls(DescribeInstanceCommand)[0];
    expect(call.args[0].input).toEqual({ InstanceId: 'instance-1' });
  });

  it('handles a response with no Instance field', async () => {
    connectMock.on(DescribeInstanceCommand).resolves({});

    await expect(describeConnectInstance('instance-1')).resolves.toEqual({
      id: 'instance-1',
      status: undefined,
      instanceAlias: undefined
    });
  });
});
