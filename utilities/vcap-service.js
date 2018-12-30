// app-bound services environment variables
var pg = require('pg');


module.exports = {
  get_elephantsql_uri: function () {
    if (process.env.VCAP_SERVICES) {
      var svc_info = JSON.parse(process.env.VCAP_SERVICES)
      for (var label in svc_info) {
        var svcs = svc_info[label]
        for (var index in svcs) {
          if(svcs[index].label == "elephantsql"){
            var uri = svcs[index].credentials.uri
            return uri
          }
        }
      }
    }
  },
  is_device_exists: function (sid_key) {
    var db_uri = module.exports.get_elephantsql_uri();
    var client = new pg.Client(db_uri);

    client.connect(function(err) {
      if(err) {
        return false;
      }

      var queryString = 'SELECT * from device_info WHERE sid_key=' + '\'' + sid_key + '\'';

      client.query(queryString, function(err, result) {
        if(err) {
          client.end();
          console.log("returning false");
          return false;
        }
        console.log("returning true");
        return true;
      });
    });
  }

}
