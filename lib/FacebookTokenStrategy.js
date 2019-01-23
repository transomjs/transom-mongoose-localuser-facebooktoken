'use strict';
const Strategy = require('passport-facebook-token');
const debug = require('debug')('transom:facebook');

module.exports = function FacebookTokenStrategy(server, options) {
  options.auth = options.auth || {};

  const loginCallback = options.loginCallback || ((server, user) => Promise.resolve(user));

  function createStrategy() {
    debug(
      `Creating FacebookToken strategy: ${options.auth.clientid} / ${
        options.auth.secret
      }`
    );
    const mongoose = server.registry.get('mongoose');
    const AclUser = mongoose.model('TransomAclUser');
    return new Strategy(
      {
        clientID: options.auth.clientid,
        clientSecret: options.auth.secret,
        enableProof: true, // sends a hash of the client & secret to FBook.
        profileFields: ['id', 'emails', 'name', 'displayName'],
        passReqToCallback: true
      },
      function(req, accessToken, refreshToken, profile, callback) {
        let fbEmail;
        // Get the User's facebook (first) email address
        if (profile.emails && profile.emails.length > 0 && profile.emails[0].value > "") {
          fbEmail = profile.emails[0].value.toLowerCase();
        } else {
          fbEmail = profile.id + '@facebook'; // Only used as a fallback.
        }

        new Promise((resolve, reject) => {
          profile.name = profile.name || {};
          profile.displayName =
            profile.displayName ||
            profile.name.givenName + ' ' + profile.name.familyName;

          // User is already logged in, we have to link accounts!
          // Only link accounts, if the User is already logged in!
          if (req.locals.user) {
            resolve(req.locals.user); // pull the user out of the session
          } else {
            AclUser.findOne({
              "social.facebook.id": profile.id,
              active: true
            })
              .then(user => {
                if (!user) {
                  // We have a new User!
                  user = new AclUser();
                  user.display_name = profile.displayName;
                  user.email = fbEmail;
                  user.username = fbEmail;
                  user.active = options.active === false ? false : true; // default true
                  user.verified_date = new Date();
                  user.groups = options.groups || []; // default no acl groups
                  user.__isNewAclUser = true;
                }
                // TODO: Throw an error if the user is registered, but not Active!
                resolve(user);
              })
              .catch(err => {
                reject(err);
              });
          }
        })
          .then(user => {
            return new Promise((resolve, reject) => {
              user.social = user.social || {};
              user.social.facebook = user.social.facebook || {};
              user.social.facebook.id = profile.id;
              user.social.facebook.token = accessToken;
              user.social.facebook.name = profile.displayName;
              user.social.facebook.email = fbEmail;

              // Do the bearer housekeeping and save the record.
              user.finalizeLogin(
                {
                  req
                },
                (err, user, message) => {
                  if (err) {
                    return reject(err);
                  }
                  if (!user && message) {
                    if (message.code === 11000) {
                      return reject(
                        'That email address is already registered.'
                      );
                    } else {
                      return reject(message || 'Error saving User record.');
                    }
                  }
                  // Success!
                  resolve(user);
                }
              );
            });
          })
          .then(user => {
            return loginCallback(server, user, user.__isNewAclUser).then(userFinal => {
              callback(null, userFinal);
            })
          })
          .catch(err => {
            console.log('Error in FacebookToken login:', err);
            callback(err);
          });
      }
    );
  }

  const result = {
    createStrategy
  };

  return result;
};
