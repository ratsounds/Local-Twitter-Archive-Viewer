import { getDOM, append } from './dom-utils.js';

function UserMap() {
  this.users = {};
}
UserMap.prototype.put = function (uid, name) {
  this.users[uid] = name;
};
UserMap.prototype.putFromTweet = function (tweet) {
  if (tweet.entities && tweet.entities.user_mentions) {
    for (let mention of tweet.entities.user_mentions) {
      this.users[mention.id] = mention.name;
    }
  }
};
UserMap.prototype.get = function (uid) {
  const name = this.users[uid];
  if (name) {
    return name;
  } else {
    return uid;
  }
};

function GroupMap() {
  this.groups = {};
}
GroupMap.prototype.put = function (gid, name) {
  this.groups[gid] = name;
};
GroupMap.prototype.get = function (gid) {
  const name = this.groups[gid];
  if (name) {
    return name;
  } else {
    return gid;
  }
};

function DateContainer(date_info) {
  this.date = date_info.date;
  this.utime = new Date(this.date).getTime() / 1000;
  this.tweets = [];
  this.dms = {};
}
DateContainer.prototype.append = async function (main) {
  await append(
    main,
    getDOM([
      '<div id="',
      this.date,
      '" class="date-block" style="order:',
      this.utime,
      '">',
      '<h2 class="date">',
      this.date,
      '</h2>',
      '<div class="threads">',
      '</div>',
      '</div>',
    ])
  );
  this.view = document
    .getElementById(this.date)
    .getElementsByClassName('threads')[0];
  return this.view;
};
DateContainer.prototype.addTweet = function (tweet) {
  this.tweets.push(tweet);
};
DateContainer.prototype.addDM = function (gid, dm) {
  let group = this.dms[gid];
  if (!group) {
    group = {
      name: gid,
      dms: [],
    };
    this.dms[gid] = group;
  }
  group.dms.push(dm);
};

function DateMap() {
  this.map = {};
  this.list = [];
}
DateMap.prototype.getDateContainer = function (date_info) {
  const y = date_info._date.getFullYear();
  const m = date_info._date.getMonth() + 1;
  const d = date_info._date.getDate();
  let year = this.map[y];
  if (!year) {
    year = {};
    this.map[y] = year;
  }
  let month = year[m];
  if (!month) {
    month = {};
    year[m] = month;
  }
  let day = month[d];
  if (!day) {
    day = new DateContainer(date_info);
    month[d] = day;
    this.list.push(day);
  }
  return day;
};
DateMap.prototype.putDateInfo = function (obj, date_key) {
  obj._date = new Date(obj[date_key]);
  obj.utime = obj._date.getTime() / 1000;
  obj.date = obj._date.toDateString();
  obj.time = obj._date.toTimeString();
  return obj;
};
DateMap.prototype.addTweet = function (tweet) {
  this.putDateInfo(tweet, 'created_at');
  tweet.media = getMediaFileFromTweet(tweet);
  tweet.url = getUrlFromTweet(tweet);
  let container = this.getDateContainer(tweet);
  container.addTweet(tweet);
};
DateMap.prototype.addDM = function (gid, dm) {
  this.putDateInfo(dm, 'createdAt');
  dm.media = getMediaFileFromDM(dm);
  dm.url = getUrlFromDM(dm);
  let container = this.getDateContainer(dm);
  container.addDM(gid, dm);
};
DateMap.prototype.sort = function (acend) {
  const compare = acend ? compareUTime : compareUTimeRev;
  this.list.sort(compare);
  for (let data of this.list) {
    data.tweets.sort(compare);
    for (let gid in data.dms) {
      data.dms[gid].dms.sort(compare);
    }
  }
};

function compareUTime(a, b) {
  return a.utime - b.utime;
}
function compareUTimeRev(a, b) {
  return b.utime - a.utime;
}

function getUrlFromTweet(tweet) {
  const urls = [];
  if (tweet.entities && tweet.entities.urls) {
    for (let url of tweet.entities.urls) {
      urls.push(
        ['<a href="', url.expanded_url, '">', url.expanded_url, '</a>'].join('')
      );
    }
  }
  return urls;
}
function getUrlFromDM(dm) {
  const urls = [];
  if (dm.urls) {
    for (let url of dm.urls) {
      urls.push(
        ['<a href="', url.expanded, '">', url.expanded, '</a>'].join('')
      );
    }
  }
  return urls;
}

function getMediaFileFromTweet(tweet) {
  const files = [];
  if (tweet.extended_entities && tweet.extended_entities.media) {
    for (let media of tweet.extended_entities.media) {
      const prefix = 'data/tweet_media/' + tweet.id + '-';
      switch (media.type) {
        case 'photo':
          files.push(
            '<img src="' + prefix + media.media_url.split('/').pop() + '">'
          );
          break;
        case 'animated_gif':
        case 'video':
          // eslint-disable-next-line no-case-declarations
          let max = -1;
          // eslint-disable-next-line no-case-declarations
          let max_variant;
          for (let variant of media.video_info.variants) {
            const bitrate = variant.bitrate ? Number(variant.bitrate) : -1;
            if (max < bitrate) {
              max = bitrate;
              max_variant = variant;
            }
          }
          // eslint-disable-next-line prettier/prettier
          files.push(
            '<video src="' +
              prefix +
              max_variant.url.split('/').pop() +
              '" controls></video>'
          );
          break;
        default:
          console.log(media.type);
      }
    }
  }
  return files;
}

function getMediaFileFromDM(dm) {
  const files = [];
  if (dm.mediaUrls) {
    for (let url of dm.mediaUrls) {
      const prefix = 'data/direct_messages_group_media/' + dm.id + '-';
      const fn = prefix + url.split('/').pop();
      if (url.indexOf('/dm_gif/') >= 0 || url.indexOf('/dm_video/') >= 0) {
        files.push('<video src="' + fn + '" controls></video>');
      } else {
        files.push('<img src="' + fn + '">');
      }
    }
  }
  return files;
}

export function TwitterArchive(log_function) {
  this.log = log_function ? log_function : console.log;
  this.users = new UserMap(this.log);
  this.groups = new UserMap(this.log);
  this.data = new DateMap(this.log);
}
TwitterArchive.prototype.load = function (YTD) {
  return new Promise((resolve) => {
    this.log('load archives');
    setTimeout(async () => {
      for (let p in YTD.tweet) {
        const part = YTD.tweet[p];
        for (let item of part) {
          this.data.addTweet(item.tweet);
          this.users.putFromTweet(item.tweet);
          this.log('mapping tweet data at ' + item.tweet.date);
        }
      }
      for (let p in YTD.direct_messages_group) {
        const part = YTD.direct_messages_group[p];
        for (let item of part) {
          const conversationId = item.dmConversation.conversationId;
          for (let message of item.dmConversation.messages) {
            for (let action in message) {
              const body = message[action];
              body[action] = true;
              switch (action) {
                case 'participantsJoin':
                  body.text =
                    'join : ' +
                    body.userIds.map((id) => this.users.get(id)).join(', ');
                  break;
                case 'participantsLeave':
                  body.text = 'leave : ' + body.userIds;
                  break;
                case 'joinConversation':
                  body.text = 'join group : ' + body.name;
                  break;
                case 'conversationNameUpdate':
                  this.groups.put(conversationId, body.name);
                  body.text = 'update group name : ' + body.name;
                  break;
              }
              this.data.addDM(conversationId, body);
              this.log('mapping dm data at ' + body.date);
            }
          }
        }
      }
      this.log('sort data');
      this.data.sort(true);
      resolve();
    }, 0);
  });
};
TwitterArchive.prototype.appendMenu = function (root) {
  return new Promise((resolve) => {
    this.log('construct menu');
    setTimeout(async () => {
      for (let year in this.data.map) {
        let isFirst = true;
        for (let month in this.data.map[year]) {
          const order = year * 100 + Number(month);
          const mid = 'y' + year + 'm' + month;
          const prefix = isFirst ? year : '';
          await append(
            root,
            getDOM([
              '<div class="month" id="',
              mid,
              '" style="order:',
              order,
              '" data-year="',
              year,
              '" data-month="',
              month,
              '">',
              '<span class="year">',
              prefix,
              '</span><span>',
              month,
              '</span></div>',
            ])
          );
          isFirst = false;
        }
      }
      resolve();
    }, 0);
  });
};
