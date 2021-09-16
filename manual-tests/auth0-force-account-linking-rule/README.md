Auth0 force-account-linking Rule
================================

In the simplest terms this rule is meant to work like this: Upon authentication, if two linkable accounts exist, they will be linked and the first account authorized by Auth0 will be made _primary_.

This expectation is critical for at least one application currently deployed against SIL-managed Auth0 tenants. This app's own user management demands a static Auth0-provided `user_id`, which serves as their _primary key_ for database indexing purposes.

This test ensures the primary key does not change. It is an _ad hoc_ test born of the need to confirm a suspected bug in a similar rule deployed on the `dev-sillsdev` tenant .

## Requirements

1. A single email address with registerd Gmail and Paratext accounts
2. An existing web application configured to authenticate with Gmail, Paratext, and the Auth0-managed _username-password-authentication_ database connection

## Setup

1. Open the SIL web application chosen for testing and ensure you are logged out
1. On the Auth0 dashboard, delete any existing account information associated with the test email

## Steps

1. Authenticate with Paratext against the chosen test application
  - Find the new account profile at _Auth0 > User Management > Users_
  - Click the _Raw JSON_ tab and record the `user_id` provided in the JSON object
2. Logout
3. Authenticate against the same application, but this time sign up for an account with Auth0
4. Close web application by closing the browser tab
5. You will receive an _account verification_ email. Verify the account just created (but **do not** login)
6. Open the same web application in a new browser tab 
7. Authenticate with **Gmail** against the test application

### Verify that the `user_id` obtained in the first step hasn't changed.
