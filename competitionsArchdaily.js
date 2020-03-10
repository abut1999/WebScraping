/* eslint-disable func-names */
/* eslint-disable no-extend-native */
/* eslint-disable no-self-compare */
const request = require('request-promise');
const cheerio = require('cheerio');
const databaseController = require('./databaseController');

const url = 'https://www.archdaily.com/search/competitions?page=';
const urlFix = 'https://www.archdaily.com';

let page = 1;
let items = [];
let invalidCounter = 0;
let scrapeCounter = 0;
const projects = [];

async function GetMainProjectPage() {
  const mainPageHtml = await request(url + page);
  return mainPageHtml;
}

async function GetProjectLinks(link) {
  const $ = cheerio.load(link);
  $('li.afd-search-list__item').each((i, e) => {
    const img = cheerio.load(e);
    items.push(img('a.afd-search-list__link').attr('href'));
  });
  return (items);
}

async function GetScrapedInfo(resolvedLinks) {
  for (let i = 0; i < 24; i += 1) {
    const project = {};
    let count = 0;
    let descriptions = [];
    // eslint-disable-next-line no-await-in-loop
    const loadLink = await request(urlFix + resolvedLinks[i]);
    const $ = cheerio.load(loadLink);
    let data = {};
    const imgLink = $('article.afd-post-content a.js-image-size__link img').attr('src');
    $('article.afd-post-content p').each((x, e) => {
      const paragraph = cheerio.load(e);
      const description = paragraph('p').text();
      const key = 'Description';
      data[key + [x]] = description;
      count += 1;
    });
    for (let b = 0; b < count; b += 1) {
      descriptions.push(data[`Description${[b]}`]);
    }
    // eslint-disable-next-line no-unused-vars
    descriptions = descriptions.map((val, c) => (val === '' ? '\n' : val));
    const descriptionText = descriptions.join();

    $('li.afd-char-item').each((x, e) => {
      const info = cheerio.load(e);
      const value = info('div.afd-char-text').text().replace('\n', '').replace('\n', '');
      const keys = info('h3.afd-char-title').text().replace('\n', '').replace('\n', '');
      data[keys] = value;
    });
    Date.prototype.isValid = function () {
      return this.getTime() === this.getTime();
    };
    const currentDate = new Date();
    const registration = new Date(data['Registration Deadline']);
    if (registration.isValid()) {
      if (registration >= currentDate) {
        const submission = new Date(data['Submission Deadline']);
        project.registration = registration;
        project.submission = submission;
        project.title = data.Title;
        project.organizers = data.Organizers;
        project.type = data.Type;
        project.website = data.Website;
        project.image = urlFix + imgLink;
        project.location = data.Venue;
        project.price = data.Price;
        project.description = descriptionText;

        Object.keys(project).forEach((key) => {
          if (project[key] === undefined) {
            delete project[key];
          }
        });
        projects.push(project);
        invalidCounter = 0;
        scrapeCounter += 1;
      } else if (registration < currentDate) {
        invalidCounter += 1;
      }
    } else {
      const submission = new Date(data['Submission Deadline']);
      if (submission >= currentDate) {
        project.registration = data.Registration;
        project.submission = submission;
        project.title = data.Title;
        project.organizers = data.Organizers;
        project.type = data.Type;
        project.website = data.Website;
        project.image = imgLink;
        project.location = data.Venue;
        project.price = data.Price;
        project.description = descriptionText;

        Object.keys(project).forEach((key) => {
          if (project[key] === undefined) {
            delete project[key];
          }
        });
        projects.push(project);
        invalidCounter = 0;
        scrapeCounter += 1;
      } else if (submission < currentDate) {
        invalidCounter += 1;
      }
    }
    data = [];
  }
  page += 1;
  return (scrapeCounter);
}

async function main() {
  console.log('Started scraping from ArchDaily page', page);
  const mainProjectPage = await GetMainProjectPage();
  const returnedProjectLinks = await GetProjectLinks(mainProjectPage);
  await GetScrapedInfo(returnedProjectLinks);
  if (invalidCounter < 24) {
    items = [];
    main();
  } else if (invalidCounter > 24) {
    databaseController.save('competitions', 'competitionsArchdaily', projects);
  }
}

module.exports = main;
