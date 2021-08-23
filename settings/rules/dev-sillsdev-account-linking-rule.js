/**
 * This rule was adapted and optimized from the `dev-sillsdev` Auth0 tenant.
 * Apart from some code clean up, error handling, and the ignoring of accounts
 * flagged as `manually_unlinked`, it is functionally identical to the original
 * rule.
 *
 * _Note:_ the metadata merging functionality is copied verbatim and is, for the
 * moment, untested.
 *
 * In the simplest terms this rule is meant to work like this:
 *
 * Upon authentication, if two linkable accounts exist, they will be linked
 * and the first account authorized by Auth0 will be made _primary_.
 *
 * This functionality depends on two assumptions if it is to behave as expected:
 *
 * 1. Accounts are always linked as they are discovered (i.e., there can only
 *    ever be two linkable accounts before linking takes place)
 * 2. Authentication takes place immediately after email verification (as with
 *    Auth0-managed signup accounts)
 *
 * Potential problems are introduced if either of these assumptions are
 * incorrect.
 *
 * ## Concerning email verification and authentication
 *
 * Consider the following sequence of events:
 *
 * 1. A social account (e.g. Paratext) authenticates one or more times
 * 2. A new Auth0 signup account is created, successfully verified, but not
 *    authenticated after verification
 * 3. A new linkable Gmail account authenticates
 * 4. Gmail merges with the Auth0 account. Auth0 (not the oldest Paratext
 *    account) is made primary because it is the most recently updated
 *
 * This is not a peculiar or unlikely edge case and can be verified through
 * manual testing.
 *
 * This existing behaviour may not be an issue for every application
 * configured against the `dev-sillsdev` tenant. However, if an app depends
 * on a static primary `user_id` (e.g. for database indexing purposes)
 * this cannot be guaranteed, as the primary ID could change.
 *
 * ## Concerning the existence of >2 linkable accounts
 *
 * If more than two linkable accounts exist, only the most recently updated
 * will be linked (and made primary). The skipped accounts are merged on
 * subsequent logins. Depending on the order of subsequent authentications,
 * this potentially changes which account is primary.
 *
 * Unlike the email verification issue, this only presents problems if the first
 * assumption named above is incorrect. If accounts are merged as they are
 * discovered, then there will only ever be two linkable accounts before the
 * linking operation is performed.
 *
 * Even if executed under _ideal_ circumstances, one important question
 * requires manual testing and remains unanswered (as of 2021-8-23):
 *
 * _Does Auth0 create a profile for unverified third-party IdP authentication
 * attempts?_
 *
 * This rule does not make the oldest account primary. It makes the most
 * recently updated account primary.
 *
 * For Auth0 signup accounts, I have already verified that the all-critical
 * `updated_at` profile property is updated on every login attempt and upon
 * email verification itself. If this is also true for unverified third-party
 * IdPs, then a linked profile's `primary_id` cannot be assumed to remain
 * static.
 *
 * ## To summarize
 *
 * This rule basically works as follows...
 *
 * The existence of the `app_metadata` property on an Auth0 profile flags if
 * an account has already been authenticated and linked. Any login with a
 * previously _unknown_ account will not have any `app_metadata` and, as such,
 * will be linked as a _secondary_ account to the existing merged profiles.
 * The most recently updated account becomes the primary account.
 *
 * This is a problem for at least three reasons:
 *
 * 1. _Expected behaviour_, as understood when authenticating against the
 * `dev-sillsdev` tenant, has led to the false impression that the _oldest_
 * account always becomes primary. This depends on circumstance and is not
 * necessarily true.
 *
 * 2. If this rule were ever disabled (or activated after the fact), the
 * resulting behaviour will be quite unexpected if any new _unlinked_
 * accounts were discovered in the downtime, because any one of those accounts
 * may be made primary upon rule re-activation.
 *
 * 3. Even assuming this rule is active upon first deployment and never
 * disabled, there is the potential for the primary account to lose its
 * status for the reasons outlined above.
 *
 * ## Further info...
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
 *
 * ## To be continued...
 *
 * I will post the reproducible results of my manual testing as new details
 * are discovered.
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
