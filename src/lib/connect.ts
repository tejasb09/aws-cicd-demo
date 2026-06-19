import { ConnectClient, DescribeInstanceCommand } from '@aws-sdk/client-connect';

const connectClient = new ConnectClient({});

export interface ConnectInstanceSummary {
  id: string;
  status?: string;
  instanceAlias?: string;
}

/**
 * Sample read-only Amazon Connect API call. Describes a Connect instance and
 * returns a trimmed-down summary. Demonstrates calling a non-trivial AWS service
 * (beyond Secrets Manager / DynamoDB) from a Lambda with scoped IAM.
 */
export const describeConnectInstance = async (instanceId: string): Promise<ConnectInstanceSummary> => {
  const response = await connectClient.send(
    new DescribeInstanceCommand({
      InstanceId: instanceId
    })
  );

  return {
    id: instanceId,
    status: response.Instance?.InstanceStatus,
    instanceAlias: response.Instance?.InstanceAlias
  };
};
