/* eslint-disable no-await-in-loop */
const request = require('request-promise');
const cheerio = require('cheerio');
const databaseController = require('./databaseController');

let page = 1;
const projects = [];

async function getMainProjectPage() {
  const options = {
    method: 'GET',
    uri: `https://www.arcbazar.com/competitions?page=${page}`,
    headers: {
      Cookie: '',
    },
  };
  const mainPage = await request(options);
  return mainPage;
}

async function getProjectsLinks(link) {
  const items = [];
  const $ = cheerio.load(link);
  $('div.projects div.item div.action').each((_i, e) => {
    const eachLink = cheerio.load(e);
    items.push(eachLink('a').attr('href'));
  });
  return items;
}

async function getProjectsInfo(items) {
  for (let i = 0; i < items.length; i += 1) {
    const project = {};
    const requestOptions = {
      method: 'GET',
      uri: `https://www.arcbazar.com${items[i]}`,
      headers: {
        Cookie: '',
      },
    };
    const projectPage = await request(requestOptions);
    const $ = cheerio.load(projectPage);
    const dates = [];
    $('div.DeadlineDate').each((_i, e) => {
      const eachDate = cheerio.load(e);
      dates.push(eachDate.text());
    });
    project.Title = $('h1.project-title').text();
    project.Deadline = new Date(dates[0].replace('pm', '').replace('EST', ''));
    project.ResultsAnnouncement = new Date(dates[1].replace('pm', '').replace('EST', ''));
    project.Description = $('div.translate-block').text();
    project.Deliverable_Details = $('ul.Deliverables').text();
    project.Price = $('div.price').text().replace('\n', '');
    const requestOptionsFiles = {
      method: 'GET',
      uri: `https://www.arcbazar.com${items[i].replace('info', 'files')}`,
      headers: {
        Cookie: '',
      },
    };
    const projectFiles = await request(requestOptionsFiles);
    const $$ = cheerio.load(projectFiles);
    project.Images = [];
    project.OtherAttachements = [];
    project.InspirationPictures = [];

    $$('div.ProjectImageView a').each((_i, e) => {
      const eachImage = cheerio.load(e);
      if ((eachImage('a').attr('title')).replace(/<a.*Original/, '').replace('</a>', '') !== ' ') {
        project.Images.push({ title: (eachImage('a').attr('title')).replace(/<a.*Original/, '').replace('</a>', ''), url: (eachImage('img').attr('src')) });
      } else {
        project.Images.push({ url: (eachImage('img').attr('src')) });
      }
    });
    $$('div.OtherFiles div.File').each((_i, e) => {
      const eachFile = cheerio.load(e);
      if ((eachFile('div.Caption').text()) !== '') {
        project.OtherAttachements.push({ fileName: (eachFile('div.Caption').text()), url: (eachFile('div.File a').attr('href')) });
      } else {
        project.OtherAttachements.push({ url: (eachFile('div.File a').attr('href')) });
      }
    });
    $$('div.padding-mobie a').each((_i, e) => {
      const eachImage = cheerio.load(e);
      if ((eachImage('a').attr('title')) !== undefined && (eachImage('a').attr('title')) !== '') {
        project.InspirationPictures.push({ title: (eachImage('a').attr('title')), url: (eachImage('img').attr('src')) });
      } else if ((eachImage('img').attr('src')) !== undefined) {
        project.InspirationPictures.push({ url: (eachImage('img').attr('src')) });
      }
    });
    if (project.Images.length === 0) {
      delete project.Images;
    }
    if (project.OtherAttachements.length === 0) {
      delete project.OtherAttachements;
    }
    if (project.InspirationPictures.length === 0) {
      delete project.InspirationPictures;
    }
    projects.push(project);
  }
  page += 1;
}

async function main() {
  const mainPage = await getMainProjectPage();
  const links = await getProjectsLinks(mainPage);
  await getProjectsInfo(links);
  if (page <= 2) {
    main();
  } else if (page >= 3) {
    databaseController.save('freelanceProjects', 'competitionsArcbazar', projects);
  }
}

module.exports = main;
