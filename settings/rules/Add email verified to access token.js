function (user, context, callback) {
    // This rule adds the authenticated user's email address to the access token.
    if (context.clientMetadata.isAudioManagerApp !== 'true') {
      return callback(null, user, context);
    }
  
    var namespace = 'https://sil.org/';
  
    context.accessToken[namespace + 'email_verified'] = user.email_verified;
    return callback(null, user, context);
  }