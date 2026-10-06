import { Routes } from '@angular/router';
import { PrincipiaHome } from './components/home/principia-home';
import { LandingPage } from './components/landing/landing-page';
import { LoginPage } from './components/login/login-page';
import { RegisterPage } from './components/register/register-page';
import { authGuard } from './services/auth.guard';

export const routes: Routes = [
  { path: '', component: LandingPage },
  { path: 'login', component: LoginPage },
  { path: 'registro', component: RegisterPage },
  { path: 'inicio', component: PrincipiaHome, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
