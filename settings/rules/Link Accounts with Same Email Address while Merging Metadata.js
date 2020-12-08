function (user, context, callback) {
  const request = require('request');
  const _ = require('lodash');

  // Check if email is verified, we shouldn't automatically
  // merge accounts if this is not the case.
  if (!user.email || !user.email_verified) {
    return callback(null, user, context);
  }

  const getAccessToken = (clientId, clientSecret, cb) => {
    const cacheKey = clientId + '_token';
    const cachedToken = global[cacheKey];
    if (cachedToken && cachedToken.expirationDate > Date.now()) {
        // token is valid
        return cb(null, cachedToken.accessToken);
    }

    // token not present or expired, get a fresh one
    const urlArray = auth0.baseUrl.split('/');
    const origin = urlArray[0] + '//' + urlArray[2];
    request.post({
      url: origin + '/oauth/token',
      body: {
        client_id: clientId,
        client_secret: clientSecret,
        audience: auth0.baseUrl + '/',
        grant_type: 'client_credentials'
      },
      json: true
    }, (err, _response, body) => {
      if (err) {
        console.log('Error getting access token for API v2.', err);
        return cb("Error getting access token: " + err);
      }
      global[cacheKey] = {
        accessToken: body.access_token,
        // 60 seconds safe window time
        expirationDate: Date.now() + (body.expires_in - 60) * 1000
      };
      return cb(null, body.access_token);
    });
  };

  // get an access token that can retrieve full user profiles, so that if we replace the new user with the original
  // user, the full profile of the original user will be passed to the next rule
  getAccessToken(
    configuration.AUTH0_CLIENT_ID,
    configuration.AUTH0_CLIENT_SECRET,
    (err, accessToken) => {
      if (err) {
        callback(err);
      }
    
      request({
       url: auth0.baseUrl + '/users-by-email',
       headers: {
         Authorization: 'Bearer ' + accessToken
       },
       qs: {
         email: user.email
       }
      }, (err, response, body) => {
        if (err) {
          return callback(err);
        }
        if (response.statusCode !== 200) {
          return callback(new Error(body));
        }
    
        let data = JSON.parse(body);
        // Ignore non-verified users and current user, if present
        data = data.filter(u => u.email_verified && (u.user_id !== user.user_id));
        if (data.length > 1) {
          return callback(new Error('[!] Rule: Multiple user profiles already exist - cannot select base profile to link with'));
        }
        if (data.length === 0) {
          console.log('[-] Skipping link rule');
          return callback(null, user, context);
        }
    
        const originalUser = data[0];
        const provider = user.identities[0].provider;
        const providerUserId = user.identities[0].user_id;
        const mergeCustomizer = (objectValue, sourceValue) => {
          if (_.isArray(objectValue)) {
            return sourceValue.concat(objectValue);
          }
        };
        const mergedUserMetadata = _.merge({}, user.user_metadata, originalUser.user_metadata, mergeCustomizer);
        const mergedAppMetadata = _.merge({}, user.app_metadata, originalUser.app_metadata, mergeCustomizer);
        auth0.users.updateAppMetadata(originalUser.user_id, mergedAppMetadata)
          .then(auth0.users.updateUserMetadata(originalUser.user_id, mergedUserMetadata))
          .then(() => {
            request.post({
              url: auth0.baseUrl + '/users/' + originalUser.user_id + '/identities',
              headers: {
                Authorization: 'Bearer ' + auth0.accessToken
              },
              json: { provider: provider, user_id: String(providerUserId) }
            }, (_err, response, _body) => {
              if (response && response.statusCode >= 400) {
                return callback(new Error('Error linking account: ' + response.statusMessage));
              }
              context.primaryUser = originalUser.user_id;
              // the new user has been linked to the original user and no longer exists, so pass original user to the
              // next rule
              callback(null, originalUser, context);
            });
          })
          .catch(err => callback(err));
      });
    });
}