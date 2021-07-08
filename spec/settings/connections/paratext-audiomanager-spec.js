const fs = require('fs');
const nock = require('nock');

/**
 * 2021-5-27
 *
 * These samples were obtained from the _Save and try_ manual debug facility
 * provided by Auth0's _Rules_ interface.
 *
 * Update these as they are updated at Auth0.
 */
const _agent = require('../../fixtures/agent.json');
const _context = require('../../fixtures/context.json');

/**
 * URL and endpoint as described in the fetch-profile script provided
 * (minus the subdomain config)
 */
const PARATEXT_URL = 'https://registry.paratext.org';
const PARATEXT_USERINFO_ENDPOINT = '/api8/userinfo';

// No actual validation here. Don't need a real one
const ACCESS_TOKEN = 'some-fake-access-token-abc-123';

describe('paratext-audiomanager fetch profile script', () => {

  let context, fetchProfile, scope, paratextAgentProfile;

  beforeEach(() => {

    const config = require('../../../settings/connections/paratext-audiomanager');

    // Careful! Spread only does a shallow copy. Hence the explicit accessToken reset
    context = { ..._context, accessToken: {} };

    /**
     * Closures are leveraged here so that the subject function loads the
     * `request` module
     */
    function makeFunc() {

      // Load function and strip ENV-type variable for convenience
      const funcString = config.options.scripts.fetchUserProfile.toString().replace('##PARATEXT_AUDIOMANAGER_REGISTRY_SUBDOMAIN_SUFFIX##', '');

      let func;
      eval('const request = require("request"); func = ' + funcString);
      return func;
    };

    // `fetchProfile` is now a testable function
    fetchProfile = makeFunc();
  });

  describe('successful response', () => {

    beforeEach(() => {
      /**
       * Mock the Paratext `/userinfo` endpoint
       */
      paratextAgentProfile = {
        ..._agent,
        sub: 'paratext|0123456789',
        username: 'Some Guy',
        pt_approved: 'true',
        primary_org_id: 'sil-international-lmnop-54321',
      };

      scope = nock(PARATEXT_URL, {
        reqheaders: {
          authorization: 'Bearer ' + ACCESS_TOKEN,
        },
      })
      .get(PARATEXT_USERINFO_ENDPOINT)
      .reply(200, paratextAgentProfile);
    });

    it('calls Paratext /userinfo with an access token', done => {
      fetchProfile(ACCESS_TOKEN, context, (err, profile) => {
        if (err) return done.fail(err);

        expect(scope.isDone()).toBe(true);

        done();
      });
    });

    it('sets user_id and name in the returned profile', done => {
      fetchProfile(ACCESS_TOKEN, context, (err, profile) => {
        if (err) return done.fail(err);

        expect(profile.name).toEqual(paratextAgentProfile.username);
        expect(profile.user_id).toEqual(paratextAgentProfile.sub);

        done();
      });
    });

    it('removes Paratext clutter from the returned profile', done => {
      fetchProfile(ACCESS_TOKEN, context, (err, profile) => {
        if (err) return done.fail(err);

        expect(profile.sub).toBeUndefined();
        expect(profile.pt_approved).toBeUndefined();
        expect(profile.primary_org_id).toBeUndefined();

        done();
      });
    });
  });

  describe('error response', () => {

    it('returns an error in the callback if response code does not equal 200', done => {
      scope = nock(PARATEXT_URL, {
        reqheaders: {
          authorization: 'Bearer ' + ACCESS_TOKEN,
        },
      })
      .get(PARATEXT_USERINFO_ENDPOINT)
      .reply(400, { message: 'Something went wrong. Paratext returned an error' });

      fetchProfile(ACCESS_TOKEN, context, (err, profile) => {
        if (err) {
          expect(JSON.parse(err.message).message).toEqual('Something went wrong. Paratext returned an error');
          return done();
        }

        done.fail('Should not get here');
      });
    });

    it('returns an error in the callback if response is not parseable JSON', done => {
      scope = nock(PARATEXT_URL, {
        reqheaders: {
          authorization: 'Bearer ' + ACCESS_TOKEN,
        },
      })
      .get(PARATEXT_USERINFO_ENDPOINT)
      .reply(200, 'This is definitely not JSON');

      fetchProfile(ACCESS_TOKEN, context, (err, profile) => {
        if (err) {
          expect(err.message).toEqual('Unexpected token T in JSON at position 0');
          return done();
        }

        done.fail('Should not get here');
      });
    });
  });
});
