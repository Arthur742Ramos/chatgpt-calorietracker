import { randomUUID } from "node:crypto";
import { getContainer } from "../cosmos.js";

const TOKENS_CONTAINER = "oauth_tokens";
const AUTH_CODES_CONTAINER = "oauth_codes";

export interface TokenData {
  id: string;
  token: string;
  clientId: string;
  userId: string;
  scopes: string[];
  expiresAt: number; // Unix timestamp in seconds
  resource?: string;
  type: "access" | "refresh";
  createdAt: number;
}

export interface AuthCodeData {
  id: string;
  code: string;
  clientId: string;
  userId: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  redirectUri: string;
  scopes: string[];
  resource?: string;
  expiresAt: number; // Unix timestamp in seconds
  createdAt: number;
}

/**
 * Cosmos DB backed store for OAuth tokens and authorization codes.
 */
export class CosmosTokensStore {
  private getTokensContainer() {
    return getContainer(TOKENS_CONTAINER);
  }

  private getCodesContainer() {
    return getContainer(AUTH_CODES_CONTAINER);
  }

  // Authorization Code methods
  async createAuthCode(data: Omit<AuthCodeData, "id" | "code" | "createdAt" | "expiresAt">): Promise<string> {
    const container = this.getCodesContainer();
    const code = randomUUID();
    const now = Math.floor(Date.now() / 1000);

    const authCode: AuthCodeData = {
      id: code,
      code,
      ...data,
      createdAt: now,
      expiresAt: now + 600, // 10 minutes
    };

    await container.items.create(authCode);
    return code;
  }

  async getAuthCode(code: string): Promise<AuthCodeData | undefined> {
    try {
      const container = this.getCodesContainer();
      const { resource } = await container.item(code, code).read<AuthCodeData>();

      if (!resource) {
        return undefined;
      }

      // Check if expired
      if (resource.expiresAt < Math.floor(Date.now() / 1000)) {
        await this.deleteAuthCode(code);
        return undefined;
      }

      return resource;
    } catch (error: unknown) {
      if ((error as { code?: number }).code === 404) {
        return undefined;
      }
      throw error;
    }
  }

  async deleteAuthCode(code: string): Promise<void> {
    try {
      const container = this.getCodesContainer();
      await container.item(code, code).delete();
    } catch (error: unknown) {
      if ((error as { code?: number }).code !== 404) {
        throw error;
      }
    }
  }

  // Access Token methods
  async createAccessToken(data: Omit<TokenData, "id" | "token" | "createdAt" | "expiresAt" | "type">): Promise<TokenData> {
    const container = this.getTokensContainer();
    const token = randomUUID();
    const now = Math.floor(Date.now() / 1000);

    const tokenData: TokenData = {
      id: token,
      token,
      ...data,
      type: "access",
      createdAt: now,
      expiresAt: now + 3600, // 1 hour
    };

    await container.items.create(tokenData);
    return tokenData;
  }

  async createRefreshToken(data: Omit<TokenData, "id" | "token" | "createdAt" | "expiresAt" | "type">): Promise<TokenData> {
    const container = this.getTokensContainer();
    const token = `refresh_${randomUUID()}`;
    const now = Math.floor(Date.now() / 1000);

    const tokenData: TokenData = {
      id: token,
      token,
      ...data,
      type: "refresh",
      createdAt: now,
      expiresAt: now + 30 * 24 * 3600, // 30 days
    };

    await container.items.create(tokenData);
    return tokenData;
  }

  async getToken(token: string): Promise<TokenData | undefined> {
    try {
      const container = this.getTokensContainer();
      const { resource } = await container.item(token, token).read<TokenData>();

      if (!resource) {
        return undefined;
      }

      // Check if expired
      if (resource.expiresAt < Math.floor(Date.now() / 1000)) {
        await this.deleteToken(token);
        return undefined;
      }

      return resource;
    } catch (error: unknown) {
      if ((error as { code?: number }).code === 404) {
        return undefined;
      }
      throw error;
    }
  }

  async deleteToken(token: string): Promise<void> {
    try {
      const container = this.getTokensContainer();
      await container.item(token, token).delete();
    } catch (error: unknown) {
      if ((error as { code?: number }).code !== 404) {
        throw error;
      }
    }
  }

  async deleteTokensByClientId(clientId: string): Promise<void> {
    const container = this.getTokensContainer();
    const { resources } = await container.items
      .query({
        query: "SELECT * FROM c WHERE c.clientId = @clientId",
        parameters: [{ name: "@clientId", value: clientId }],
      })
      .fetchAll();

    for (const token of resources) {
      await container.item(token.id, token.id).delete();
    }
  }
}

// Singleton instance
let tokensStore: CosmosTokensStore | null = null;

export function getTokensStore(): CosmosTokensStore {
  if (!tokensStore) {
    tokensStore = new CosmosTokensStore();
  }
  return tokensStore;
}
