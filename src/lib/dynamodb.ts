import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

// DocumentClient marshals/unmarshals plain JS objects to DynamoDB attribute values.
const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/**
 * Read a single item by primary key (`id`) from the given table.
 * Returns `undefined` when no item exists.
 */
export const getItemById = async <T>(tableName: string, id: string): Promise<T | undefined> => {
  const response = await documentClient.send(
    new GetCommand({
      TableName: tableName,
      Key: { id }
    })
  );

  return response.Item as T | undefined;
};
