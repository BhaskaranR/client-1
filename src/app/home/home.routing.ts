import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SettingsComponent } from '@app/settings';
import { HomeComponent } from '@app/home/home.component';
import { AboutComponent } from '@app/static';
import { NotFoundComponent } from '../not-found/not-found.component';
import { AuthGuardService } from '@app/core/services/auth-guard.service';
import { CanActivateComponentSidenav } from '@app/home/component-sidenav/component-sidenav-can-load-guard';
import { ComponentSidenav } from '@app/home/component-sidenav/component-sidenav';
import { ComponentCategoryList } from '@app/home/component-category-list/component-category-list';
import { ComponentList } from '@app/home/component-list';
import { PostsHome } from '@app/home/pages/posts-home/posts-home';
import { FeaturePostsComponent } from '@app/home/pages/feature-posts/feature-posts.component';

const routes: Routes = [
    {
        path: '',
        component: HomeComponent, canActivate: [AuthGuardService], canActivateChild: [AuthGuardService],
        children: [
            {
                path: 'preferences',
                component: SettingsComponent,
                data: {
                    title: 'Settings'
                }
            },
            { path: '', redirectTo: '/social/posts', pathMatch: 'full' },
            {
                path: 'social',
                component: ComponentSidenav,
                children: [
                    { path: '', redirectTo: 'posts', pathMatch: 'full' },
                    {
                        path: 'feeds',
                        children: [

                            { path: '', component: ComponentCategoryList },
                            { path: ':id', component: ComponentList }
                        ]
                    },
                    {
                        path: 'posts',
                        component: PostsHome,
                        children: [
                            { path: '', redirectTo: 'featured', pathMatch: 'full' },
                            {
                                path: 'featured',
                                loadChildren: './pages/feature-posts/feature-posts.module#FeaturePostsModule',

                            },
                            {
                                path: 'photos',
                                loadChildren: './pages/photo-posts/photo-posts.module#PhotoPostsModule',
                                data: {
                                    page: 'Gallery',
                                    animation: 'profile'
                                }
                            }
                            // {
                            //     path: 'videos',
                            //     loadChildren: './pages/video-feeds/video-feeds.module#VideosFeedsModule',
                            //     data: {
                            //         animation: 'profile'
                            //     }
                            // }
                        ],
                    },
                    {
                        path: 'people',
                        loadChildren: './pages/people-home/people-home.module#PeopleHomeModule'
                    }
                ]
            },
            {
                path: 'business',
                component: ComponentSidenav,
                children: [
                    { path: '', redirectTo: 'featured', pathMatch: 'full' },
                    {
                        path: 'featured',
                        loadChildren: './pages/business-home/business-home.module#BusinessHomeModule'

                    }
                ]
            },
            {
                path: 'profile',
                loadChildren: './pages/profile-home/profile-home.module#ProfileHomeModule'
            }
        ]
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class RoutingModule { }
