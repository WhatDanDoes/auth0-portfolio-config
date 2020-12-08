function (user, context, callback) {
  const namespace = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/';
  if (user.user_metadata) {
    if (user.user_metadata.given_name) {
       context.idToken[namespace + 'givenname'] = user.user_metadata.given_name;
    }
    if (user.user_metadata.family_name) {
       context.idToken[namespace + 'surname'] = user.user_metadata.family_name;
    }
  }
  callback(null, user, context);
}
