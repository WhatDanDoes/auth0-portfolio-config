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

  beforeEach(done => {
    agent = { ..._agent };
    context = { ..._context, accessToken: {} };

    fs.readFile('./settings/rules/force-account-linking.js', 'utf8', (err, data) => {
      if (err) return done.fail(err);

      function makeFunc() {

        let configuration = {};
        let auth0 = {};

        let func;
        eval('func = ' + data);
        return func;
      };

      rule = makeFunc();

      done();
    });
  });

  describe('no linkable accounts', () => {

    it('calls find users-by-email endpoint', done => {
      done.fail();
    });

    it('does not call the link accounts endpoint', done => {
      done.fail();
    });

    describe('accounts are already linked', () => {

      it('calls find users-by-email endpoint', done => {
        done.fail();
      });

      it('does not call the link accounts endpoint', done => {
        done.fail();
      });
    });

    describe('account was manually unlinked', () => {

      it('calls find users-by-email endpoint', done => {
        done.fail();
      });

      it('does not call the link accounts endpoint', done => {
        done.fail();
      });
    });
  });

  describe('one linkable account', () => {

    it('calls find users-by-email endpoint', done => {
      done.fail();
    });

    it('calls the link accounts endpoint', done => {
      done.fail();
    });
  });

  describe('several linkable accounts', () => {

    it('calls find users-by-email endpoint', done => {
      done.fail();
    });

    it('calls the link accounts endpoint for each of the linkable accounts', done => {
      done.fail();
    });

    describe('with account already linked', () => {

      it('calls find users-by-email endpoint', done => {
        done.fail();
      });

      it('does not call the link-accounts endpoint for the account already linked', done => {
        done.fail();
      });
    });

    describe('with manually_unlinked account', () => {

      it('calls find users-by-email endpoint', done => {
        done.fail();
      });

      it('does not call the link-accounts endpoint for the manually_linked account', done => {
        done.fail();
      });
    });
  });
});
