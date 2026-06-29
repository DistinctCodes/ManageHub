import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

/**
 * Thin adapter for the Brivo Access API.
 *
 * Brivo flow:
 *  grant  → find user by email → assign credential-template → returns credential ID
 *  revoke → DELETE /v1/api/credentials/{credentialId}
 *
 * The stored externalCredentialId is the Brivo credential ID (as string).
 * The stored doorGroupId doubles as the Brivo credential-template ID.
 * The apiKey is treated as a pre-obtained OAuth2 Bearer token or Brivo API key.
 */
@Injectable()
export class BrivoProvider {
  private readonly logger = new Logger(BrivoProvider.name);
  private readonly baseUrl = 'https://auth.brivo.com';

  private client(apiKey: string): AxiosInstance {
    return axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  }

  /**
   * Grants access by assigning a credential to the user in Brivo.
   * Returns the credential ID as the externalCredentialId.
   */
  async grantAccess(
    apiKey: string,
    userEmail: string,
    credentialTemplateId: string,
  ): Promise<string> {
    const http = this.client(apiKey);

    // Step 1: find user by email
    const { data: usersData } = await http.get('/v1/api/users', {
      params: { filter: `email eq "${userEmail}"`, pageSize: 1 },
    });

    const user = usersData?.data?.[0];
    if (!user) {
      throw new Error(`Brivo: user not found for email ${userEmail}`);
    }

    // Step 2: assign credential using the template
    const { data: credData } = await http.post('/v1/api/credentials', {
      credentialFormat: { id: Number(credentialTemplateId) },
      userId: user.id,
    });

    const credentialId = credData?.id ?? credData?.data?.id;
    if (!credentialId) throw new Error('Brivo: credential response did not include an ID');

    this.logger.log(`Brivo: granted credential ${credentialId} to ${userEmail}`);
    return String(credentialId);
  }

  async revokeAccess(apiKey: string, externalCredentialId: string): Promise<void> {
    const http = this.client(apiKey);
    await http.delete(`/v1/api/credentials/${externalCredentialId}`);
    this.logger.log(`Brivo: revoked credential ${externalCredentialId}`);
  }
}
