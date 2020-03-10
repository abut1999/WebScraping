const request = require('request-promise');
const cheerio = require('cheerio');
const databaseController = require('./databaseController');

const url = 'https://www.infodesigners.eu/architecture-competitions/1';
const urlFix = 'https://www.infodesigners.eu/';

const items = [];
const scrapeCounter = 0;
const projects = [];

async function GetMainProjectPage() {
  const mainPageHtml = await request(url);
  return mainPageHtml;
}

async function GetProjectLinks(link) {
  const $ = cheerio.load(link);
  $('div.tekst3').each((i, e) => {
    const loader = cheerio.load(e);
    items.push(loader('a').attr('href'));
  });
  return (items);
}

async function GetScrapedInfo(resolvedLinks) {
  for (let i = 0; i < items.length; i += 1) {
    const project = {};
    // eslint-disable-next-line no-await-in-loop
    const loadLink = await request(urlFix + resolvedLinks[i]);
    const $ = cheerio.load(loadLink);
    const imgLink = $("*[itemprop = 'image']").attr('src');
    const deadlineString = ($('div.de2 strong').text().replace('◷', ''));
    const deadline = new Date(deadlineString.split('/').reverse().join('/'));
    const currentDate = new Date();

    if (deadline >= currentDate) {
      project.deadline = deadline;
      project.title = $("*[itemprop = 'alternativeHeadline']").text();
      project.organizers = $("*[itemprop = 'sourceOrganization']").text().replace(/\s/g, '');
      project.website = $('div.texx p.tex a').attr('href');
      project.shortDescription = $("*[itemprop = 'abstract']").text();
      project.eligibility = (`<p>${$("*[itemprop = 'conditionsOfAccess']").html()}</p>`);
      project.prize = $("*[itemprop = 'award']").html();
      project.image = urlFix + imgLink;
      project.description = (`<p>${$("*[itemprop = 'text']").html()}</p>`);

      Object.keys(project).forEach((key) => {
        if (project[key] === undefined || project[key] === '') {
          delete project[key];
        }
      });
      projects.push(project);
    }
  }
  return (scrapeCounter);
}

async function main() {
  console.log('Started scraping from Infodesigners page\n');
  const mainProjectPage = await GetMainProjectPage();
  const returnedProjectLinks = await GetProjectLinks(mainProjectPage);
  await GetScrapedInfo(returnedProjectLinks);
  databaseController.save('competitions', 'competitionsInfoDesigners', projects);
}

module.exports = main;
