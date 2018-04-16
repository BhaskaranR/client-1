import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule, APP_INITIALIZER } from '@angular/core';

import { SharedModule } from '@app/shared';
import { CoreModule } from '@app/core';
import { debug } from '@app/core/meta-reducers/debug.reducer';

import { AppRouting } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthenticationService } from '@app/core/services/authentication.service';
import { offlineCheck } from '@app/core/common/offline';
import { GraphQLModule } from '@app/core/graphql/apollo.module';
import { ReactiveFormsModule } from '@angular/forms';
import { NotFoundComponent } from '@app/not-found/not-found.component';
import { ErrorComponent } from '@app/error/error.component';
import { WelcomeModule } from './welcome/welcome.module';
import { HomeModule } from '@app/home/home.module';
import { SettingsModule } from '@app/settings';
import { ActionReducerMap, StoreModule, MetaReducer } from '@ngrx/store';
import { initStateFromLocalStorage } from '@app/core/meta-reducers/init-state-from-local-storage.reducer';
import { environment } from '@env/environment';
import { EffectsModule } from '@ngrx/effects';
import { reducer } from '@app/core/accounts';

import {
  StoreRouterConnectingModule,
  RouterStateSerializer,
} from '@ngrx/router-store';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';


export function initializer(auth: AuthenticationService): () => Promise<any> {
  return async () => {
     await offlineCheck();
     return await auth.resumeSession();
  };
}


export interface State {
}

export const reducers: ActionReducerMap<State> = {
  'accounts':  reducer
};

export const metaReducers: MetaReducer<any>[] = [initStateFromLocalStorage];

if (!environment.production) {
  metaReducers.unshift(debug);
}


@NgModule({
  imports: [
    // angular
    BrowserAnimationsModule,
    BrowserModule,
    ReactiveFormsModule,
    // core & shared
    CoreModule,
    SharedModule,
    // features
    GraphQLModule,
    // app
    WelcomeModule,
    HomeModule,
    SettingsModule,
    StoreModule.forRoot(
      reducers,
      { metaReducers }
    ),
    EffectsModule.forRoot([]),
    StoreRouterConnectingModule.forRoot({
      stateKey: 'router',
    }),
    StoreDevtoolsModule.instrument({
      name: 'karmasoc',
      logOnly: environment.production,
    }),
    AppRouting
  ],
  declarations: [AppComponent,
    NotFoundComponent,
    ErrorComponent,],
  providers: [
    AuthenticationService,
    {
      provide: APP_INITIALIZER,
      useFactory: initializer,
      multi: true,
      deps: [AuthenticationService]
    }
  ],
  exports: [
    ErrorComponent
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
