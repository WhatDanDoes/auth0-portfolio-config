function (user, context, callback) {
  if (context.clientMetadata.isXForgeApp !== 'true' || !context.request.query.language) {
    return callback(null, user, context);
  }
  
  var language = context.request.query.language;
  if (language.length > 3 && language.includes("tag")) {
    var languageConfig = JSON.parse(language);
    language = languageConfig.tag || "en";
  }
  user.user_metadata = user.user_metadata || {};
  user.user_metadata.interface_language = language;
  auth0.users.updateUserMetadata(user.user_id, user.user_metadata)
    .then(function(){
      callback(null, user, context);
  })
    .catch(function(err){
      callback(err);
  });
}
