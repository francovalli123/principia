import { Routes } from '@angular/router';
import { PrincipiaHome } from './components/home/principia-home';
import { LandingPage } from './components/landing/landing-page';
import { LoginPage } from './components/login/login-page';
import { RegisterPage } from './components/register/register-page';
import { authGuard } from './services/auth.guard';
import { CreateForumPage } from './components/create-forum/create-forum';
import { ForumFeed } from './components/forum-feed/forum-feed';
export const routes: Routes = [
  { path: '', component: LandingPage },
  { path: 'login', component: LoginPage },
  { path: 'registro', component: RegisterPage },
  { path: 'inicio', component: PrincipiaHome, canActivate: [authGuard] },
  { path: 'foros/crear', component: CreateForumPage, canActivate: [authGuard] },
  { path : 'forums/:id', component: ForumFeed, canActivate: [authGuard] },
  { path: '**', redirectTo: '' }
];
