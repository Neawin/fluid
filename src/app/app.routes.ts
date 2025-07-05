import { Routes } from '@angular/router';
import { Home } from './features/home/home';

export const routes: Routes = [
  {
    component: Home,
    path: '',
  },
  {
    component: Home,
    path: '**',
  },
];
