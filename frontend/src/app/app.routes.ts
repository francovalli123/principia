import { Routes } from '@angular/router';
import { PrincipiaHome } from './components/home/principia-home';
import { LandingPage } from './components/landing/landing-page';
import { LoginPage } from './components/login/login-page';
import { RegisterPage } from './components/register/register-page';
import { authGuard } from './services/auth.guard';
import { CreateForumPage } from './components/create-forum/create-forum';
import { ForumFeed } from './components/forum-feed/forum-feed';
import { SimulationForm } from './components/simulation-form/simulation-form';
import { CreatePublicationPage } from './components/create-publication/create-publication';
import { SelectSimulationPage } from './components/select-simulation/select-simulation';
import { PublishSimulationPage } from './components/publish-simulation/publish-simulation';
export const routes: Routes = [
  { path: '', component: LandingPage },
  { path: 'login', component: LoginPage },
  { path: 'registro', component: RegisterPage },
  { path: 'inicio', component: PrincipiaHome, canActivate: [authGuard] },
  { path: 'foros/crear', component: CreateForumPage, canActivate: [authGuard] },
  { path: 'simulaciones/crear', component: SimulationForm, canActivate: [authGuard] },
  { path: 'forums/:forumId/publications/crear/seleccionar', component: SelectSimulationPage, canActivate: [authGuard] },
  { path: 'forums/:forumId/publications/crear/:simulationId', component: PublishSimulationPage, canActivate: [authGuard] },
  { path: 'forums/:forumId/publications/crear', component: CreatePublicationPage, canActivate: [authGuard] },
  { path : 'forums/:id', component: ForumFeed, canActivate: [authGuard] },
  { path: '**', redirectTo: '' }
];
