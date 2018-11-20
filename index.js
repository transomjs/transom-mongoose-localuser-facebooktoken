'use strict';
const debug = require('debug')('transom:facebook');
const FacebookTokenStrategy = require('./lib/FacebookTokenStrategy');

function TransomLocalUserFacebookToken() {
  this.initialize = function(server, options) {
    options = options || {};
    const strategyName = options.strategy || 'facebooktoken';
    debug(`Initializing TransomLocalUserFacebookToken strategy: ${strategyName}`);
    
    const facebookDefn = server.registry.get(
      'transom-config.definition.facebook',
      {}
    );
    const uriPrefix = server.registry.get(
      'transom-config.definition.uri.prefix'
    );
    const facebookOptions = Object.assign({}, options, facebookDefn);
    const baseUiUri = facebookOptions.baseUiUri || '<baseUiUri is not set!>';
    const baseApiUri = facebookOptions.baseApiUri || '<baseApiUri is not set!>';
    const fbHandler = new FacebookTokenStrategy(server, facebookOptions);
    const strategy = fbHandler.createStrategy();
    const passport = server.registry.get('passport');
    passport.use(strategyName, strategy);

    const fbConfig = {
      session: false,
      failureMessage: 'Facebook token Failed',
      successMessage: 'Facebook Token Success',
      scope: 'email'
    };

    server.post(`${uriPrefix}/user/${strategyName}`,
      passport.authenticate(`${strategyName}`, {session:false}),
      function (req, res) {
        // do something with req.user
        if (req.user){
          // Since we ALWAYS add new tokens to the end, use the last on in the array.
          var token = res.req.user.bearer[res.req.user.bearer.length - 1].token;
          res.send({token});
        } else {
          res.send(401);
        }
      }
    );
   };
}
module.exports = new TransomLocalUserFacebookToken();
