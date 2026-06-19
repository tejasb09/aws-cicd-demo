export const requireEnv = (name: string): string => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

export const optionalEnv = (name: string): string | undefined => {
  const value = process.env[name];
  return value && value.trim() ? value : undefined;
};
