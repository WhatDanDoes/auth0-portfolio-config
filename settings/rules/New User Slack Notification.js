function (user, context, callback) {
  if (context.clientMetadata.isTranscriberApp !== 'true') {
    return callback(null, user, context);
  }

  // short-circuit if the user signed up already or is using a refresh token
  if (context.stats.loginsCount > 1 || context.protocol === 'oauth2-refresh-token') {
    return callback(null, user, context);
  }

  // get your slack's hook url from: https://slack.com/services/10525858050
  // Encrypt using Github Integration Secrets encryption
  // Save in rules-configs variable
  var slack = require('slack-notify')(configuration.Transcriber_WEBHOOK_SLACK);
  var message = 'New User: ' + (user.name || user.email) + ' (' + user.email + ')';
  var channel = '#transcriber-new-user';

  slack.success({
   text: message,
   channel: channel
  });

  // don’t wait for the Slack API call to finish, return right away (the request will continue on the sandbox)`
  callback(null, user, context);
}