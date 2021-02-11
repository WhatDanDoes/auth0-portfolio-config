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
      } else if (body.error) {
        console.log('HTTP error response getting access token for API v2.');
        return cb("Error getting access token: " + body.error.error_description);
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
        return callback(err);
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
        if (data.length === 0) {
          console.log('[-] Skipping link rule');
          return callback(null, user, context);
        }
        let primaryUser, secondaryUser;
        if (user.app_metadata) {
          console.log('[-] Merging other profile into the current profile')
          primaryUser = user;
          secondaryUser = data[0];
        } else {
          console.log('[-] Merging newly created profile into the original profile');
          if (data.length > 1) {
            console.log('[-] Multiple user profiles detected - using most recently modified profile as the primary profile');
            data.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
          }
          primaryUser = data[0];
          secondaryUser = user;
        }
        const provider = secondaryUser.identities[0].provider;
        const providerUserId = secondaryUser.identities[0].user_id;

        const mergeCustomizer = (objectValue, sourceValue) => {
          if (_.isArray(objectValue)) {
            return sourceValue.concat(objectValue);
          }
        };
        const mergedUserMetadata = _.merge({}, secondaryUser.user_metadata, primaryUser.user_metadata, mergeCustomizer);
        const mergedAppMetadata = _.merge({}, secondaryUser.app_metadata, primaryUser.app_metadata, mergeCustomizer);
        auth0.users.updateAppMetadata(primaryUser.user_id, mergedAppMetadata)
          .then(auth0.users.updateUserMetadata(primaryUser.user_id, mergedUserMetadata))
          .then(() => {
            request.post({
              url: auth0.baseUrl + '/users/' + primaryUser.user_id + '/identities',
              headers: {
                Authorization: 'Bearer ' + auth0.accessToken
              },
              json: { provider: provider, user_id: String(providerUserId) }
            }, (_err, response, _body) => {
              if (response && response.statusCode >= 400) {
                return callback(new Error('Error linking account: ' + response.statusMessage));
              }
              context.primaryUser = primaryUser.user_id;
              // the new user has been linked to the original user and no longer exists, so pass original user to the
              // next rule
              callback(null, primaryUser, context);
            });
          })
          .catch(err => callback(err));
      });
    });
}