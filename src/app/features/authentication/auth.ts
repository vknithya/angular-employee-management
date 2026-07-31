import { Injectable } from '@angular/core';
import { LoginRequest } from './login-request.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {

  constructor() {}

  //login(username: string, password: string): void {
  login(request: LoginRequest): void {

    console.log('Logging in user...');

  }
}
