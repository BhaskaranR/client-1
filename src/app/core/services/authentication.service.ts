import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Observable } from 'rxjs/Observable';

// import { getAccountsClient } from '../accounts/accounts-client';
import { UserFields, GetAllProviders, OauthProvider, User } from '../../graphql/types/types';
import { getAllProvidersQuery } from '../../graphql/queries/get-all-providers.query';
import { AccountsClient } from './account.service';
import { map } from 'rxjs/operators/map';

@Injectable()
export class AuthenticationService {

  private apollo: Apollo;
  private triedToResumeSession = false;

  constructor(apollo: Apollo, private accountsClient: AccountsClient) {
    this.apollo = apollo;

    Offline.on('up', () => {
      if (!this.triedToResumeSession) {
        this.triedToResumeSession = true;
        this.resumeSession();
      }
    });
  }

  private cleanCache(): void {
    // getApolloClient().resetStore();
  }

  async resumeSession(): Promise<void> {
    if (Offline.state === 'up') {
      this.cleanCache();
      this.triedToResumeSession = true;
      try {
        await this.accountsClient.loadTokensFromStorage();
        await this.accountsClient.loadOriginalTokensFromStorage();
        await this.accountsClient.resumeSession();
      } catch (e) {
        console.log('Failed to resume session, user isn\'t connected');
      }
    }
  }

  async refreshWithNewTokens(accessToken, refreshToken): Promise<Boolean> {
    try {
      this.cleanCache();
      await this.accountsClient.storeTokens({ accessToken, refreshToken });
      await this.accountsClient.loadTokensFromStorage();
      await this.accountsClient.refreshSession();
      return true;
    } catch (e) {
      console.log('Failed to refresh tokens', e);
      return false;
    }
  }

  async login(username: string, password: string): Promise<void> {
    this.cleanCache();
    await this.accountsClient.loginWithPassword({ username }, password);
    return;
  }

  async logout(): Promise<any> {
    this.cleanCache();
    return this.accountsClient.logout(null);
  }

  availableProviders(): Observable<OauthProvider[]> {
    return this.apollo.query<GetAllProviders.Query>({
      query: getAllProvidersQuery
    }).pipe(map(res => res.data.oauthProviders));
  }


  getUser() {
    return this.accountsClient.user();
  }

}
