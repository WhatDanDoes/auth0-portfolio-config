const fs = require('fs');

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

  let rule, agent, context;

  let getUsersByEmailSpy, linkUsersSpy;

  beforeEach(done => {
    agent = { ..._agent };
    context = { ..._context, accessToken: {} };

    getUsersByEmailSpy = jasmine.createSpy('getUsersByEmailSpy');
    linkUsersSpy = jasmine.createSpy('linkUsersSpy');

    fs.readFile('./settings/rules/force-account-linking.js', 'utf8', (err, data) => {
      if (err) return done.fail(err);

      function makeFunc() {

        let configuration = {};
        let auth0 = {
          users: {
            getUsersByEmail: getUsersByEmailSpy,
            linkUsers: linkUsersSpy,
          },
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
    });

    it('calls find users-by-email endpoint', done => {
      rule(agent, context, (err, agnt, cntxt) => {
        if (err) return done.fail(err);
        expect(getUsersByEmailSpy).toHaveBeenCalledWith(agent.email, jasmine.any(Function));
        expect(getUsersByEmailSpy.calls.count()).toEqual(1);
        done();
      });
    });

    it('does not call the link accounts endpoint', done => {
      rule(agent, context, (err, agnt, cntxt) => {
        if (err) return done.fail(err);
        expect(linkUsersSpy).not.toHaveBeenCalled();
        expect(linkUsersSpy.calls.count()).toEqual(0);
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
      });

      it('calls find users-by-email endpoint', done => {
        rule(agent, context, (err, agnt, cntxt) => {
          if (err) return done.fail(err);
          expect(getUsersByEmailSpy).toHaveBeenCalledWith(agent.email, jasmine.any(Function));
          expect(getUsersByEmailSpy.calls.count()).toEqual(1);
          done();
        });
      });

      it('does not call the link accounts endpoint', done => {
        rule(agent, context, (err, agnt, cntxt) => {
          if (err) return done.fail(err);
          expect(linkUsersSpy).not.toHaveBeenCalled();
          expect(linkUsersSpy.calls.count()).toEqual(0);
          done();
        });
      });
    });

    describe('account was manually unlinked', () => {
      beforeEach(() => {
        getUsersByEmailSpy = getUsersByEmailSpy.and.callFake(function(email, cb) {
          cb(null, [{...agent, user_metadata: { manually_unlinked: true } }]);
        });
      });

      it('calls find users-by-email endpoint', done => {
        rule(agent, context, (err, agnt, cntxt) => {
          if (err) return done.fail(err);
          expect(getUsersByEmailSpy).toHaveBeenCalledWith(agent.email, jasmine.any(Function));
          expect(getUsersByEmailSpy.calls.count()).toEqual(1);
          done();
        });
      });

      it('does not call the link accounts endpoint', done => {
        rule(agent, context, (err, agnt, cntxt) => {
          if (err) return done.fail(err);
          expect(linkUsersSpy).not.toHaveBeenCalled();
          expect(linkUsersSpy.calls.count()).toEqual(0);
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

      getUsersByEmailSpy = getUsersByEmailSpy.and.callFake(function(email, cb) {
        cb(null, [{...agent}, {...agent, name: 'Some Guy', identities: [identity] }]);
      });
    });

    it('calls find users-by-email endpoint', done => {
      rule(agent, context, (err, agnt, cntxt) => {
        if (err) return done.fail(err);
        expect(getUsersByEmailSpy).toHaveBeenCalledWith(agent.email, jasmine.any(Function));
        expect(getUsersByEmailSpy.calls.count()).toEqual(1);
        done();
      });
    });

    it('calls the link accounts endpoint', done => {
      rule(agent, context, (err, agnt, cntxt) => {
        if (err) return done.fail(err);
        expect(linkUsersSpy).toHaveBeenCalledWith(agent.user_id, {user_id: identity.user_id, provider: identity.provider}, jasmine.any(Function));
        expect(linkUsersSpy.calls.count()).toEqual(1);
        done();
      });
    });
  });

  describe('several linkable accounts', () => {

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

      getUsersByEmailSpy = getUsersByEmailSpy.and.callFake(function(email, cb) {
        cb(null, [
          {...agent},
          {...agent, name: 'Some Guy', identities: [identity1] },
          {...agent, name: 'Same Goy', identities: [identity2] }
        ]);
      });
    });

    it('calls find users-by-email endpoint', done => {
      rule(agent, context, (err, agnt, cntxt) => {
        if (err) return done.fail(err);
        expect(getUsersByEmailSpy).toHaveBeenCalledWith(agent.email, jasmine.any(Function));
        expect(getUsersByEmailSpy.calls.count()).toEqual(1);
        done();
      });
    });

    it('calls the link accounts endpoint for each of the linkable accounts', done => {
      rule(agent, context, (err, agnt, cntxt) => {
        if (err) return done.fail(err);
        expect(linkUsersSpy.calls.count()).toEqual(2);
        expect(linkUsersSpy).toHaveBeenCalledWith(agent.user_id, {user_id: identity1.user_id, provider: identity1.provider}, jasmine.any(Function));
        expect(linkUsersSpy).toHaveBeenCalledWith(agent.user_id, {user_id: identity2.user_id, provider: identity2.provider}, jasmine.any(Function));
        done();
      });
    });

    describe('with manually_unlinked account', () => {

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
  
        getUsersByEmailSpy = getUsersByEmailSpy.and.callFake(function(email, cb) {
          cb(null, [
            {...agent},
            {...agent, name: 'Some Guy', identities: [identity1], user_metadata: { manually_unlinked: true } },
            {...agent, name: 'Same Goy', identities: [identity2] }
          ]);
        });
      });

      it('calls find users-by-email endpoint', done => {
        rule(agent, context, (err, agnt, cntxt) => {
          if (err) return done.fail(err);
          expect(getUsersByEmailSpy).toHaveBeenCalledWith(agent.email, jasmine.any(Function));
          expect(getUsersByEmailSpy.calls.count()).toEqual(1);
          done();
        });
      });

      it('does not call the link-accounts endpoint for the manually_unlinked account', done => {
        rule(agent, context, (err, agnt, cntxt) => {
          if (err) return done.fail(err);
          expect(linkUsersSpy.calls.count()).toEqual(1);
          expect(linkUsersSpy).toHaveBeenCalledWith(agent.user_id, {user_id: identity2.user_id, provider: identity2.provider}, jasmine.any(Function));
          done();
        });
      });
    });
  });
});
