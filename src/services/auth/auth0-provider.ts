import { Response } from "express";
import { OAuthServerProvider, AuthorizationParams } from "@modelcontextprotocol/sdk/server/auth/provider.js";
import { OAuthClientInformationFull, OAuthTokens, OAuthTokenRevocationRequest } from "@modelcontextprotocol/sdk/shared/auth.js";
import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { InvalidRequestError } from "@modelcontextprotocol/sdk/server/auth/errors.js";
import { getClientsStore, CosmosClientsStore } from "./clients-store.js";
import { getTokensStore, CosmosTokensStore } from "./tokens-store.js";

/**
 * Auth0 configuration
 */
export interface Auth0Config {
  domain: string; // e.g., "your-tenant.auth0.com"
  clientId: string;
  clientSecret: string;
  audience?: string;
}

/**
 * OAuth provider that uses Auth0 for user authentication
 * while handling MCP OAuth flow (DCR, tokens) ourselves.
 */
export class Auth0OAuthProvider implements OAuthServerProvider {
  private auth0Config: Auth0Config;
  private tokensStore: CosmosTokensStore;
  private _clientsStore: CosmosClientsStore;
  private baseUrl: string;

  constructor(auth0Config: Auth0Config, baseUrl: string) {
    this.auth0Config = auth0Config;
    this.baseUrl = baseUrl;
    this.tokensStore = getTokensStore();
    this._clientsStore = getClientsStore();
  }

  get clientsStore(): CosmosClientsStore {
    return this._clientsStore;
  }

  /**
   * Begin authorization flow - redirect to Auth0 for login
   */
  async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response
  ): Promise<void> {
    // Validate redirect URI
    if (!client.redirect_uris.includes(params.redirectUri)) {
      throw new InvalidRequestError("Unregistered redirect_uri");
    }

    // Store authorization request in session/state
    // We encode the MCP client's params in the Auth0 state parameter
    const stateData = {
      mcpClientId: client.client_id,
      redirectUri: params.redirectUri,
      codeChallenge: params.codeChallenge,
      scopes: params.scopes || [],
      state: params.state,
      resource: params.resource?.toString(),
    };

    const encodedState = Buffer.from(JSON.stringify(stateData)).toString("base64url");

    // Build Auth0 authorization URL
    const auth0AuthUrl = new URL(`https://${this.auth0Config.domain}/authorize`);
    auth0AuthUrl.searchParams.set("client_id", this.auth0Config.clientId);
    auth0AuthUrl.searchParams.set("response_type", "code");
    auth0AuthUrl.searchParams.set("redirect_uri", `${this.baseUrl}/oauth/callback`);
    auth0AuthUrl.searchParams.set("scope", "openid profile email");
    auth0AuthUrl.searchParams.set("state", encodedState);

    if (this.auth0Config.audience) {
      auth0AuthUrl.searchParams.set("audience", this.auth0Config.audience);
    }

    // Redirect to Auth0 for user login
    res.redirect(auth0AuthUrl.toString());
  }

  /**
   * Handle Auth0 callback - exchange Auth0 code for user info,
   * then issue our own authorization code to the MCP client
   */
  async handleAuth0Callback(
    auth0Code: string,
    state: string
  ): Promise<{ redirectUrl: string }> {
    // Decode the state to get original MCP client params
    const stateData = JSON.parse(Buffer.from(state, "base64url").toString());

    // Exchange Auth0 code for tokens
    const tokenResponse = await fetch(`https://${this.auth0Config.domain}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: this.auth0Config.clientId,
        client_secret: this.auth0Config.clientSecret,
        code: auth0Code,
        redirect_uri: `${this.baseUrl}/oauth/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Auth0 token exchange failed: ${error}`);
    }

    const auth0Tokens = await tokenResponse.json() as { access_token: string };

    // Get user info from Auth0
    const userInfoResponse = await fetch(`https://${this.auth0Config.domain}/userinfo`, {
      headers: { Authorization: `Bearer ${auth0Tokens.access_token}` },
    });

    if (!userInfoResponse.ok) {
      throw new Error("Failed to get user info from Auth0");
    }

    const userInfo = await userInfoResponse.json() as { sub: string };
    const userId = userInfo.sub; // Auth0 user ID

    // Create our own authorization code for the MCP client
    const mcpCode = await this.tokensStore.createAuthCode({
      clientId: stateData.mcpClientId,
      userId,
      codeChallenge: stateData.codeChallenge,
      codeChallengeMethod: "S256",
      redirectUri: stateData.redirectUri,
      scopes: stateData.scopes,
      resource: stateData.resource,
    });

    // Build redirect URL back to MCP client
    const redirectUrl = new URL(stateData.redirectUri);
    redirectUrl.searchParams.set("code", mcpCode);
    if (stateData.state) {
      redirectUrl.searchParams.set("state", stateData.state);
    }

    return { redirectUrl: redirectUrl.toString() };
  }

  /**
   * Get the code challenge for an authorization code
   */
  async challengeForAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string
  ): Promise<string> {
    const codeData = await this.tokensStore.getAuthCode(authorizationCode);

    if (!codeData) {
      throw new Error("Invalid authorization code");
    }

    if (codeData.clientId !== client.client_id) {
      throw new Error("Authorization code was not issued to this client");
    }

    return codeData.codeChallenge;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
    _codeVerifier?: string, // Verified by SDK
    _redirectUri?: string,
    _resource?: URL
  ): Promise<OAuthTokens> {
    const codeData = await this.tokensStore.getAuthCode(authorizationCode);

    if (!codeData) {
      throw new Error("Invalid authorization code");
    }

    if (codeData.clientId !== client.client_id) {
      throw new Error("Authorization code was not issued to this client");
    }

    // Delete the used code
    await this.tokensStore.deleteAuthCode(authorizationCode);

    // Create access token
    const accessToken = await this.tokensStore.createAccessToken({
      clientId: client.client_id,
      userId: codeData.userId,
      scopes: codeData.scopes,
      resource: codeData.resource,
    });

    // Create refresh token
    const refreshToken = await this.tokensStore.createRefreshToken({
      clientId: client.client_id,
      userId: codeData.userId,
      scopes: codeData.scopes,
      resource: codeData.resource,
    });

    return {
      access_token: accessToken.token,
      token_type: "bearer",
      expires_in: 3600,
      refresh_token: refreshToken.token,
      scope: codeData.scopes.join(" "),
    };
  }

  /**
   * Exchange refresh token for new access token
   */
  async exchangeRefreshToken(
    client: OAuthClientInformationFull,
    refreshToken: string,
    scopes?: string[],
    _resource?: URL
  ): Promise<OAuthTokens> {
    const tokenData = await this.tokensStore.getToken(refreshToken);

    if (!tokenData || tokenData.type !== "refresh") {
      throw new Error("Invalid refresh token");
    }

    if (tokenData.clientId !== client.client_id) {
      throw new Error("Refresh token was not issued to this client");
    }

    // Create new access token
    const newAccessToken = await this.tokensStore.createAccessToken({
      clientId: client.client_id,
      userId: tokenData.userId,
      scopes: scopes || tokenData.scopes,
      resource: tokenData.resource,
    });

    return {
      access_token: newAccessToken.token,
      token_type: "bearer",
      expires_in: 3600,
      refresh_token: refreshToken, // Return same refresh token
      scope: (scopes || tokenData.scopes).join(" "),
    };
  }

  /**
   * Verify access token and return auth info
   */
  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const tokenData = await this.tokensStore.getToken(token);

    if (!tokenData || tokenData.type !== "access") {
      throw new Error("Invalid or expired access token");
    }

    return {
      token,
      clientId: tokenData.clientId,
      scopes: tokenData.scopes,
      expiresAt: tokenData.expiresAt,
      resource: tokenData.resource ? new URL(tokenData.resource) : undefined,
      extra: {
        userId: tokenData.userId, // This is the Auth0 user ID
      },
    };
  }

  /**
   * Revoke a token
   */
  async revokeToken(
    client: OAuthClientInformationFull,
    request: OAuthTokenRevocationRequest
  ): Promise<void> {
    const tokenData = await this.tokensStore.getToken(request.token);

    if (tokenData && tokenData.clientId === client.client_id) {
      await this.tokensStore.deleteToken(request.token);
    }
    // If token doesn't exist or doesn't belong to client, silently succeed (per RFC 7009)
  }
}
