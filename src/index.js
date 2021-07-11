import 'modern-css-reset';
import './index.css';
import { getDOM, append, appendSync } from './dom-utils.js';
import { TwitterArchive } from './tiwtter-archives.js';

document.addEventListener('DOMContentLoaded', async () => {
  const stats = document.getElementById('stats');
  const ta = new TwitterArchive((message) => {
    setTimeout(() => {
      stats.innerHTML = message;
    }, 0);
  });

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

  const main = document.getElementById('main');
  const timeline = document.getElementById('timeline');
  document.addEventListener('mousemove', (evt) => {
    const range = timeline.clientHeight - document.documentElement.clientHeight;
    const pos_rate = evt.clientY / document.documentElement.clientHeight;
    const pos = range * pos_rate;
    const top = timeline.offsetTop - (timeline.offsetTop + pos) / 10;
    timeline.style.top = top + 'px';
  });
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
        const monthly = ta.data.map[year][month];
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
            ta.log('load data for ' + daily.date + ' tweet');
            appendSync(
              tweets,
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
                ta.groups.get(gid),
                '</h3></div>',
              ])
            );
            const dms = document.getElementById(daily_gid);
            for (let dm of group.dms) {
              if (cancel) {
                resolve();
                return;
              }
              ta.log('load data for ' + daily.date + ' dm');
              appendSync(
                dms,
                getDOM([
                  '<div class="dm" style="order:',
                  dm.utime,
                  '">',
                  '<div>',
                  '<span class="name">',
                  ta.users.get(dm.senderId),
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
        ta.log('');
        resolve();
      });
      await queue;
      //const links = document.getElementsByClassName('a');
      //for (let link of links) {
      // ToDo: media embedded for youtube and twitter
      //}
    }
  });
  await ta.load(window.YTD);
  await ta.appendMenu(timeline);
  ta.log('');
});
