/**
 * This rule forces accounts registered under identical emails to be _linked_
 * at Auth0. Though Auth0 provides an extension to give an authenticated agent
 * the option to link accounts, this rule supersedes that functionality.
 *
 * This may best represent what Auth0 considers best practices:
 *
 *    https://auth0.com/docs/users/user-account-linking
 *
 * This rule may also contravene Auth0-recommended best practices for searching
 * profiles:
 *
 *    https://auth0.com/docs/rules/use-management-api#access-a-newer-version-of-the-library
 *
 * From the link above:
 *
 *    > Searching for users from inside Rules may affect the performance of your
 *    logins; we advise against it
 *
 * Auth0 does not offer any immediate access to such look-up functionality. The
 * `auth0` global object only allows updates to user and app metadata, by
 * default.
 *
 *    https://auth0.com/docs/rules/use-management-api
 */
function (user, context, callback) {

  const request = require('request');

  // If manually unlinked, go no further
  if (user.user_metadata && user.user_metadata.manually_unlinked) {
    return callback(null, user, context);
  }

  // Get agents by email
  let reqOptions = Object.assign({
    url: auth0.baseUrl + '/users-by-email',
    method: 'GET',
    headers: {
      Authorization: 'Bearer ' + auth0.accessToken,
      Accept: 'application/json'
    },
    json: true,
    qs: { email: user.email }
  });

  request(reqOptions, (err, response, agents) => {
    if (err) {
      console.error('force-account-linking', 'GET /users-by-email ERROR:', err);
      return callback(null, user, context);
    }
    else if (response.statusCode < 200 || response.statusCode >= 300) {
      console.error('force-account-linking', 'GET /users-by-email non-200 response: ', response.body);
      return callback(null, user, context);
    }

    // Don't re-link accounts that have been explicitly unlinked (via Identity, for example)
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

      // Link agent accounts
      reqOptions = Object.assign({
        url: auth0.baseUrl + `/users/${primary.user_id}/identities`,
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + auth0.accessToken,
          Accept: 'application/json',
        },
        json: true,
        body: {
          user_id: p.user_id,
          provider: p.provider
        }
      });

      request(reqOptions, (err, response, agents) => {
        if (err) {
          console.error('force-account-linking', 'POST /identities ERROR:', err);
          return callback(null, user, context);
        }
        else if (response.statusCode < 200 || response.statusCode >= 300) {
          console.error('force-account-linking', 'POST /identities non-200 response: ', response.body);
          return callback(null, user, context);
        }

        link();
      });
    }
    link();
  });
}
