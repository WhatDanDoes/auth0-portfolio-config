function (user, context, callback) {
  if (context.clientMetadata.isXForgeApp !== 'true' || context.request.query.prompt === 'none') {
    return callback(null, user, context);
  }

  const uuidv1 = require('uuid/v1@3.3.2');
  // You should make your requests over SSL to protect your app secrets.
  request.post({
    url: 'https://' + context.clientMetadata.domain + '/command-api/users',
    json: {
      jsonrpc: '2.0',
      method: 'pushAuthUserProfile',
      params: {
        userId: user.app_metadata.xf_user_id,
        userProfile: user
      },
      id: uuidv1()
    },
    auth: {
      user: configuration.XF_WEBHOOK_USERNAME,
      pass: configuration.XF_WEBHOOK_PASSWORD
    },
    timeout: 15000
  }, (err, _response, body) => {
    if (err) return callback(new Error(err));
    if (body.error) return callback(new Error(body.error.code + ': ' + body.error.message));

    callback(null, user, context);
  });
}