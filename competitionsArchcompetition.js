const request = require('request-promise');
const cheerio = require('cheerio');
const databaseController = require('./databaseController');

const url = 'http://archcompetition.net/category/competitions/page/';

let page = 1;
let items = [];
let invalidCounter = 0;
const scrapeCounter = 0;
const projects = [];

async function GetMainProjectPage() {
  const mainPageHtml = await request(url + page);
  return mainPageHtml;
}

async function GetProjectLinks(link) {
  let $ = cheerio.load(link);
  $('article.item').each((i, e) => {
    $ = cheerio.load(e);
    const iItems = {};
    $('div.item-content u').each((a, item) => {
      if (item.nextSibling && item.nextSibling.type === 'text') {
        const info = item.nextSibling.data;
        const keys = $(item).text();
        iItems[keys] = info;
      }
    });
    const currentDate = new Date();
    const registrationDate = (iItems.Register);
    if (registrationDate !== undefined) {
      const newDate = new Date(registrationDate.replace(':', '').replace(',', '').replace(/\s+/g, ''));
      if (newDate >= currentDate) {
        items.push(($('h2.grid-title a').attr('href')));
        invalidCounter = 0;
      } else {
        invalidCounter += 1;
      }
    }
  });
  return (items);
}

async function GetScrapedInfo(resolvedLinks) {
  for (let i = 0; i < resolvedLinks.length; i += 1) {
    const project = {};
    // eslint-disable-next-line no-await-in-loop
    const loadLink = await request(resolvedLinks[i]);
    const $ = cheerio.load(loadLink);
    const imgLink = $('div.post-image img').attr('src');
    const title = $('h1.post-title').text();
    const information = {};
    $('div.inner-post-entry u').each((a, item) => {
      if (item.nextSibling && item.nextSibling.type === 'text') {
        const datas = item.nextSibling.data;
        const key = $(item).text();
        information[key] = datas;
      }
    });
    project.title = title;
    project.registration = new Date(information.Register.replace(':', '').replace(',', '').replace(/\s+/g, ''));
    project.submission = new Date(information.Submit.replace(':', '').replace(',', '').replace(/\s+/g, ''));
    project.eligibility = information.Eligibility.replace(':', '').trim();
    project.price = information.Fee.replace(':', '').trim();
    project.prize = information.Awards.replace(':', '').trim();
    project.image = imgLink;
    $('em').remove();
    $('div.post-tags').remove();
    const rearranged = $('div.inner-post-entry').html();
    project.description = rearranged;
    projects.push(project);
  }
  page += 1;
  return (scrapeCounter);
}

async function main() {
  process.stdout.write('Started scraping from ArchDaily page', page, '\n');
  const mainProjectPage = await GetMainProjectPage();
  const returnedProjectLinks = await GetProjectLinks(mainProjectPage);
  await GetScrapedInfo(returnedProjectLinks);
  if (invalidCounter < 14) {
    items = [];
    main();
  } else if (invalidCounter > 14) {
    databaseController.save('competitions', 'competitionsArchcompetition', projects);
  }
}
module.exports = main;
