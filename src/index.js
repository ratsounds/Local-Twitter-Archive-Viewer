import 'modern-css-reset';
import './index.css';

// dom utils
const _template = document.createElement('template');
function getDOM(html) {
  _template.innerHTML = html.join('');
  return _template.content;
}

function append(root, elem) {
  return new Promise((resolve) => {
    setTimeout(() => {
      root.append(elem);
      resolve(root);
    }, 0);
  });
}

// stats
const stats = document.getElementById('stats');
function log(message) {
  setTimeout(() => {
    stats.innerHTML = message;
  }, 0);
}

//user map
const user_map = new UserMap();

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

//group map
const group_map = new GroupMap();

function GroupMap() {
  this.users = {};
}
GroupMap.prototype.put = function (gid, name) {
  this.users[gid] = name;
};
GroupMap.prototype.get = function (gid) {
  const name = this.users[gid];
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
DateContainer.prototype.appendMenu = async function (menu) {
  await append(
    menu,
    getDOM([
      '<div id="m',
      this.date,
      '" class="date-menu" style="order:',
      this.utime,
      '">',
      this.date,
      '</div>',
    ])
  );
  this.menu = document.querySelector('#m' + this.date);
  return this.menu;
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
  if (dm.participantsJoin) {
    dm.text = 'join : ' + dm.userIds.map((id) => user_map.get(id)).join(', ');
  } else if (dm.participantsLeave) {
    dm.text = 'leave : ' + dm.userIds;
  } else if (dm.joinConversation) {
    dm.text = 'join group : ' + group.name;
  } else if (dm.conversationNameUpdate) {
    group_map.put(gid, dm.name);
    dm.text = 'update group name : ' + dm.name;
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
  log('mapping tweet data at ' + tweet.date);
  tweet.media = getMediaFileFromTweet(tweet);
  tweet.url = getUrlFromTweet(tweet);
  let container = this.getDateContainer(tweet);
  container.addTweet(tweet);
  user_map.putFromTweet(tweet);
};
DateMap.prototype.addDM = function (gid, dm) {
  this.putDateInfo(dm, 'createdAt');
  log('mapping dm data at ' + dm.date);
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
          files.push('<video src="' + prefix + max_variant.url.split('/').pop() + '" controls></video>');
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

document.addEventListener('DOMContentLoaded', () => {
  log('load archives');
  const data = new DateMap();

  const main = document.getElementById('main');

  const prev = document.getElementById('prev');
  prev.addEventListener('click', async () => {
    const blocks = document.getElementsByClassName('date-block');
    let last;
    for (let block of blocks) {
      if (block.offsetTop >= window.scrollY) {
        window.scrollTo({
          top: last.offsetTop,
          left: window.scrollX,
          behavior: 'smooth',
        });
        break;
      }
      last = block;
    }
  });

  const next = document.getElementById('next');
  next.addEventListener('click', async () => {
    const blocks = document.getElementsByClassName('date-block');
    for (let block of blocks) {
      if (block.offsetTop > window.scrollY) {
        window.scrollTo({
          top: block.offsetTop,
          left: window.scrollX,
          behavior: 'smooth',
        });
        break;
      }
    }
  });

  const timeline = document.getElementById('timeline');
  let cancel = false;
  let queue = Promise.resolve();
  timeline.addEventListener('click', async (evt) => {
    const year = evt.target.dataset.year;
    const month = evt.target.dataset.month;
    if (year && month) {
      cancel = true;
      await queue;
      cancel = false;
      main.innerHTML = '';
      // eslint-disable-next-line no-async-promise-executor
      queue = new Promise(async (resolve) => {
        const monthly = data.map[year][month];
        for (let day in monthly) {
          const daily = monthly[day];
          const root = await daily.append(main);
          await append(
            root,
            getDOM(['<div class="tweets"><h3>Tweet</h3></div>'])
          );
          const tweets = root.getElementsByClassName('tweets')[0];
          for (let tweet of daily.tweets) {
            if (cancel) {
              resolve();
              return;
            }
            log('load data for ' + daily.date + ' tweet');
            tweets.append(
              getDOM([
                '<div class="tweet" style="order:',
                tweet.utime,
                '">',
                '<div class="time">',
                tweet.time,
                '</div>',
                '<div class="text">',
                tweet.full_text,
                '</div>',
                '<div class="media">',
                tweet.url.join(''),
                tweet.media.join(''),
                '</div>',
                '</div>',
              ])
            );
          }
          for (let gid in daily.dms) {
            const group = daily.dms[gid];
            const daily_gid = day + '-' + gid;
            await append(
              root,
              getDOM([
                '<div class="dms" id="',
                daily_gid,
                '"><h3>',
                group_map.get(gid),
                '</h3></div>',
              ])
            );
            const dms = document.getElementById(daily_gid);
            for (let dm of group.dms) {
              if (cancel) {
                resolve();
                return;
              }
              log('load data for ' + daily.date + ' dm');
              dms.append(
                getDOM([
                  '<div class="dm" style="order:',
                  dm.utime,
                  '">',
                  '<div>',
                  '<span class="name">',
                  user_map.get(dm.senderId),
                  '</span>',
                  '<span class="time">',
                  dm.date,
                  '</span>',
                  '</div>',
                  '<div class="text">',
                  dm.text,
                  '</div>',
                  '<div class="media">',
                  dm.url.join(''),
                  dm.media.join(''),
                  '</div>',
                  '</div>',
                ])
              );
            }
          }
        }
        log('');
        resolve();
      });
      await queue;
      //const links = document.getElementsByClassName('a');
      //for (let link of links) {
      // ToDo: media embedded for youtube and twitter
      //}
    }
  });

  setTimeout(async () => {
    for (let p in window.YTD.tweet) {
      const part = window.YTD.tweet[p];
      for (let item of part) {
        data.addTweet(item.tweet);
      }
    }
    for (let p in window.YTD.direct_messages_group) {
      const part = window.YTD.direct_messages_group[p];
      for (let item of part) {
        const conversationId = item.dmConversation.conversationId;
        for (let message of item.dmConversation.messages) {
          for (let action in message) {
            const body = message[action];
            body[action] = true;
            data.addDM(conversationId, body);
          }
        }
      }
    }

    log('sort data');
    data.sort(true);
    log('construct menu');
    for (let year in data.map) {
      let isFirst = true;
      for (let month in data.map[year]) {
        const order = year * 100 + Number(month);
        const mid = 'y' + year + 'm' + month;
        const prefix = isFirst ? year : '';
        await append(
          timeline,
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
    log('');
  }, 0);
});
