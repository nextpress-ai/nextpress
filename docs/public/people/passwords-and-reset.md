---
title: Passwords and reset
description: Change your own password, reset a locked-out account from the server, and what each reset message means.
order: 3
type: Guide
---

# Passwords and reset

You can change your own password in the admin. NextPress sends no email, so there is no "forgot password" link. If someone cannot sign in, a person with access to the server sets a new password from the command line.

## Change your password

1. Open **Your account** in the sidebar, under **System**.
2. Press **Change password**.
3. Fill in **Current password**, **New password** and **Confirm new password**. The new password needs at least 8 characters.
4. Press **Change password**.

Your other devices are signed out.

## Reset a locked-out account on a server

Only someone who can sign in to the server can do this. Keep server access to people you trust.

1. Sign in to the server.
2. Run the command with the account's email or username:

   ```bash
   nextpress reset-password ada@example.com
   ```

3. At **New password**, type the new password. Nothing shows as you type.
4. At **Type it again**, type it once more.

On success the command prints:

```text
Password changed for ada@example.com. They were signed out everywhere; sign in with the new password.
```

The person is signed out on every device. Your sites stay online. If NextPress is installed outside `/opt/nextpress`, add `--install-dir` with the folder, as with other commands.

## Reset from a script

Pipe the password in with `--password-stdin`, so it never appears in the command line or the shell history:

```bash
printf '%s\n' "$NEW_PASSWORD" | nextpress reset-password ada@example.com --password-stdin
```

Keep the script and the variable private.

## Reset on your own computer

1. Stop the development server. The local database can be used by one program at a time.
2. In the project folder, run:

   ```bash
   pnpm reset-password ada@example.com
   ```

3. Type the new password twice.

## Reset messages

| Message | What to do |
|---|---|
| No account uses "…". Check the email or username and try again. | Check the spelling. Case does not matter |
| The two passwords don't match. Nothing was changed. | Run the command again and type the same password twice |
| Use at least 8 characters. Nothing was changed. | Choose a longer password |
| This NextPress version can't reset passwords yet. Run: nextpress upgrade | Upgrade, then try again |
| NextPress is not running. Start it first: nextpress restart | Run `nextpress restart`, then try again |
| Refusing to ask for a password without an interactive terminal. Pipe it in with --password-stdin. | Run it in a terminal, or use `--password-stdin` |
| The new password could not be confirmed. Run the command again. | Run the command again |

## Next steps

- [Roles](/docs/people/roles).
- [The nextpress command](/docs/self-hosting/nextpress-command).
- [Troubleshooting](/docs/self-hosting/troubleshooting).
