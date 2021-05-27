const fs = require('fs');

/**
 * 2021-5-27
 *
 * These samples were obtained from the "Save and try" manual debug facility
 * provided by Auth0's_Rules_ interface.
 *
 * Update as they are updated at Auth0.
 */
const _agent = require('../../fixtures/agent.json');
const _context = require('../../fixtures/context.json');

describe('Add-email-verified-to-access-token', () => {

  const NAMESPACE = 'https://sil.org/';

  let rule, agent, context;

  beforeEach(done => {

    /**
     * These are the parameters to be modified for individual tests.
     * This resets them to their defaults before each test
     */
    agent = { ..._agent };
    // Careful! Spread only does a shallow copy. Hence the explicit accessToken reset
    context = { ..._context, accessToken: {} };

    /**
     * Try loading the relevant rule in the conventional way with `require`.
     * You will receive an error:
     *
     *   `SyntaxError: Function statements require a function name`
     *
     * Prepping the actual rule for testing requires storing the _anonymous_
     * rule function in a variable. I.e., I am defining the rule to be tested
     * as an expression.
     */
    fs.readFile('./settings/rules/Add\ email\ verified\ to\ access\ token.js', 'utf8', (err, data) => {
      if (err) return done.fail(err);

      /**
       * Closures are leveraged here to simulate the _global_ objects made
       * available in the Auth0 authorization flow, i.e.:
       *
       * - configuration
       * - auth0
       *
       * These aren't actually used in these tests (yet). They are left here
       * for reference.
       */
      function makeFunc() {

        // 2021-5-27 https://auth0.com/docs/rules/configuration
        let configuration = {};

        let auth0 = {};

        let func;
        eval('func = ' + data);
        return func;
      };

      // `rule` is now a testable function
      rule = makeFunc();

      done();
    });
  });

  /**
   * If `email` is not part of the requested scope, `email_verified` will be
   * `undefined`.
   */
  describe('no email claim', () => {

    beforeEach(() => {
      expect(agent.email_verified).toBeUndefined();
    });

    describe('when authenticated through Audio Manager', () => {

      it('adds and sets namespaced value to false if email_verified is undefined', done => {
        const clientConfig = require('../../../settings/clients/Audio\ Manager.json');
        context.clientName = clientConfig.name;

        rule(agent, context, (err, agnt, cntxt) => {
          if (err) return done.fail(err);
          expect(cntxt.accessToken[`${NAMESPACE}email_verified`]).toBe(false);
          done();
        });
      });

      it('adds and sets namespaced value to false if email_verified is undefined on call from desktop version', done => {
        const clientConfig = require('../../../settings/clients/Audio\ Manager\ Desktop.json');
        context.clientName = clientConfig.name;

        rule(agent, context, (err, agnt, cntxt) => {
          if (err) return done.fail(err);

          expect(cntxt.accessToken[`${NAMESPACE}email_verified`]).toBe(false);
          done();
        });
      });
    });
  });

  describe('email claimed', () => {

    beforeEach(() => {
      agent.email_verified = true;
    });

    describe('when authenticated through Audio Manager', () => {
      it('adds namespaced email_verified property to access token', done => {
        const clientConfig = require('../../../settings/clients/Audio\ Manager.json');
        context.clientName = clientConfig.name;

        rule(agent, context, (err, agnt, cntxt) => {
          if (err) return done.fail(err);

          expect(cntxt.accessToken[`${NAMESPACE}email_verified`]).toBe(true);
          done();
        });
      });

      it('adds namespaced email_verified property to access token on call from desktop version', done => {
        const clientConfig = require('../../../settings/clients/Audio\ Manager\ Desktop.json');
        context.clientName = clientConfig.name;

        rule(agent, context, (err, agnt, cntxt) => {
          if (err) return done.fail(err);

          expect(cntxt.accessToken[`${NAMESPACE}email_verified`]).toBe(true);
          done();
        });
      });
    });

    describe('when authenticated through any other app', () => {

      it('does not modify the access token', done => {
        expect(context.accessToken).toEqual({});
        rule(agent, context, (err, agnt, cntxt) => {
          if (err) return done.fail(err);

          expect(cntxt.accessToken).toEqual({});
          expect(cntxt).toEqual(_context);

          done();
        });
      });

      /**
       * This basically performs the same test as above upon every
       * _live_ client configuration.
       */
      it('does not modify the access token on any of the client config files', done => {
        let ruleCalls = 0;

        function testConfigs(files) {
          // Reset
          context = { ..._context, accessToken: {} };

          if (!files.length) {
            expect(ruleCalls).toEqual(2);
            return done();
          }

          const file = files.pop();

          if (/\.json$/.test(file)) {
            const clientConfig = require(`../../../settings/clients/${file}`);
            context.clientName = clientConfig.name;

            expect(context.accessToken).toEqual({});

            rule(agent, context, (err, agnt, cntxt) => {
              if (err) return done.fail(err);

              if (Object.keys(cntxt.accessToken).length) {
                // Only two configured clients
                ruleCalls++;
                expect(cntxt.clientName).toMatch(/Audio Manager/);
              }
              else {
                expect(cntxt).toEqual(context);
              }
              testConfigs(files);
            });
          }
          else {
            testConfigs(files);
          }
        };

        fs.readdir('./settings/clients', (err, files) => {
          if (err) return done.fail();
          testConfigs(files);
        });
      });
    });
  });
});

