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

  let rule;

  beforeEach(() => {
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
    });
  });

  describe('when authenticated through Audio Manager', () => {
    it('adds email_verified property to access token', done => {
      done.fail();
    });
  });

  describe('when authenticated through any other app', () => {
    it('does not modify the access token', done => {
      done.fail();
    });
  });
});

