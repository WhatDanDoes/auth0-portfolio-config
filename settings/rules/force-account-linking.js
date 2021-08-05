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
  return callback(null, user, context);
}
