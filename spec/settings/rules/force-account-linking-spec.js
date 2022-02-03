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

describe('force-account-linking', () => {

  let rule, agent, context, auth0;

  let findUsersByEmailScope, linkAccountsScope;

  beforeEach(done => {
    agent = { ..._agent, email_verified: true };
    context = { ..._context, accessToken: {} };

    fs.readFile('./settings/rules/force-account-linking.js', 'utf8', (err, data) => {
      if (err) return done.fail(err);

      function makeFunc() {

        let configuration = {};
        auth0 = {
          users: {
          },
          accessToken: 'abc-123',
          baseUrl: 'https://dev-mo6xixxu.auth0.com',
        };

        let func;
        eval('func = ' + data);
        return func;
      };

      rule = makeFunc();

      done();
    });
  });

  describe('no linkable accounts', () => {

    beforeEach(() => {

      nock.cleanAll();

      findUsersByEmailScope = nock(auth0.baseUrl, {
        reqheaders: {
          authorization: 'Bearer ' + auth0.accessToken,
        },
      })
      .get(`/users-by-email?email=${encodeURIComponent(agent.email)}`)
      .reply(200, [{...agent}]);

      linkAccountsScope = nock(auth0.baseUrl, {
        reqheaders: {
          authorization: 'Bearer ' + auth0.accessToken,
        },
      })
      .post(`/api/v2/users/${agent.user_id}/identities`, {
        provider: '',
        user_id: '',
      })
      .reply(200, []);
    });

    it('calls find users-by-email endpoint', done => {
      rule(agent, context, (err, agnt, cntxt) => {
        if (err) return done.fail(err);

        expect(findUsersByEmailScope.isDone()).toBe(true);
        done();
      });
    });

    it('does not call the link accounts endpoint', done => {
      rule(agent, context, (err, agnt, cntxt) => {
        if (err) return done.fail(err);

        expect(linkAccountsScope.isDone()).toBe(false);
        done();
      });
    });

    it('returns the correct profile and context', done => {
      rule(agent, context, (err, agnt, cntxt) => {
        if (err) return done.fail(err);

        expect(agnt).toEqual(agent);
        expect(cntxt).toEqual(context);
        done();
      });
    });

    describe('accounts are already linked', () => {

      beforeEach(() => {
        nock.cleanAll();

        findUsersByEmailScope = nock(auth0.baseUrl, {
          reqheaders: {
            authorization: 'Bearer ' + auth0.accessToken,
          },
        })
        .get(`/users-by-email?email=${encodeURIComponent(agent.email)}`)
        .reply(200, [{
          ...agent, identities: [agent.identities[0], {
          "profileData": {
            "email": agent.email,
            "email_verified": true,
            "name": "Some Guy",
            "given_name": "Some",
            "family_name": "Guy",
            "picture": "https://lh3.googleusercontent.com/a-/.jpg",
            "gender": "male",
            "locale": "en"
          },
          "user_id": "113710000000000000000",
          "provider": "google-oauth2",
          "connection": "google-oauth2",
          "isSocial": true
          }]
        }]);

        linkAccountsScope = nock(auth0.baseUrl, {
          reqheaders: {
            authorization: 'Bearer ' + auth0.accessToken,
          },
        })
        .post(`/api/v2/users/${agent.user_id}/identities`, {
          provider: '',
          user_id: '',
        })
        .reply(200, []);
      });

      it('calls find users-by-email endpoint', done => {
        rule(agent, context, (err, agnt, cntxt) => {
          if (err) return done.fail(err);

          expect(findUsersByEmailScope.isDone()).toBe(true);
          done();
        });
      });

      it('does not call the link accounts endpoint', done => {
        rule(agent, context, (err, agnt, cntxt) => {
          if (err) return done.fail(err);

          expect(linkAccountsScope.isDone()).toBe(false);
          done();
        });
      });

      it('returns the correct profile and context', done => {
        rule(agent, context, (err, agnt, cntxt) => {
          if (err) return done.fail(err);

          expect(agnt).toEqual(agent);
          expect(cntxt).toEqual(context);
          done();
        });
      });
    });

    describe('authenticated account is manually_unlinked', () => {

      let identity1, identity2;
      beforeEach(() => {
        identity1 = {
          "user_id": "113710000000000000000",
          "provider": "google-oauth2",
          "connection": "google-oauth2",
          "isSocial": true
        };
        identity2 = {
          "user_id": "paratext-audiomanager|WfCxeyQQi00000000",
          "provider": "oauth2",
          "connection": "paratext-audiomanager",
          "isSocial": true
        };

        findUsersByEmailScope = nock(auth0.baseUrl, {
          reqheaders: {
            authorization: 'Bearer ' + auth0.accessToken,
          },
        })
        .get(`/users-by-email?email=${encodeURIComponent(agent.email)}`)
        .reply(200, [
          {...agent, created_at: new Date().toISOString(), user_metadata: { manually_unlinked: true }},
          {...agent, created_at: new Date(1978, 8, 8).toISOString(), name: 'Some Guy', identities: [identity1] },
          {...agent, created_at: new Date(2009, 7, 24).toISOString(), name: 'Same Goy', identities: [identity2] }
        ]);

        linkAccountsScope = nock(auth0.baseUrl, {
          reqheaders: {
            authorization: 'Bearer ' + auth0.accessToken,
          },
        })
        .post(`/api/v2/users/${agent.user_id}/identities`, {
          provider: '',
          user_id: '',
        })
        .reply(200, { junk: 'does not matter for these purposes' });
      });

      it('does not call find users-by-email endpoint', done => {
        rule({...agent, user_metadata: { manually_unlinked: true }}, context, (err, agnt, cntxt) => {
          if (err) return done.fail(err);
          expect(findUsersByEmailScope.isDone()).toBe(false);
          done();
        });
      });

      it('does not call the link accounts endpoint', done => {
        rule({...agent, user_metadata: { manually_unlinked: true }}, context, (err, agnt, cntxt) => {
          if (err) return done.fail(err);
          expect(linkAccountsScope.isDone()).toBe(false);
          done();
        });
      });

      it('returns the correct profile and context', done => {
        rule({...agent, user_metadata: { manually_unlinked: true }}, context, (err, agnt, cntxt) => {
          if (err) return done.fail(err);

          expect(agnt.user_id).toEqual(agent.user_id);
          expect(cntxt).toEqual(context);
          done();
        });
      });
    });
  });

  describe('currently authenticated account not verified', () => {

    let identity;
    beforeEach(() => {

      nock.cleanAll();

      identity = {
        "user_id": "113710000000000000000",
        "provider": "google-oauth2",
        "connection": "google-oauth2",
        "isSocial": true
      };

      findUsersByEmailScope = nock(auth0.baseUrl, {
        reqheaders: {
          authorization: 'Bearer ' + auth0.accessToken,
        },
      })
      .get(`/users-by-email?email=${encodeURIComponent(agent.email)}`)
      .reply(200, [
        {...agent, created_at: new Date().toISOString(), email_verified: false },
        {...agent, user_id: `${identity.provider}|${identity.user_id}`, created_at: new Date(1978, 8, 8).toISOString(),
          name: 'Some Guy', identities: [identity] }
      ]);

      linkAccountsScope = nock(auth0.baseUrl, {
        reqheaders: {
          authorization: 'Bearer ' + auth0.accessToken,
          accept: 'application/json',
        }
      })
      .post('/users/' + encodeURIComponent(`${identity.provider}|${identity.user_id}`) + '/identities', JSON.stringify({
        user_id: identity.user_id,
        provider: identity.provider,
      }))
      .reply(200, {...agent});
    });

    it('does not call find users-by-email endpoint', done => {
      rule({...agent, email_verified: false }, context, (err, agnt, cntxt) => {
        if (err) return done.fail(err);
        expect(findUsersByEmailScope.isDone()).toBe(false);
        done();
      });
    });

    it('does not call the link accounts endpoint with the oldest account set as primary', done => {
      rule({...agent, email_verified: false }, context, (err, agnt, cntxt) => {
        if (err) return done.fail(err);
        expect(linkAccountsScope.isDone()).toBe(false);
        done();
      });
    });

    it('returns the correct profile and context', done => {
      rule({...agent, email_verified: false }, context, (err, agnt, cntxt) => {
        if (err) return done.fail(err);

        expect(agnt.user_id).toEqual(agent.user_id);
        expect(cntxt).toEqual(context);
        done();
      });
    });
  });

  describe('oldest linkable account not verified', () => {

    let identity;
    beforeEach(() => {

      nock.cleanAll();

      identity = {
        "user_id": "113710000000000000000",
        "provider": "google-oauth2",
        "connection": "google-oauth2",
        "isSocial": true
      };

      findUsersByEmailScope = nock(auth0.baseUrl, {
        reqheaders: {
          authorization: 'Bearer ' + auth0.accessToken,
        },
      })
      .get(`/users-by-email?email=${encodeURIComponent(agent.email)}`)
      .reply(200, [
        {...agent, created_at: new Date().toISOString() },
        {...agent, user_id: `${identity.provider}|${identity.user_id}`, created_at: new Date(1978, 8, 8).toISOString(),
          name: 'Some Guy', identities: [identity], email_verified: false }
      ]);

      linkAccountsScope = nock(auth0.baseUrl, {
        reqheaders: {
          authorization: 'Bearer ' + auth0.accessToken,
          accept: 'application/json',
        }
      })
      .post('/users/' + encodeURIComponent(`${identity.provider}|${identity.user_id}`) + '/identities', JSON.stringify({
        user_id: agent.user_id,
        provider: agent.identities[0].provider,
      }))
      .reply(200, {...agent});
    });

    it('calls find users-by-email endpoint', done => {
      rule(agent, context, (err, agnt, cntxt) => {
        if (err) return done.fail(err);
        expect(findUsersByEmailScope.isDone()).toBe(true);
        done();
      });
    });

    it('does not call the link accounts endpoint with oldest account set as primary', done => {
      rule(agent, context, (err, agnt, cntxt) => {
        if (err) return done.fail(err);
        expect(linkAccountsScope.isDone()).toBe(false);
        done();
      });
    });

    it('returns the correct profile and context', done => {
      rule(agent, context, (err, agnt, cntxt) => {
        if (err) return done.fail(err);

        expect(agnt.user_id).toEqual(agent.user_id);
        expect(cntxt).toEqual(context);
        done();
      });
    });
  });

  describe('one linkable account', () => {

    let identity;
    beforeEach(() => {

      nock.cleanAll();

      identity = {
        "user_id": "113710000000000000000",
        "provider": "google-oauth2",
        "connection": "google-oauth2",
        "isSocial": true
      };

      findUsersByEmailScope = nock(auth0.baseUrl, {
        reqheaders: {
          authorization: 'Bearer ' + auth0.accessToken,
        },
      })
      .get(`/users-by-email?email=${encodeURIComponent(agent.email)}`)
      .reply(200, [
        {...agent, created_at: new Date().toISOString() },
        {...agent, user_id: `${identity.provider}|${identity.user_id}`, created_at: new Date(1978, 8, 8).toISOString(), name: 'Some Guy', identities: [identity] }
      ]);

      linkAccountsScope = nock(auth0.baseUrl, {
        reqheaders: {
          authorization: 'Bearer ' + auth0.accessToken,
          accept: 'application/json',
        }
      })
      .post('/users/' + encodeURIComponent(`${identity.provider}|${identity.user_id}`) + '/identities', JSON.stringify({
        user_id: agent.identities[0].user_id,
        provider: agent.identities[0].provider,
      }))
      .reply(200, {...agent});
    });

    it('calls find users-by-email endpoint', done => {
      rule(agent, context, (err, agnt, cntxt) => {
        if (err) return done.fail(err);
        expect(findUsersByEmailScope.isDone()).toBe(true);
        done();
      });
    });

    it('calls the link accounts endpoint with the oldest account set as primary', done => {
      rule(agent, context, (err, agnt, cntxt) => {
        if (err) return done.fail(err);
        expect(linkAccountsScope.isDone()).toBe(true);
        done();
      });
    });

    it('returns the correct profile and context', done => {
      rule(agent, context, (err, agnt, cntxt) => {
        if (err) return done.fail(err);

        expect(agnt.user_id).toEqual(`${identity.provider}|${identity.user_id}`);
        expect(cntxt.primaryUser).toEqual(`${identity.provider}|${identity.user_id}`);
        done();
      });
    });
  });

  describe('several linkable accounts', () => {

    let linkAccountScope1, linkAccountScope2;
    let identity1, identity2;
    beforeEach(() => {
      identity1 = {
        "user_id": "113710000000000000000",
        "provider": "google-oauth2",
        "connection": "google-oauth2",
        "isSocial": true
      };
      identity2 = {
        "user_id": "paratext-audiomanager|WfCxeyQQi00000000",
        "provider": "oauth2",
        "connection": "paratext-audiomanager",
        "isSocial": true
      };

      findUsersByEmailScope = nock(auth0.baseUrl, {
        reqheaders: {
          authorization: 'Bearer ' + auth0.accessToken,
        },
      })
      .get(`/users-by-email?email=${encodeURIComponent(agent.email)}`)
      .reply(200, [
        {...agent, created_at: new Date().toISOString()},
        {...agent, created_at: new Date(1978, 8, 8).toISOString(), user_id: `${identity1.provider}|${identity1.user_id}`, name: 'Some Guy', identities: [identity1] },
        {...agent, created_at: new Date(2009, 7, 24).toISOString(), user_id: `${identity2.provider}|${identity2.user_id}`, name: 'Same Goy', identities: [identity2] }
      ]);

      linkAccountScope1 = nock(auth0.baseUrl, {
        reqheaders: {
          authorization: 'Bearer ' + auth0.accessToken,
        },
      })
      .post('/users/' + encodeURIComponent(`${identity1.provider}|${identity1.user_id}`) + '/identities', JSON.stringify({
        user_id: agent.identities[0].user_id,
        provider: agent.identities[0].provider,
      }))
      .reply(200, { junk: 'does not matter for these purposes' });

      linkAccountScope2 = nock(auth0.baseUrl, {
        reqheaders: {
          authorization: 'Bearer ' + auth0.accessToken,
        },
      })
      .post('/users/' + encodeURIComponent(`${identity1.provider}|${identity1.user_id}`) + '/identities', JSON.stringify({
        user_id: identity2.user_id,
        provider: identity2.provider,
      }))
      .reply(200, { junk: 'does not matter for these purposes' });
    });

    it('calls find users-by-email endpoint', done => {
      rule(agent, context, (err, agnt, cntxt) => {
        if (err) return done.fail(err);
        expect(findUsersByEmailScope.isDone()).toBe(true);
        done();
      });
    });

    it('calls the link accounts endpoint for each of the linkable accounts', done => {
      rule(agent, context, (err, agnt, cntxt) => {
        if (err) return done.fail(err);
        expect(linkAccountScope1.isDone()).toBe(true);
        expect(linkAccountScope2.isDone()).toBe(true);
        done();
      });
    });

    it('returns the correct profile and context', done => {
      rule(agent, context, (err, agnt, cntxt) => {
        if (err) return done.fail(err);

        expect(agnt.user_id).toEqual(`${identity1.provider}|${identity1.user_id}`);
        expect(cntxt.primaryUser).toEqual(`${identity1.provider}|${identity1.user_id}`);
        done();
      });
    });

    describe('new account access with oldest account manually_unlinked', () => {

      let identity1, identity2;
      beforeEach(() => {
        nock.cleanAll();

        identity1 = {
          "user_id": "113710000000000000000",
          "provider": "google-oauth2",
          "connection": "google-oauth2",
          "isSocial": true
        };
        identity2 = {
          "user_id": "paratext-audiomanager|WfCxeyQQi00000000",
          "provider": "oauth2",
          "connection": "paratext-audiomanager",
          "isSocial": true
        };

        findUsersByEmailScope = nock(auth0.baseUrl, {
          reqheaders: {
            authorization: 'Bearer ' + auth0.accessToken,
          },
        })
        .get(`/users-by-email?email=${encodeURIComponent(agent.email)}`)
        .reply(200, [
            {...agent, created_at: new Date().toISOString() },
            {...agent, created_at: new Date(1978, 8, 8).toISOString(), user_id: `${identity1.provider}|${identity1.user_id}`, name: 'Some Guy', identities: [identity1],
              user_metadata: { manually_unlinked: true } },
            {...agent, created_at: new Date(2009, 7, 24).toISOString(), user_id: `${identity2.provider}|${identity2.user_id}`, name: 'Same Goy', identities: [identity2] }
        ]);

        linkAccountsScope = nock(auth0.baseUrl, {
          reqheaders: {
            authorization: 'Bearer ' + auth0.accessToken,
          },
        })
        .post('/users/' + encodeURIComponent(`${identity2.provider}|${identity2.user_id}`) + '/identities', JSON.stringify({
          user_id: agent.identities[0].user_id,
          provider: agent.identities[0].provider,
        }))
        .reply(200, {...agent});
      });

      it('calls find users-by-email endpoint', done => {
        rule(agent, context, (err, agnt, cntxt) => {
          if (err) return done.fail(err);
          expect(findUsersByEmailScope.isDone()).toBe(true);
          done();
        });
      });

      it('calls the link-accounts endpoint and sets the second oldest account as primary', done => {
        rule(agent, context, (err, agnt, cntxt) => {
          if (err) return done.fail(err);

          expect(linkAccountsScope.isDone()).toBe(true);
          done();
        });
      });

      it('returns the correct profile and context', done => {
        rule(agent, context, (err, agnt, cntxt) => {
          if (err) return done.fail(err);

          expect(agnt.user_id).toEqual(`${identity2.provider}|${identity2.user_id}`);
          expect(cntxt.primaryUser).toEqual(`${identity2.provider}|${identity2.user_id}`);
          done();
        });
      });
    });

    describe('with manually_unlinked secondary account', () => {

      let identity1, identity2;
      beforeEach(() => {
        nock.cleanAll();

        identity1 = {
          "user_id": "113710000000000000000",
          "provider": "google-oauth2",
          "connection": "google-oauth2",
          "isSocial": true
        };
        identity2 = {
          "user_id": "paratext-audiomanager|WfCxeyQQi00000000",
          "provider": "oauth2",
          "connection": "paratext-audiomanager",
          "isSocial": true
        };

        findUsersByEmailScope = nock(auth0.baseUrl, {
          reqheaders: {
            authorization: 'Bearer ' + auth0.accessToken,
          },
        })
        .get(`/users-by-email?email=${encodeURIComponent(agent.email)}`)
        .reply(200, [
            {...agent, created_at: new Date().toISOString()},
            {...agent, created_at: new Date(1978, 8, 8).toISOString(), user_id: `${identity1.provider}|${identity1.user_id}`, name: 'Some Guy', identities: [identity1] },
            {...agent, created_at: new Date(2009, 7, 24).toISOString(), user_id: `${identity2.provider}|${identity2.user_id}`, name: 'Same Goy', identities: [identity2],
              user_metadata: { manually_unlinked: true }
            }
        ]);

        linkAccountsScope = nock(auth0.baseUrl, {
          reqheaders: {
            authorization: 'Bearer ' + auth0.accessToken,
          },
        })
        .post('/users/' + encodeURIComponent(`${identity1.provider}|${identity1.user_id}`) + '/identities', JSON.stringify({
          user_id: agent.identities[0].user_id,
          provider: agent.identities[0].provider,
        }))
        .reply(200, {...agent});
      });

      it('calls find users-by-email endpoint', done => {
        rule(agent, context, (err, agnt, cntxt) => {
          if (err) return done.fail(err);
          expect(findUsersByEmailScope.isDone()).toBe(true);
          done();
        });
      });

      it('does not call the link-accounts endpoint for the manually_unlinked account', done => {
        rule(agent, context, (err, agnt, cntxt) => {
          if (err) return done.fail(err);
          expect(linkAccountsScope.isDone()).toBe(true);
          done();
        });
      });

      it('returns the correct profile and context', done => {
        rule(agent, context, (err, agnt, cntxt) => {
          if (err) return done.fail(err);

          expect(agnt.user_id).toEqual(`${identity1.provider}|${identity1.user_id}`);
          expect(cntxt.primaryUser).toEqual(`${identity1.provider}|${identity1.user_id}`);
          done();
        });
      });
    });
  });

  describe('internal API call failures', () => {

    let identity;
    beforeEach(() => {

      nock.cleanAll();

      identity = {
        "user_id": "113710000000000000000",
        "provider": "google-oauth2",
        "connection": "google-oauth2",
        "isSocial": true
      };
    });

    it('calls through without error if GET /users-by-email fails for some reason', done => {
      findUsersByEmailScope = nock(auth0.baseUrl, {
        reqheaders: {
          authorization: 'Bearer ' + auth0.accessToken,
        },
      })
      .get(`/users-by-email?email=${encodeURIComponent(agent.email)}`)
      .reply(400, { error: 'Something terrible has happened' });

      linkAccountsScope = nock(auth0.baseUrl, {
        reqheaders: {
          authorization: 'Bearer ' + auth0.accessToken,
          accept: 'application/json',
        }
      })
      .post('/users/' + encodeURIComponent(`${identity.provider}|${identity.user_id}`) + '/identities', JSON.stringify({
        user_id: agent.identities[0].user_id,
        provider: agent.identities[0].provider,
      }))
      .reply(200, {...agent});

      rule(agent, context, (err, agnt, cntxt) => {
        if (err) return done.fail(err);

        expect(findUsersByEmailScope.isDone()).toBe(true);
        expect(linkAccountsScope.isDone()).toBe(false);
        expect(agnt).toEqual(agent);
        expect(cntxt).toEqual(context);
        done();
      });
    });

    it('calls through without error if POST /identities fails for some reason', done => {
      // Success
      findUsersByEmailScope = nock(auth0.baseUrl, {
        reqheaders: {
          authorization: 'Bearer ' + auth0.accessToken,
        },
      })
      .get(`/users-by-email?email=${encodeURIComponent(agent.email)}`)
      .reply(200, [
        {...agent, created_at: new Date().toISOString() },
        {...agent, user_id: `${identity.provider}|${identity.user_id}`, created_at: new Date(1978, 8, 8).toISOString(), name: 'Some Guy', identities: [identity] }
      ]);

      // Fail
      linkAccountsScope = nock(auth0.baseUrl, {
        reqheaders: {
          authorization: 'Bearer ' + auth0.accessToken,
          accept: 'application/json',
        }
      })
      .post('/users/' + encodeURIComponent(`${identity.provider}|${identity.user_id}`) + '/identities', JSON.stringify({
        user_id: agent.identities[0].user_id,
        provider: agent.identities[0].provider,
      }))
      .reply(400, { error: 'Disaster!'});

      rule(agent, context, (err, agnt, cntxt) => {
        if (err) return done.fail(err);

        expect(findUsersByEmailScope.isDone()).toBe(true);
        expect(linkAccountsScope.isDone()).toBe(true);

        expect(agnt).toEqual(agent);
        expect(cntxt).toEqual(context);
        done();
      });
    });
  });
});
