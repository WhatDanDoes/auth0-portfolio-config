/**
 * This rule forces accounts registered under identical emails to be _linked_
 * at Auth0. Though Auth0 provides an extension to give an authenticated agent
 * the option to link accounts, this rule supersedes that functionality. Nowhere
 * is this recommended by Auth0:
 *
 * https://auth0.com/docs/users/user-account-linking
 *
 * This rule also contravenes Auth0-recommended best practices for searching
 * profiles:
 *
 * https://auth0.com/docs/rules/use-management-api#access-a-newer-version-of-the-library
 *
 * From the link above:
 *
 * _Searching for users from inside Rules may affect the performance of your
 * logins; we advise against it_
 */
function (user, context, callback) {

  // If manually unlinked, go no further
  if (user.user_metadata && user.user_metadata.manually_unlinked) {
    return callback(null, user, context);
  }

  auth0.users.getUsersByEmail(user.email, (err, agents) => {
    if (err) {
      return callback(err);
    }

    // Don't re-link accounts that have been explicitly unlinked (via Identity)
    const linkables = agents.filter(a => !a.user_metadata || !a.user_metadata.manually_unlinked);

    // If only one agent remains, there are no accounts to link
    if (agents.length < 2) {
      return callback(null, user, context);
    }

    // Sort by `created_at`. First account created becomes the primary account
    linkables.sort((a, b) => a.created_at < b.created_at ? -1 : 1);
    const primary = linkables.shift();

    // Prepare remaining accounts for linking
    const params = linkables.map(l => {
      const i = l.user_id.indexOf('|');
      const provider = l.user_id.slice(0, i);
      const user_id = l.user_id.slice(i + 1);
      return { user_id: user_id, provider: provider };
    });

    // Recurse over the list of account-linking params
    function link() {
      if (!params.length) {
        return callback(null, user, context);
      }

      const p = params.shift();
      auth0.users.linkUsers(primary.user_id, { user_id: p.user_id, provider: p.provider }, (err, agent) => {
        if (err) {
          return callback(err);
        }
        link();
      });
    }
    link();
  });
}
