Auth0 force-account-linking Rule
================================

The subject rule is meant to work like this:

**Upon authentication, if two linkable accounts exist, they will be linked and the first account authorized by Auth0 will be made _primary_.**

This expectation is critical for at least one application currently deployed against SIL-managed Auth0 tenants. This app's own user management demands a static Auth0-provided `user_id`, which serves as their _primary key_ for database indexing purposes.

This test ensures that the `user_id` of the resulting linked account does not change. It is an _ad hoc_ test born of the need to confirm a suspected bug in a similar rule deployed on the tenant.

## Subject Code

On the tenant, this test pertains to `/settings/rules/force-account-linking.js`.

Also see `/settings/rules/dev-sillsdev-account-linking-rule.js`, which is a _lightly refactored_ version of the related account-linking rule currently deployed to `dev-sillsdev`.

## Requirements

1. A single email address with registered Gmail and Paratext accounts
2. An existing SIL web application configured to authenticate with Gmail, Paratext, and the Auth0-managed _username-password-authentication_ database connection

## Setup

1. Open the SIL web application chosen for testing and ensure you are logged out
1. On the Auth0 dashboard, delete any existing account information associated with the test email

## Steps

### 1. Authenticate with Paratext against the chosen test application

- Find the new account profile at _Auth0 > User Management > Users_
- Click the _Raw JSON_ tab and **record the `user_id`** provided in the JSON object

### 2. Logout

### 3. Authenticate against the same application, but this time sign up for an account with Auth0

- Once complete, close the web application by closing the browser tab
- You should receive an _account verification_ email

### 5. Verify the account just created via email

- It is important that you **do not** login to the app with these new credentials

### 6. Open the same web app in a new browser tab 

### 7. Authenticate with **Gmail** against the test application

As in Step 1,

- Go to _Auth0 > User Management > Users_
- **Record the `user_id`** provided in the _Raw JSON_ object

## Verify

If the `user_id` obtained in the first and last steps are the same, this test passes.


