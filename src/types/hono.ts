import type { AdminUser } from "./auth";

export interface AppEnv {
  Variables: {
    user: AdminUser;
  };
}
