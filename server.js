var express = require( 'express');
var request = require('request');
var bodyParser = require('body-parser');

var multer = require('multer'); // v1.0.5
var upload = multer(); // for parsing multipart/form-data

var cf_svc = require( './utilities/vcap-service.js');

var pg = require('pg');
var fs = require('fs');


var app = express()
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded


app.set('json spaces', 4)

function getDateTime() {
    var date = new Date();
    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;
    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;
    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;
    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;
    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;
    return year + ":" + month + ":" + day + ":" + hour + ":" + min + ":" + sec;

}



//app.post( '/update', upload.array(), function (req, res, next) {
app.get( '/update', upload.array(), function (req, res, next) {

  console.log("f***")

  var sid_key = '';
  if (req.query.sid_key === undefined){
    res.send("Please provide device id");
    res.status(400);
  }
  sid_key = req.query.sid_key;
  var device_ip = '';
  if (req.query.device_ip != undefined){
    device_ip = req.query.device_ip;
  }
  var description = '';
  if (req.query.description != undefined){
    description = req.query.description;
  }
  console.log("111");
  var db_uri = cf_svc.get_elephantsql_uri();
  var client = new pg.Client(db_uri);
  client.connect(function(err) {

    if(err) {
      console.log("111****&&&&")
      console.error('Error while connecting to database', err);
      res.status(500);
    }
    //check whether the device present
    console.log("111****")
    var queryString = 'SELECT * from device_info WHERE sid_key=' + '\'' + sid_key + '\'';
    console.log(queryString);
    client.query(queryString, function(err, result) {
      if(err) {
        console.error('Error while querying database', err);
        client.end();
      }
      console.log("Result " + result.rows);
      if (result.rows.length > 0) {
        console.log("Device already present");
        //device already present, so no need to add it again
      } else {
        //device not present, so add it to device table
        var insertClient = new pg.Client(db_uri);
        insertClient.connect(function(err) {
          console.log("adding device")
          if(err) {
            console.error('could not connect to postgres', err);
            res.status(500);
          }
          var queryString =
            'INSERT INTO device_info (sid_key, description, device_ip) VALUES(' +
            '\'' + sid_key + '\', ' +
            '\'' + description + '\', ' +
            '\'' + device_ip + '\')' +
            ' returning sid_key';
          insertClient.query(queryString, function(err, result) {
            if(err) {
              console.error('error while adding to device_info', err);
              insertClient.end();
              res.send("Error while adding device information");
              res.status(500);
            }
          });
        });
        insertClient.end();
      }
    });
  });
  console.log("222")
  //client.end();

  //add active temperature values to activeTemp table
  var act_temp = 0.0;
  if (req.query.act_temp != undefined){
    act_temp = req.query.act_temp;
    var activeTempClient = new pg.Client(db_uri);
    console.log("333")
    activeTempClient.connect(function(err) {
      console.log("444")
      if(err) {
        return console.error('could not connect to postgres', err);
        res.status(500);
      }
      var queryString =
        'INSERT INTO activeTemp (sid_key, act_temp, record_time) VALUES(' +
        '\'' + sid_key + '\', ' +
        act_temp + ', ' +
        '\'' + getDateTime() + '\')' +
        ' returning sid_key';
      activeTempClient.query(queryString, function(err, result) {
        if(err) {
          //activeTempClient.end();
          return console.error('error while adding to activeTemp', err);
        }
        console.log("Successfully added act_temp")
      });
    });
    //activeTempClient.end();
  }

  //add display temperature values to displayTemp table
  var disp_temp = 0.0;
  if (req.query.disp_temp != undefined){
    disp_temp = req.query.disp_temp;
    var dispTempClient = new pg.Client(db_uri);
    dispTempClient.connect(function(err) {
    if(err) {
      return console.error('could not connect to postgres', err);
      res.status(500);
    }
    var queryString =
      'INSERT INTO displayTemp (sid_key, disp_temp, record_time) VALUES(' +
      '\'' + sid_key + '\', ' +
      disp_temp + ', ' +
      '\'' + getDateTime() + '\')' +
      ' returning sid_key';
    dispTempClient.query(queryString, function(err, result) {
      if(err) {
        //dispTempClient.end();
        return console.error('error while adding to activeTemp', err);
      }
      console.log("Successfully added disp_temp")
    });
    });
    //dispTempClient.end();
  }

  //add bulp temperature values to bultTime table
  var bulb_time = 0;
  if (req.query.bulb_time != undefined){
    bulb_time = req.query.bulb_time;
    var bulbTimeClient = new pg.Client(db_uri);
    bulbTimeClient.connect(function(err) {
    if(err) {
      return console.error('could not connect to postgres', err);
      res.status(500);
    }
    var queryString =
      'INSERT INTO bulbTime (sid_key, bulb_time, record_time) VALUES(' +
      '\'' + sid_key + '\', ' +
      bulb_time + ', ' +
      '\'' + getDateTime() + '\')' +
      ' returning sid_key';
      bulbTimeClient.query(queryString, function(err, result) {
      if(err) {
        //bulbTimeClient.end();
        return console.error('error while adding to activeTemp', err);
      }
      console.log("Successfully added bulb_time")
    });
    });
    //bulbTimeClient.end();

  }

  res.send("Added Successfully ");
  res.status(200);
})

app.get( '/device', function ( req, res) {
  var sid_key = req.query.sid_key;
  var results = {};
  if (sid_key) {
    var db_uri = cf_svc.get_elephantsql_uri();
    var client = new pg.Client(db_uri);

    client.connect(function(err) {
      if(err) {
        return console.error('could not connect to postgres', err);
      }
      var queryString = 'SELECT * FROM device_info WHERE sid_key=\''+sid_key+'\'';

      client.query(queryString, function(err, result) {
        if(err) {
          return console.error('error running query', err);
        }

        results['results']=result.rows;
        //var response = result.rows;

        res.json(results);
        //client.end();
      });
    });
  }
})






app.listen( process.env.PORT || 4000)
