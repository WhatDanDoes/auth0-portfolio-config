/**
 * This rule was adapted and optimized from the `dev-sillsdev` Auth0 tenant.
 * Apart from some code clean up, error handling, and the ignoring of accounts
 * flagged as `manually_unlinked`, it is functionally identical to the original
 * rule.
 *
 * Note: the metadata merging functionality is copied verbatim and is, for the
 * moment, untested.
 *
 * This rule forces account linking as linkable accounts are discovered. Through
 * post-hoc testing, it appears as though any authenticated agent with
 * associated `app_metadata` is set as _primary_ when a secondary linkable
 * account is discovered. When there is no associated `app_metadata`, the
 * authenticated account is set to secondary and the most recently updated agent
 * profile is set as primary. Any other potentially linkable accounts are
 * ignored.
 *
 * As it stands, a _linkable_ account will be discovered the first time an
 * agent authenticates with an identical email associated with another profile.
 * That is, assuming the email is verified, this rule makes the second
 * account primary. The first account authenticated against Auth0 becomes
 * secondary. This order is not assured, of course, as authentication can
 * happen in any order between the time an email is verified and the time the
 * accounts are linked.
 *
 * Further info...
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
 * More best practices on limiting calls to the Management API:
 *
 *    https://auth0.com/docs/best-practices/performance-best-practices#limit-calls-to-the-management-api
 */
function (user, context, callback) {
  const request = require('request');

  const LOG_FLAG = 'dev-sillsdev-account-linking-rule';

  // If manually unlinked or unverified, go no further.
  // The email check was inspired by `dev-sillsdev`
  if ((user.user_metadata && user.user_metadata.manually_unlinked) || !user.email || !user.email_verified) {
    return callback(null, user, context);
  }

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

  // Get linkable accounts
  request(reqOptions, (err, response, agents) => {
    if (err) {
      console.error(LOG_FLAG, 'GET /users-by-email ERROR:', err);
      return callback(null, user, context);
    }
    else if (response.statusCode < 200 || response.statusCode >= 300) {
      console.error(LOG_FLAG, 'GET /users-by-email non-200 response: ', response.body);
      return callback(null, user, context);
    }

    // Don't re-link accounts that have been explicitly unlinked (via Identity, for example)
    let linkables = agents.filter(a => !a.user_metadata || !a.user_metadata.manually_unlinked);

    // Don't link accounts with unverified emails
    linkables = linkables.filter(a => a.email_verified);

    // Don't try to link the account to itself
    linkables = linkables.filter(a => a.user_id !== user.user_id);

    // If no one remains, there are no accounts to link
    if (!linkables.length) {
      return callback(null, user, context);
    }

    /**
     * If authenticated agent has associated `app_metadata`, this profile is set
     * as primary if _linking_ is required.
     */
    let primaryAcct = user;
    let secondaryAcct = linkables[0];
    if (!user.app_metadata) {
      console.log(LOG_FLAG, 'Merging newly created profile into the original profile');

      if (linkables.length > 1) {
        console.log(LOG_FLAG, 'Multiple agent profiles detected - using most recently modified profile as the primary profile');
        linkables.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      }
      primaryAcct = linkables[0];
      secondaryAcct = user;
    }

    // Taken as-is from `dev-sillsdev` tenant
    //
    // How badly do I want to test this?
    const _ = require('lodash');
    const mergeCustomizer = (objectValue, sourceValue) => {
      if (_.isArray(objectValue)) {
        return sourceValue.concat(objectValue);
      }
    };
    const mergedUserMetadata = _.merge({}, secondaryAcct.user_metadata, primaryAcct.user_metadata, mergeCustomizer);
    const mergedAppMetadata = _.merge({}, secondaryAcct.app_metadata, primaryAcct.app_metadata, mergeCustomizer);
    auth0.users.updateAppMetadata(primaryAcct.user_id, mergedAppMetadata)
      .then(auth0.users.updateUserMetadata(primaryAcct.user_id, mergedUserMetadata))
      .then(() => {

        // Link agent accounts
        reqOptions = Object.assign({
          url: auth0.baseUrl + `/users/${primaryAcct.user_id}/identities`,
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + auth0.accessToken,
            Accept: 'application/json',
          },
          json: true,
          body: {
            user_id: secondaryAcct.identities[0].user_id,
            provider: secondaryAcct.identities[0].provider
          }
        });

        request(reqOptions, (err, response, identities) => {
          if (err) {
            console.error(LOG_FLAG, 'POST /identities ERROR:', err);
            return callback(null, user, context);
          }
          else if (response.statusCode < 200 || response.statusCode >= 300) {
            console.error(LOG_FLAG, 'POST /identities non-200 response: ', response.body);
            return callback(null, user, context);
          }

          context.primaryUser = primaryAcct.user_id;
          // Notes from the orginal rule:
          //
          // > the new user has been linked to the original user and no longer exists, so pass original user to the
          // next rule
          callback(null, primaryAcct, context);
        });
      })
      .catch(err => callback(err));
  });
}
