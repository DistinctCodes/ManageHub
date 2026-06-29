import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

/**
 * Thin adapter for the Kisi REST API v3.
 *
 * Kisi flow:
 *  grant  → invite user by email to org; returns grant ID
 *  revoke → DELETE /grants/{grantId}
 *
 * The stored externalCredentialId is the numeric Kisi grant ID (as string).
 */
@Injectable()
export class KisiProvider {
  private readonly logger = new Logger(KisiProvider.name);
  private readonly baseUrl = 'https://api.kisi.io';

  private client(apiKey: string): AxiosInstance {
    return axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `KISI-LOGIN ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  }

  /**
   * Grants access to the hub for the given user email.
   * Returns the Kisi grant ID to use as externalCredentialId.
   */
  async grantAccess(
    apiKey: string,
    userEmail: string,
    doorGroupId: string,
  ): Promise<string> {
    const http = this.client(apiKey);

    // Step 1: resolve Kisi user ID by email (members endpoint)
    let kisiUserId: number | null = null;
    try {
      const { data } = await http.get('/organization_members', {
        params: { query: userEmail, limit: 1 },
      });
      if (data?.organization_members?.length) {
        kisiUserId = data.organization_members[0].user.id;
      }
    } catch {
      // user may not exist yet — fall through to invite
    }

    // Step 2: if user not found, create an invitation
    if (!kisiUserId) {
      const { data } = await http.post('/invitations', {
        invitation: { email: userEmail },
      });
      kisiUserId = data?.invitation?.user?.id;
    }

    if (!kisiUserId) {
      throw new Error(`Kisi: could not resolve user ID for ${userEmail}`);
    }

    // Step 3: grant access to the configured door group
    const { data: grantData } = await http.post('/grants', {
      grant: { user_id: kisiUserId, group_id: Number(doorGroupId) },
    });

    const grantId = grantData?.grant?.id;
    if (!grantId) throw new Error('Kisi: grant response did not include an ID');

    this.logger.log(`Kisi: granted access to ${userEmail} (grant ${grantId})`);
    return String(grantId);
  }

  async revokeAccess(apiKey: string, externalCredentialId: string): Promise<void> {
    const http = this.client(apiKey);
    await http.delete(`/grants/${externalCredentialId}`);
    this.logger.log(`Kisi: revoked grant ${externalCredentialId}`);
  }
}
