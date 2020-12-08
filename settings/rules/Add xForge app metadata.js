function (user, context, callback) {
  if (context.clientMetadata.isXForgeApp !== 'true') {
    return callback(null, user, context);
  }
  
  const xfUserIdClaim = 'http://xforge.org/userid';
  const xfRoleClaim = 'http://xforge.org/role';
  user.app_metadata = user.app_metadata || {};
  if (user.app_metadata.xf_user_id && user.app_metadata.xf_role) {
    context.accessToken[xfUserIdClaim] = user.app_metadata.xf_user_id;
    context.accessToken[xfRoleClaim] = user.app_metadata.xf_role;
    return callback(null, user, context);
  }

  const ObjectId = require('bson').ObjectId;
  user.app_metadata.xf_user_id = new ObjectId().toHexString();
  user.app_metadata.xf_role = 'user';
  context.accessToken[xfUserIdClaim] = user.app_metadata.xf_user_id;
  context.accessToken[xfRoleClaim] = user.app_metadata.xf_role;

  auth0.users.updateAppMetadata(user.user_id, user.app_metadata)
    .then(function(){
      callback(null, user, context);
  })
    .catch(function(err){
      callback(err);
  });
}