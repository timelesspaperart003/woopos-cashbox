
/**
 * Service to interact with Google Cloud Secret Manager via REST API.
 * Note: Since this is a client-side app, it requires a valid OAuth2 Access Token.
 */

interface SecretVersionResponse {
  name: string;
  payload: {
    data: string; // Base64 encoded string
  };
}

/**
 * Fetches the payload of a specific secret version from Google Secret Manager.
 * 
 * @param projectId Google Cloud Project ID
 * @param secretId The ID of the secret (e.g., 'woocommerce-pos-key')
 * @param accessToken Valid Google Cloud Access Token (Bearer token)
 * @param version The version to fetch, defaults to 'latest'
 * @returns The decoded string value of the secret
 */
export const getSecretValue = async (
  projectId: string,
  secretId: string,
  accessToken: string,
  version: string = 'latest'
): Promise<string> => {
  if (!projectId || !secretId || !accessToken) {
    throw new Error('Missing GCP Project ID, Secret ID, or Access Token');
  }

  const url = `https://secretmanager.googleapis.com/v1/projects/${projectId}/secrets/${secretId}/versions/${version}:access`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Secret Manager API Error (${response.status}): ${errorText}`);
    }

    const data: SecretVersionResponse = await response.json();
    
    // Decode Base64 payload
    if (data.payload && data.payload.data) {
      return atob(data.payload.data);
    } else {
      throw new Error('Secret payload is empty');
    }

  } catch (error) {
    console.error(`Failed to fetch secret ${secretId}:`, error);
    throw error;
  }
};
