export const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: {
    'content-type': 'application/json'
  },
  body: JSON.stringify(body)
});
