import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";

/**
 * Browser Better Auth client — session cookies are sent automatically.
 */
export const authClient = createAuthClient({
	plugins: [usernameClient()],
});
