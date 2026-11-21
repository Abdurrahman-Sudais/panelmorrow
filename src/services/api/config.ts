/**
 * Runtime configuration. Only non-secret, public values belong here.
 * AWS credentials are NEVER shipped to the browser: the frontend talks to an
 * API Gateway backend that authorises calls with Cognito-issued JWTs, and the
 * backend's IAM role calls SageMaker, Bedrock, S3 and DynamoDB.
 */
export const apiConfig = {
  mode: (import.meta.env.VITE_API_MODE as "mock" | "live" | undefined) ?? "mock",
  baseUrl: (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "",
  cognito: {
    region: (import.meta.env.VITE_COGNITO_REGION as string | undefined) ?? "",
    userPoolId: (import.meta.env.VITE_COGNITO_USER_POOL_ID as string | undefined) ?? "",
    clientId: (import.meta.env.VITE_COGNITO_CLIENT_ID as string | undefined) ?? "",
  },
};

export const isMock = apiConfig.mode !== "live";

/** Simulated network latency for mock services so loading states are exercised. */
export const mockDelay = (ms = 350) => new Promise((r) => setTimeout(r, ms + Math.random() * 200));
