# transom-mongoose-localuser-facebooktoken
Add Facebook authentication to a Transom REST API.
This plugin should be used from PWAs or single page apps where you
cannot redirect the whole app to the facebook callback url.

Instead, you use facebook's sdk to login and pass the 
acquired access token to the endpoint created by this plugin, for validation.
The default end point (/prefix/user/facebooktoken) accepts a post request
and returns the standard Transom bearer token to be used for subsequent requests.


