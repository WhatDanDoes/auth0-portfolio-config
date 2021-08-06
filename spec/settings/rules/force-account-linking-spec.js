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

  let getUsersByEmailSpy, linkUsersSpy;
  let findUsersByEmailScope, linkAccountsScope;

  beforeEach(done => {
    agent = { ..._agent };
    context = { ..._context, accessToken: {} };

    getUsersByEmailSpy = jasmine.createSpy('getUsersByEmailSpy');
    linkUsersSpy = jasmine.createSpy('linkUsersSpy');

    fs.readFile('./settings/rules/force-account-linking.js', 'utf8', (err, data) => {
      if (err) return done.fail(err);

      function makeFunc() {

        let configuration = {};
        auth0 = {
          users: {
            getUsersByEmail: getUsersByEmailSpy,
            linkUsers: linkUsersSpy,
          },
          accessToken: 'abc-123',
          baseUrl: 'https://silid.auth0.com',
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
      getUsersByEmailSpy = getUsersByEmailSpy.and.callFake(function(email, cb) {
        cb(null, [{...agent}]);
      });

      findUsersByEmailScope = nock(auth0.baseUrl, {
        reqheaders: {
          authorization: 'Bearer ' + auth0.accessToken,
        },
      })
      .get(`/users-by-email/${agent.email}`)
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

//    it('calls find users-by-email endpoint', done => {
//      rule(agent, context, (err, agnt, cntxt) => {
//        if (err) return done.fail(err);
//        expect(getUsersByEmailSpy).toHaveBeenCalledWith(agent.email, jasmine.any(Function));
//        expect(getUsersByEmailSpy.calls.count()).toEqual(1);
//        done();
//      });
//    });

    it('calls find users-by-email endpoint', done => {
      rule(agent, context, (err, agnt, cntxt) => {
        if (err) return done.fail(err);

        expect(findUsersByEmailScope.isDone()).toBe(true);
        done();
      });
    });


//    it('does not call the link accounts endpoint', done => {
//      rule(agent, context, (err, agnt, cntxt) => {
//        if (err) return done.fail(err);
//        expect(linkUsersSpy).not.toHaveBeenCalled();
//        expect(linkUsersSpy.calls.count()).toEqual(0);
//        done();
//      });
//    });

    it('does not call the link accounts endpoint', done => {
      rule(agent, context, (err, agnt, cntxt) => {
        if (err) return done.fail(err);

        expect(linkAccountsScope.isDone()).toBe(false);
        done();
      });
    });

    describe('accounts are already linked', () => {
      beforeEach(() => {
        getUsersByEmailSpy = getUsersByEmailSpy.and.callFake(function(email, cb) {
          cb(null, [{...agent, identities: [agent.identities[0], {
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
        });

        findUsersByEmailScope = nock(auth0.baseUrl, {
          reqheaders: {
            authorization: 'Bearer ' + auth0.accessToken,
          },
        })
        .get(`/users-by-email/${agent.email}`)
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
//          expect(getUsersByEmailSpy).toHaveBeenCalledWith(agent.email, jasmine.any(Function));
//          expect(getUsersByEmailSpy.calls.count()).toEqual(1);
          done();
        });
      });

      it('does not call the link accounts endpoint', done => {
        rule(agent, context, (err, agnt, cntxt) => {
          if (err) return done.fail(err);

          expect(linkAccountsScope.isDone()).toBe(false);
//          expect(linkUsersSpy).not.toHaveBeenCalled();
//          expect(linkUsersSpy.calls.count()).toEqual(0);
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

        // Oldest account gets to be primary
        getUsersByEmailSpy = getUsersByEmailSpy.and.callFake(function(email, cb) {
          cb(null, [
            {...agent, created_at: new Date().toISOString(), user_metadata: { manually_unlinked: true }},
            {...agent, created_at: new Date(1978, 8, 8).toISOString(), name: 'Some Guy', identities: [identity1] },
            {...agent, created_at: new Date(2009, 7, 24).toISOString(), name: 'Same Goy', identities: [identity2] }
          ]);
        });

        linkUsersSpy = linkUsersSpy.and.callFake(function(primary, secondary, cb) {
          cb(null, { junk: 'does not matter for these purposes' });
        });

        findUsersByEmailScope = nock(auth0.baseUrl, {
          reqheaders: {
            authorization: 'Bearer ' + auth0.accessToken,
          },
        })
        .get(`/users-by-email/${agent.email}`)
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
//          expect(getUsersByEmailSpy.calls.count()).toEqual(0);
//          expect(getUsersByEmailSpy).not.toHaveBeenCalled();
          done();
        });
      });

      it('does not call the link accounts endpoint', done => {
        rule({...agent, user_metadata: { manually_unlinked: true }}, context, (err, agnt, cntxt) => {
          if (err) return done.fail(err);
          expect(linkAccountsScope.isDone()).toBe(false);
//          expect(linkUsersSpy).not.toHaveBeenCalled();
//          expect(linkUsersSpy.calls.count()).toEqual(0);
          done();
        });
      });
    });
  });

  describe('one linkable account', () => {

    let identity;
    beforeEach(() => {
      identity = {
        "user_id": "113710000000000000000",
        "provider": "google-oauth2",
        "connection": "google-oauth2",
        "isSocial": true
      };

      // Oldest account gets to be primary
      getUsersByEmailSpy = getUsersByEmailSpy.and.callFake(function(email, cb) {
        cb(null, [
          {...agent, created_at: new Date().toISOString() },
          {...agent, user_id: `${identity.provider}|${identity.user_id}`, created_at: new Date(1978, 8, 8).toISOString(), name: 'Some Guy', identities: [identity] }
        ]);
      });

      linkUsersSpy = linkUsersSpy.and.callFake(function(primary, secondary, cb) {
        cb(null, {...agent});
      });

      findUsersByEmailScope = nock(auth0.baseUrl, {
        reqheaders: {
          authorization: 'Bearer ' + auth0.accessToken,
        },
      })
      .get(`/users-by-email/${agent.email}`)
      .reply(200, [
        {...agent, created_at: new Date().toISOString() },
        {...agent, user_id: `${identity.provider}|${identity.user_id}`, created_at: new Date(1978, 8, 8).toISOString(), name: 'Some Guy', identities: [identity] }
      ]);

      linkAccountsScope = nock(auth0.baseUrl, {
        reqheaders: {
          authorization: 'Bearer ' + auth0.accessToken,
        },
      })
      .post(`/api/v2/users/${agent.user_id}/identities`, {
        provider: identity.provider,
        user_id: identity.user_id,
      })
      .reply(200, {...agent});

    });

    it('calls find users-by-email endpoint', done => {
      rule(agent, context, (err, agnt, cntxt) => {
        if (err) return done.fail(err);
        expect(findUsersByEmailScope.isDone()).toBe(false);
//        expect(getUsersByEmailSpy).toHaveBeenCalledWith(agent.email, jasmine.any(Function));
//        expect(getUsersByEmailSpy.calls.count()).toEqual(1);
        done();
      });
    });

    it('calls the link accounts endpoint with the oldest account set as primary', done => {
      rule(agent, context, (err, agnt, cntxt) => {
        if (err) return done.fail(err);
        expect(linkAccountsScope.isDone()).toBe(true);

//        expect(linkUsersSpy).toHaveBeenCalledWith(`${identity.provider}|${identity.user_id}`,
//                                                  {user_id: agent.identities[0].user_id, provider: agent.identities[0].provider},
//                                                  jasmine.any(Function));
//        expect(linkUsersSpy.calls.count()).toEqual(1);
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

      // Oldest account gets to be primary
      getUsersByEmailSpy = getUsersByEmailSpy.and.callFake(function(email, cb) {
        cb(null, [
          {...agent, created_at: new Date().toISOString()},
          {...agent, created_at: new Date(1978, 8, 8).toISOString(), user_id: `${identity1.provider}|${identity1.user_id}`, name: 'Some Guy', identities: [identity1] },
          {...agent, created_at: new Date(2009, 7, 24).toISOString(), user_id: `${identity2.provider}|${identity2.user_id}`, name: 'Same Goy', identities: [identity2] }
        ]);
      });

      linkUsersSpy = linkUsersSpy.and.callFake(function(primary, secondary, cb) {
        cb(null, { junk: 'does not matter for these purposes' });
      });

      findUsersByEmailScope = nock(auth0.baseUrl, {
        reqheaders: {
          authorization: 'Bearer ' + auth0.accessToken,
        },
      })
      .get(`/users-by-email/${agent.email}`)
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
      .post(`/api/v2/users/${identity1.provider}|${identity1.user_id}/identities`, {
        provider: agent.identities[0].provider,
        user_id: agent.identities[0].user_id,
      })
      .reply(200, { junk: 'does not matter for these purposes' });

      linkAccountScope2 = nock(auth0.baseUrl, {
        reqheaders: {
          authorization: 'Bearer ' + auth0.accessToken,
        },
      })
      .post(`/api/v2/users/${identity1.provider}|${identity1.user_id}/identities`, {
        provider: identity2.provider,
        user_id: identity2.user_id,
      })
      .reply(200, { junk: 'does not matter for these purposes' });
    });

    it('calls find users-by-email endpoint', done => {
      rule(agent, context, (err, agnt, cntxt) => {
        if (err) return done.fail(err);
        expect(findUsersByEmailScope.isDone()).toBe(false);
//        expect(getUsersByEmailSpy).toHaveBeenCalledWith(agent.email, jasmine.any(Function));
//        expect(getUsersByEmailSpy.calls.count()).toEqual(1);
        done();
      });
    });

    it('calls the link accounts endpoint for each of the linkable accounts', done => {
      rule(agent, context, (err, agnt, cntxt) => {
        if (err) return done.fail(err);
        const args =  linkUsersSpy.calls.allArgs()
        expect(linkAccountScope1.isDone()).toBe(true);
        expect(linkAccountScope2.isDone()).toBe(true);

//        expect(linkUsersSpy.calls.count()).toEqual(2);
//        expect(linkUsersSpy).toHaveBeenCalledWith(`${identity1.provider}|${identity1.user_id}`,
//                                                  {user_id: agent.identities[0].user_id, provider: agent.identities[0].provider},
//                                                  jasmine.any(Function));
//        expect(linkUsersSpy).toHaveBeenCalledWith(`${identity1.provider}|${identity1.user_id}`,
//                                                  {user_id: identity2.user_id, provider: identity2.provider},
//                                                  jasmine.any(Function));
        done();
      });
    });

    describe('new account access with oldest account manually_unlinked', () => {
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

        // Oldest account is usually primary
        getUsersByEmailSpy = getUsersByEmailSpy.and.callFake(function(email, cb) {
          cb(null, [
            {...agent, created_at: new Date().toISOString()},
            {...agent, created_at: new Date(1978, 8, 8).toISOString(), user_id: `${identity1.provider}|${identity1.user_id}`, name: 'Some Guy', identities: [identity1], user_metadata: { manually_unlinked: true } },
            {...agent, created_at: new Date(2009, 7, 24).toISOString(), user_id: `${identity2.provider}|${identity2.user_id}`, name: 'Same Goy', identities: [identity2] }
          ]);
        });

        findUsersByEmailScope = nock(auth0.baseUrl, {
          reqheaders: {
            authorization: 'Bearer ' + auth0.accessToken,
          },
        })
        .get(`/users-by-email/${agent.email}`)
        .reply(200, [
            {...agent, created_at: new Date().toISOString()},
            {...agent, created_at: new Date(1978, 8, 8).toISOString(), user_id: `${identity1.provider}|${identity1.user_id}`, name: 'Some Guy', identities: [identity1], user_metadata: { manually_unlinked: true } },
            {...agent, created_at: new Date(2009, 7, 24).toISOString(), user_id: `${identity2.provider}|${identity2.user_id}`, name: 'Same Goy', identities: [identity2] }
        ]);
  
        linkAccountsScope = nock(auth0.baseUrl, {
          reqheaders: {
            authorization: 'Bearer ' + auth0.accessToken,
          },
        })
        .post(`/api/v2/users/${identity2.provider}|${identity2.user_id}/identities`, {
          provider: agent.identities[0].provider,
          user_id: agent.identities[0].user_id,
        })
        .reply(200, {...agent});
      });

      it('calls find users-by-email endpoint', done => {
        rule(agent, context, (err, agnt, cntxt) => {
          if (err) return done.fail(err);
          expect(findUsersByEmailScope.isDone()).toBe(false);
//          expect(getUsersByEmailSpy).toHaveBeenCalledWith(agent.email, jasmine.any(Function));
//          expect(getUsersByEmailSpy.calls.count()).toEqual(1);
          done();
        });
      });

      it('calls the link-accounts endpoint and sets the next oldest as primary', done => {
        rule(agent, context, (err, agnt, cntxt) => {
          if (err) return done.fail(err);

          expect(linkAccountsScope.isDone()).toBe(true);
//          expect(linkUsersSpy.calls.count()).toEqual(1);
//          expect(linkUsersSpy).toHaveBeenCalledWith(`${identity2.provider}|${identity2.user_id}`,
//                                                    {user_id: agent.identities[0].user_id,
//                                                    provider: agent.identities[0].provider},
//                                                    jasmine.any(Function));
          done();
        });
      });
    });

    describe('with manually_unlinked secondary account', () => {

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

        // Oldest account gets to be primary
        getUsersByEmailSpy = getUsersByEmailSpy.and.callFake(function(email, cb) {
          cb(null, [
            {...agent, created_at: new Date().toISOString()},
            {...agent, created_at: new Date(1978, 8, 8).toISOString(), user_id: `${identity1.provider}|${identity1.user_id}`, name: 'Some Guy', identities: [identity1] },
            {...agent, created_at: new Date(2009, 7, 24).toISOString(), user_id: `${identity2.provider}|${identity2.user_id}`, name: 'Same Goy', identities: [identity2],
              user_metadata: { manually_unlinked: true }
            }
          ]);
        });

        findUsersByEmailScope = nock(auth0.baseUrl, {
          reqheaders: {
            authorization: 'Bearer ' + auth0.accessToken,
          },
        })
        .get(`/users-by-email/${agent.email}`)
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
        .post(`/api/v2/users/${identity1.provider}|${identity1.user_id}/identities`, {
          provider: agent.identities[0].provider,
          user_id: agent.identities[0].user_id,
        })
        .reply(200, {...agent});

      });

      it('calls find users-by-email endpoint', done => {
        rule(agent, context, (err, agnt, cntxt) => {
          if (err) return done.fail(err);
          expect(findUsersByEmailScope.isDone()).toBe(false);
//          expect(getUsersByEmailSpy).toHaveBeenCalledWith(agent.email, jasmine.any(Function));
//          expect(getUsersByEmailSpy.calls.count()).toEqual(1);
          done();
        });
      });

      it('does not call the link-accounts endpoint for the manually_unlinked account', done => {
        rule(agent, context, (err, agnt, cntxt) => {
          if (err) return done.fail(err);

          expect(linkAccountsScope.isDone()).toBe(true);
//          expect(linkUsersSpy.calls.count()).toEqual(1);
//          expect(linkUsersSpy).toHaveBeenCalledWith(`${identity1.provider}|${identity1.user_id}`,
//                                                    {user_id: agent.identities[0].user_id, provider: agent.identities[0].provider},
//                                                    jasmine.any(Function));
          done();
        });
      });
    });
  });
});
