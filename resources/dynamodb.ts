// Sample DynamoDB table the hello-world Lambda reads from.
// Rename / extend this when you adapt the template to a real service.
export const itemsTableName = '${self:service}-${sls:stage}-items';

export const dynamodbResources = {
  ItemsTable: {
    Type: 'AWS::DynamoDB::Table',
    Properties: {
      TableName: itemsTableName,
      BillingMode: 'PAY_PER_REQUEST',
      AttributeDefinitions: [
        {
          AttributeName: 'id',
          AttributeType: 'S'
        }
      ],
      KeySchema: [
        {
          AttributeName: 'id',
          KeyType: 'HASH'
        }
      ],
      // Cost-free safety net for non-prod data. Tighten / remove for prod stacks.
      PointInTimeRecoverySpecification: {
        PointInTimeRecoveryEnabled: true
      }
    }
  }
};
