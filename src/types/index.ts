import type { ConnectInstanceSummary } from '../lib/connect';

// Shape of the JSON document stored in the sample app secret.
export interface AppSecret {
  greeting?: string;
}

// Shape of an item in the sample DynamoDB table.
export interface Item {
  id: string;
  message?: string;
}

export interface HelloWorldResponse {
  service: string;
  stage: string;
  greeting: string;
  item: Item | null;
  connectInstance: ConnectInstanceSummary | null;
}
