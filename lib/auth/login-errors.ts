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

/** D1 분산 기록이 있으면 그 횟수가 기준이다(관리자 해제·성공 후 초기화가 반영됨). 없을 때만 로컬 횟수를 쓴다. */
export function invalidLoginFor(localFailures: number, reservation: LoginAttemptReservation) {
  return new InvalidLoginError(reservation.accountAttempts ?? localFailures);
}

export function blockedLoginFor(reservation: LoginAttemptReservation) {
  return new LoginBlockedError(reservation.blockedBy ?? "account", reservation.retryAfterSeconds);
}
