/* eslint-disable no-await-in-loop */
const request = require('request-promise');
const cheerio = require('cheerio');
const ObjectsToCsv = require('objects-to-csv');

let page = 1;
const projects = [];

async function getMainArchitectsPage() {
  const options = {
    method: 'GET',
    uri: `https://www.houzz.com/professionals/searchDirectory?location=Denmark&topicId=11784&p=${page}`,
    headers: {
      Cookie: '',
    },
  };
  const mainPage = await request(options);
  return mainPage;
}

async function getArchitectsLinks(link) {
  const items = [];
  const $ = cheerio.load(link);
  $('div.hz-pro-search-result').each((_i, e) => {
    const eachLink = cheerio.load(e);
    items.push(eachLink('a').attr('href'));
  });
  return items;
}

async function GetArchitectsInfo(items) {
  for (let i = 0; i < items.length; i += 1) {
    const project = {};
    const requestOptions = {
      method: 'GET',
      uri: `${items[i]}`,
      headers: {
        Cookie: '',
      },
    };
    const architectPage = await request(requestOptions);
    const $ = cheerio.load(architectPage);
    project.Name = $('div.hz-profile-header__title').text();
    project.Phone = $('div.hz-profile-header__contact-info').text().replace('Website', '');
    project.Website = $('div.hz-profile-header__contact-info a:nth-child(2)').attr('href');
    const CVR = ($('div.profile-meta__content span.profile-meta__block').text().replace(/[^0-9]/g, ''));
    if (CVR.length !== 8) {
      project.CVR = '';
    } else {
      project.CVR = CVR;
    }
    project.ContactInfo = $('div.profile-meta__val').html().replace('<br><span>', ' ').replace('<br>', ' ')
      .replace('<br>', ' ')
      .replace('<br>', ' ')
      .replace('</span>', ' ')
      .replace('&#xE6;', 'ae')
      .replace('&#xE9;', 'e')
      .replace('&#xC5;', 'A')
      .replace('&#xF8;', 'o')
      .replace('&#xF8;', 'o');
    projects.push(project);
  }
  page += 14;
}

async function saveToCSV() {
  const csv = new ObjectsToCsv(projects);
  await csv.toDisk('./Architects.csv');
  console.log('Saved CSV file');
}

async function main() {
  const mainPage = await getMainArchitectsPage();
  const links = await getArchitectsLinks(mainPage);
  await GetArchitectsInfo(links);
  if (page < 767) {
    console.log(projects);
    console.log(page);
    main();
  } else if (page > 767) {
    await saveToCSV();
  }
}

module.exports = main;