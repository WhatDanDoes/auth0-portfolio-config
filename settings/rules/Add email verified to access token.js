function (user, context, callback) {
  // This rule adds the authenticated user's email address to the access token.
  if (context.clientName !== 'Audio Manager Desktop') &&
      context.clientName !== 'Audio Manager') {
    return callback(null, user, context);
  }

  var namespace = 'https://sil.org/';

  context.accessToken[namespace + 'email_verified'] = user.email_verified;
  return callback(null, user, context);
}
