import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { NoteFormComponent } from './note-form';
import { NoteListComponent } from './note-list';
import { NoteItemComponent } from './note-item';

import { PipesModule } from '../../shared/pipes';
import { ApolloFormModule } from '@app/apollo-form';

export const COMPONENTS = [
  NoteFormComponent,
  NoteListComponent,
  NoteItemComponent,
];

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    PipesModule,
    ApolloFormModule,
  ],
  declarations: COMPONENTS,
  exports: COMPONENTS,
})
export class ComponentsModule {}
