import "@testing-library/jest-dom";
import { afterEach } from "vitest";
import { resetPinAttempts } from "../src/auth/login-throttle";

afterEach(() => {
  resetPinAttempts();
});
