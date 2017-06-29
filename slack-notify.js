/*

slack-notify

https://github.com/andrewchilds/slack-notify

Usage:

var MY_SLACK_WEBHOOK_URL = 'https://myaccountname.slack.com/services/hooks/incoming-webhook?token=myToken';
var slack = require('slack-notify')(MY_SLACK_WEBHOOK_URL);

slack.alert('Something bad happened!');

slack.send({
  channel: '#myCustomChannelName',
  icon_url: 'http://example.com/my-icon.png',
  text: 'Here is my notification',
  unfurl_links: 1,
  username: 'Jimmy'
});

*/

var request = require('request');
var _ = require('lodash');

module.exports = function (url) {
  var pub = {};

  pub.request = function (data, done) {
    if (!url) {
      console.log('No Slack URL configured.');
      return false;
    }

    if (!_.isFunction(done)) {
      done = _.noop;
    }
    if (!_.isFunction(pub.onError)) {
      pub.onError = _.noop;
    }

    request.post(url, {
      form: {
        payload: JSON.stringify(data)
      }
    }, function(err, response) {
      if (err) {
        pub.onError(err);
        return done(err);
      }
      if (response.body !== 'ok') {
        pub.onError(new Error(response.body));
        return done(new Error(response.body));
      }

      done();
    });
  };

  pub.sendNotification = function (options, done) {
    // Move the fields into attachments
    if (options.fields) {
      if (!options.attachments) {
        options.attachments = [];
      }

      options.attachments.push({
        fallback: 'Alert details',
        fields: _.map(options.fields, function (value, title) {
          return {
            title: title,
            value: value,
            short: (value + '').length < 25
          };
        })
      });

      delete(options.fields);
    }

    // Remove the default icon_emoji if icon_url was set in options. Otherwise the default emoji will always override the url
    if (options.icon_url && !options.icon_emoji) {
      delete(options.icon_emoji);
    }

    pub.request(options, done);
  };

  pub.extend = function (defaults) {
    return function (options, done) {
      if (_.isString(options)) {
        options = { text: options };
      }

      var fullOptions = _.extend(defaults, options);
      if(fullOptions.channels)
        fullOptions.channel = fullOptions.channels;

      if (_.isArray(fullOptions.channel)) {
        fullOptions.channel.forEach(function (o) {
          fullOptions.channel = o;
          pub.sendNotification(fullOptions, done);
        });
      } else {
        pub.sendNotification(fullOptions, done);
      }
      
    };
  };

  pub.send = pub.extend({
    username: 'Robot',
    text: '',
    icon_emoji: ':bell:'
  });

  pub.bug = pub.extend({
    channel: '#bugs',
    icon_emoji: ':bomb:',
    username: 'Bug'
  });

  pub.alert = pub.extend({
    channel: '#alerts',
    icon_emoji: ':warning:',
    username: 'Alert'
  });

  pub.note = pub.extend({
    channel: '#alerts',
    icon_emoji: ':bulb:',
    username: 'Note'
  });

  pub.success = pub.extend({
    channel: '#alerts',
    icon_emoji: ':trophy:',
    username: 'Hoorah'
  });

  return pub;
};
