import { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js";
import { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js";
import { randomUUID } from "node:crypto";
import { getContainer } from "../cosmos.js";

const CLIENTS_CONTAINER = "oauth_clients";

/**
 * Cosmos DB backed store for OAuth clients.
 * Supports Dynamic Client Registration (DCR) as required by ChatGPT.
 */
export class CosmosClientsStore implements OAuthRegisteredClientsStore {
  private getClientsContainer() {
    return getContainer(CLIENTS_CONTAINER);
  }

  async getClient(clientId: string): Promise<OAuthClientInformationFull | undefined> {
    try {
      const container = this.getClientsContainer();
      const { resource } = await container.item(clientId, clientId).read<OAuthClientInformationFull>();

      if (!resource) {
        return undefined;
      }

      // Check if client secret has expired
      if (resource.client_secret_expires_at && resource.client_secret_expires_at > 0) {
        if (resource.client_secret_expires_at < Math.floor(Date.now() / 1000)) {
          console.warn(`Client ${clientId} has expired secret`);
          // Don't delete - let the auth middleware handle rejection
        }
      }

      return resource;
    } catch (error: unknown) {
      if ((error as { code?: number }).code === 404) {
        return undefined;
      }
      throw error;
    }
  }

  async registerClient(
    clientMetadata: Omit<OAuthClientInformationFull, "client_id" | "client_id_issued_at">
  ): Promise<OAuthClientInformationFull> {
    const container = this.getClientsContainer();

    const clientId = `client_${randomUUID()}`;
    const clientSecret = randomUUID(); // Simple secret for demo; use crypto in production
    const issuedAt = Math.floor(Date.now() / 1000);

    const client: OAuthClientInformationFull = {
      ...clientMetadata,
      client_id: clientId,
      client_secret: clientSecret,
      client_id_issued_at: issuedAt,
      client_secret_expires_at: 0, // Never expires (0 means no expiration)
    };

    // Store in Cosmos DB with client_id as both id and partition key
    await container.items.create({
      id: clientId,
      ...client,
    });

    console.log(`Registered new OAuth client: ${clientId}`);
    return client;
  }
}

// Singleton instance
let clientsStore: CosmosClientsStore | null = null;

export function getClientsStore(): CosmosClientsStore {
  if (!clientsStore) {
    clientsStore = new CosmosClientsStore();
  }
  return clientsStore;
}
