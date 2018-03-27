import { isFunction, isString, has } from 'lodash';
import * as jwtDecode from 'jwt-decode';
import {
  AccountsError,
  validators,
  CreateUserType,
  PasswordLoginUserType,
  PasswordLoginUserIdentityType,
  LoginReturnType,
  UserObjectType,
  TokensType,
  PasswordType,
  ImpersonateReturnType,
} from '@accounts/common';


import {
  loggingIn,
  setUser,
  clearUser,
  setTokens,
  clearTokens as clearStoreTokens,
  setOriginalTokens,
  setImpersonated,
  clearOriginalTokens,
} from '../accounts/action';

import { hashPassword } from '../accounts/encryption';
import * as fromAccounts from '../accounts';
import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { AccountsClientConfiguration } from '../accounts/config';
import { LocalStorageService } from '../local-storage/local-storage.service';
import { Observable } from 'rxjs/Observable';
import { getOriginalTokens } from '../accounts/reducer';
import { Apollo } from 'apollo-angular';
import { GraphQLClient } from '@accounts/graphql-client';
import { userFieldsFragment } from '@app/graphql/queries/user.fragment';
import { AccountGraphQLClient } from '@app/core/services/account-graphql.service';

const isValidUserObject = (user: PasswordLoginUserIdentityType) =>
  has(user, 'username') || has(user, 'email') || has(user, 'id');

const ACCESS_TOKEN = 'accounts:accessToken';
const REFRESH_TOKEN = 'accounts:refreshToken';
const ORIGINAL_ACCESS_TOKEN = 'accounts:originalAccessToken';
const ORIGINAL_REFRESH_TOKEN = 'accounts:originalRefreshToken';

const getTokenKey = (type: string, options: AccountsClientConfiguration) =>
  isString(options.tokenStoragePrefix) && options.tokenStoragePrefix.length > 0
    ? `${options.tokenStoragePrefix}:${type}`
    : type;

@Injectable()
export class AccountsClient {
  private options: AccountsClientConfiguration;
  private transport: fromAccounts.TransportInterface;

  constructor(
    options: AccountsClientConfiguration,
    private storage: LocalStorageService,
    private store: Store<fromAccounts.AccountsState>,
    private apollo: AccountGraphQLClient
  ) {
    this.options = options;
    this.transport =   new GraphQLClient({
      graphQLClient: apollo,
      userFieldsFragment
    })
  }

  public async getStorageData(keyName: string) {
    return await Promise.resolve((resolve, reject) => {
      try {
        resolve(this.storage.getItem(keyName));
      }
      catch (ex) {
        reject(ex);
      }
    });
  }

  public async setStorageData(keyName: string, value: any) {
    return await new Promise((resolve, reject) => {
      try {
        this.storage.setItem(keyName, value);
        resolve()
      }
      catch (ex) {
        reject(ex);
      }
    })
  }

  public async removeStorageData(keyName: string) {
    return await new Promise((resolve, reject) => {
      try {
        this.storage.removeItem(keyName)
        resolve()
      }
      catch (ex) {
        reject(ex);
      }
    })
  }

  public async loadTokensFromStorage(): Promise<void> {
    const tokens = {
      accessToken:
        (await this.getStorageData(getTokenKey(ACCESS_TOKEN, this.options))) ||
        null,
      refreshToken:
        (await this.getStorageData(getTokenKey(REFRESH_TOKEN, this.options))) ||
        null,
    };
    this.store.dispatch(setTokens(tokens));
  }

  public async loadOriginalTokensFromStorage(): Promise<void> {
    const tokens = {
      accessToken:
        (await this.getStorageData(
          getTokenKey(ORIGINAL_ACCESS_TOKEN, this.options)
        )) || null,
      refreshToken:
        (await this.getStorageData(
          getTokenKey(ORIGINAL_REFRESH_TOKEN, this.options)
        )) || null,
    };
    this.store.dispatch(setOriginalTokens(tokens));
  }

  public async clearTokens(): Promise<void> {
    this.store.dispatch(clearStoreTokens());
    await this.removeStorageData(getTokenKey(ACCESS_TOKEN, this.options));
    await this.removeStorageData(getTokenKey(REFRESH_TOKEN, this.options));
  }

  public async storeTokens(tokens: TokensType): Promise<void> {
    if (tokens) {
      const newAccessToken = tokens.accessToken;
      if (newAccessToken) {
        await this.setStorageData(
          getTokenKey(ACCESS_TOKEN, this.options),
          newAccessToken
        );
      }

      const newRefreshToken = tokens.refreshToken;
      if (newRefreshToken) {
        await this.setStorageData(
          getTokenKey(REFRESH_TOKEN, this.options),
          newRefreshToken
        );
      }
    }
  }
  public async storeOriginalTokens(tokens: TokensType): Promise<void> {
    if (tokens) {
      const originalAccessToken = tokens.accessToken;
      if (originalAccessToken) {
        await this.setStorageData(
          getTokenKey(ORIGINAL_ACCESS_TOKEN, this.options),
          originalAccessToken
        );
      }

      const originalRefreshToken = tokens.refreshToken;
      if (originalRefreshToken) {
        await this.setStorageData(
          getTokenKey(ORIGINAL_REFRESH_TOKEN, this.options),
          originalRefreshToken
        );
      }
    }
  }

  public clearUser() {
    this.store.dispatch(clearUser());
  }

  public async resumeSession(): Promise<void> {
    try {
      await this.refreshSession();
      if (
        this.options.onResumedSessionHook &&
        isFunction(this.options.onResumedSessionHook)
      ) {
        this.options.onResumedSessionHook();
      }
    } catch (err) {
      throw err;
    }
  }

  public  refreshSession() {
    this.tokens().subscribe(async ({ accessToken, refreshToken }) => {
      if (accessToken && refreshToken) {
        try {
          this.store.dispatch(loggingIn(true));
          const decodedRefreshToken = jwtDecode(refreshToken);
          const currentTime = Date.now() / 1000;
          // Refresh token is expired, user must sign back in
          if (decodedRefreshToken.exp < currentTime) {
            this.clearTokens();
            this.clearUser();
          } else {
            // Request a new token pair
            const refreshedSession: LoginReturnType =  await this.transport.refreshTokens(
              accessToken,
              refreshToken
            );
            this.store.dispatch(loggingIn(false));

            this.storeTokens(refreshedSession.tokens);
            this.store.dispatch(setTokens(refreshedSession.tokens));
            this.store.dispatch(setUser(refreshedSession.user));
          }
        } catch (err) {
          this.store.dispatch(loggingIn(false));
          this.clearTokens();
          this.clearUser();
          throw new AccountsError('falsy token provided');
        }
      } else {
        this.clearTokens();
        this.clearUser();
        throw new AccountsError('no tokens provided');
      }
    });
  }

  public async createUser(
    user: CreateUserType,
    callback?: (err?: Error) => void
  ): Promise<void> {
    if (!user || user.password === undefined) {
      throw new AccountsError(
        'Unrecognized options for create user request',
        {
          username: user && user.username,
          email: user && user.email,
        },
        400
      );
    }

    // In case where password is an object we assume it was prevalidated and hashed
    if (
      !user.password ||
      (isString(user.password) &&
        !validators.validatePassword(user.password as string))
    ) {
      throw new AccountsError('Password is required');
    }

    if (
      !validators.validateUsername(user.username) &&
      !validators.validateEmail(user.email)
    ) {
      throw new AccountsError('Username or Email is required');
    }

    const hashAlgorithm = this.options.passwordHashAlgorithm;
    const password =
      user.password && hashAlgorithm
        ? hashPassword(user.password, hashAlgorithm)
        : user.password;
    const userToCreate = { ...user, password };
    try {
      const userId = await this.transport.createUser(userToCreate);
      const { onUserCreated } = this.options;
      if (callback && isFunction(callback)) {
        callback();
      }
      if (isFunction(onUserCreated)) {
        try {
          await onUserCreated({ id: userId });
        } catch (err) {
          // tslint:disable-next-line no-console
          console.error(err);
        }
      }
      await this.loginWithPassword({ id: userId }, user.password);
    } catch (err) {
      if (callback && isFunction(callback)) {
        callback(err);
      }
      throw new AccountsError(err.message);
    }
  }

  public async loginWithPassword(
    user: PasswordLoginUserType,
    password: PasswordType,
    callback?: (err?: Error, res?: LoginReturnType) => void
  ): Promise<LoginReturnType> {
    if (!password || !user) {
      throw new AccountsError(
        'Unrecognized options for login request',
        user,
        400
      );
    }
    if (
      (!isString(user) &&
        !isValidUserObject(user as PasswordLoginUserIdentityType)) ||
      !isString(password)
    ) {
      throw new AccountsError('Match failed', user, 400);
    }

    this.store.dispatch(loggingIn(true));
    try {
      const hashAlgorithm = this.options.passwordHashAlgorithm;
      const pass = hashAlgorithm
        ? hashPassword(password, hashAlgorithm)
        : password;
      const res: LoginReturnType = await this.transport.loginWithPassword(
        user,
        pass
      );

      this.store.dispatch(loggingIn(false));
      await this.storeTokens(res.tokens);
      this.store.dispatch(setTokens(res.tokens));
      this.store.dispatch(setUser(res.user));

      if (
        this.options.onSignedInHook &&
        isFunction(this.options.onSignedInHook)
      ) {
        this.options.onSignedInHook();
      }

      if (callback && isFunction(callback)) {
        callback(null, res);
      }

      return res;
    } catch (err) {
      this.store.dispatch(loggingIn(false));
      if (callback && isFunction(callback)) {
        callback(err, null);
      }
      throw new AccountsError(err.message);
    }
  }

  public user() {
    return this.store.select(fromAccounts.getUser);
  }

  public loggingIn(): Observable<boolean> {
    return this.store.select(fromAccounts.getLoggingIn);
  }

  public isLoading(): Observable<boolean> {
    return this.store.select(fromAccounts.getIsLoading);
  }


  public isImpersonated(): Observable<boolean> {
    return this.store.select(fromAccounts.getIsImpersonated);
  }

  public originalTokens(): Observable<TokensType> {
    return this.store.select(fromAccounts.getOriginalTokens);
  }

  public tokens(): Observable<TokensType> {
    return this.store.select(fromAccounts.getTokens);
  }

  public async logout(callback: (err?: Error) => void) {
    this.tokens().subscribe(({ accessToken }) => {
      try {
        if (accessToken) {
          this.transport.logout(accessToken);
        }
        this.clearTokens();
        this.store.dispatch(clearUser());
        if (callback && isFunction(callback)) {
          callback();
        }
        if (this.options.onSignedOutHook) {
          this.options.onSignedOutHook();
        }
      } catch (err) {
        this.clearTokens();
        this.store.dispatch(clearUser());
        if (callback && isFunction(callback)) {
          callback(err);
        }
        throw new AccountsError(err.message);
      }
    });
  }

  public async verifyEmail(token: string): Promise<void> {
    try {
      await this.transport.verifyEmail(token);
    } catch (err) {
      throw new AccountsError(err.message);
    }
  }

  public async resetPassword(
    token: string,
    newPassword: string
  ): Promise<void> {
    if (!validators.validatePassword(newPassword)) {
      throw new AccountsError('Password is invalid!');
    }

    const hashAlgorithm = this.options.passwordHashAlgorithm;
    const password = hashAlgorithm
      ? hashPassword(newPassword, hashAlgorithm)
      : newPassword;

    try {
      await this.transport.resetPassword(token, password);
    } catch (err) {
      throw new AccountsError(err.message);
    }
  }

  public async requestPasswordReset(email: string): Promise<void> {
    if (!validators.validateEmail(email)) {
      throw new AccountsError('Valid email must be provided');
    }
    try {
      await this.transport.sendResetPasswordEmail(email);
    } catch (err) {
      throw new AccountsError(err.message);
    }
  }

  public async requestVerificationEmail(email: string): Promise<void> {
    if (!validators.validateEmail(email)) {
      throw new AccountsError('Valid email must be provided');
    }
    try {
      await this.transport.sendVerificationEmail(email);
    } catch (err) {
      throw new AccountsError(err.message);
    }
  }
}
