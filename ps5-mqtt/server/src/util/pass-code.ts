/**
 * Build the playactor `--pass-code` argument fragment for a power command.
 *
 * playactor requires the console profile's login passcode when the profile is
 * passcode-protected; without it, standby/wake fail with `PASSCODE_IS_NEEDED`.
 * The value is either a numeric passcode or a space-separated string of key
 * names (e.g. "up up down down"), per playactor's `--pass-code` option.
 *
 * Returns an empty string when no passcode is configured. The value is
 * validated against a strict character set and single-quoted so it is safe to
 * embed in the shell command built by the turn-on/turn-off sagas.
 *
 * @throws if a non-empty passcode contains characters outside `[A-Za-z0-9 ]`.
 */
export function buildPassCodeArg(loginPasscode?: string): string {
  const value = loginPasscode?.trim()
  if (!value) {
    return ""
  }
  if (!/^[A-Za-z0-9 ]+$/.test(value)) {
    throw new Error(
      "login_passcode must be a numeric passcode or a space-separated string of key names",
    )
  }
  return ` --pass-code '${value}'`
}
