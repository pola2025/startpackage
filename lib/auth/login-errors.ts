// 로그인 실패 사유를 Auth.js CredentialsSignin.code로 클라이언트에 전달한다.
// code는 리다이렉트 URL에 실리므로 계정 존재 여부 등 민감 정보는 넣지 않는다.

import { CredentialsSignin } from "next-auth";
import {
  formatBlockedLoginCode,
  formatInvalidLoginCode,
  type LoginBlockScope,
} from "./login-attempt-policy";
import type { LoginAttemptReservation } from "./login-rate-limit";

export class InvalidLoginError extends CredentialsSignin {
  constructor(attempts: number) {
    super();
    this.code = formatInvalidLoginCode(attempts);
  }
}

export class LoginBlockedError extends CredentialsSignin {
  constructor(scope: LoginBlockScope, retryAfterSeconds?: number) {
    super();
    this.code = formatBlockedLoginCode(scope, retryAfterSeconds);
  }
}

/** 분산(D1) 계정 시도 횟수와 로컬 실패 횟수 중 큰 값을 안내 기준으로 쓴다. */
export function invalidLoginFor(localFailures: number, reservation: LoginAttemptReservation) {
  return new InvalidLoginError(Math.max(localFailures, reservation.accountAttempts ?? 0));
}

export function blockedLoginFor(reservation: LoginAttemptReservation) {
  return new LoginBlockedError(reservation.blockedBy ?? "account", reservation.retryAfterSeconds);
}
