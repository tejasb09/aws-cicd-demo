// Sample secret the hello-world Lambda reads at runtime.
// The secret VALUE is intentionally not defined here — seed it manually
// (or via a separate pipeline) so real credentials never live in source control.
export const appSecretName = '${self:service}-${sls:stage}-app';

export const secretsManagerResources = {
  AppSecret: {
    Type: 'AWS::SecretsManager::Secret',
    Properties: {
      Name: appSecretName,
      Description: 'Sample application secret read by the hello-world Lambda. Seed the value manually after first deploy.'
    }
  }
};
