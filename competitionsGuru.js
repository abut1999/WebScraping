/* eslint-disable max-len */
const request = require('request-promise');
const cheerio = require('cheerio');
const jsdom = require('jsdom');

const { JSDOM } = jsdom;
const { window } = new JSDOM();
const { document } = (new JSDOM('')).window;
global.document = document;

const $ = require('jquery')(window);

const databaseController = require('./databaseController');

const url = 'https://www.guru.com/d/jobs/c/engineering-architecture/sc/architecture/';
const urlFix = 'https://www.guru.com/';
const projects = [];
let counter = 0;

const authSettings = {
  async: true,
  crossDomain: true,
  url: 'https://www.guru.com/api/v1/oauth/token/access',
  method: 'POST',
  headers: {},
  data: {
    refresh_token: '',
    client_id: '',
    grant_type: 'refresh_token',
  },
};

async function database() {
  databaseController.save('freelanceProjects', 'Guru', projects);
}

async function getMainPage() {
  const mainPageHtml = await request(url);
  return mainPageHtml;
}

async function getProjectLinks(mainLink) {
  const items = [];
  const loader = cheerio.load(mainLink);
  loader('div.record__header__identity').each((i, e) => {
    const getLink = cheerio.load(e);
    items.push(getLink('a').attr('href'));
  });
  return items;
}

async function getProjectIds(items) {
  const ids = [];
  for (let i = 0; i < items.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const loadUrl = await request(urlFix + items[i]);
    const load = cheerio.load(loadUrl);
    ids.push(load('span.resp--hidden-till-large--inline-block').text().replace(/\D/g, ''));
  }
  return ids;
}
async function getProjectCompanyID(ids) {
  for (let i = 0; i < ids.length; i += 1) {
    const project = {};
    // eslint-disable-next-line no-loop-func
    $.ajax(authSettings).done((response) => {
      const clientInfo = response;
      const jobSettings = {
        async: true,
        crossDomain: true,
        url: `https://www.guru.com/api/v1/jobs/${ids[i]}/summary`,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${clientInfo.access_token}`,
        },
      };
      $.ajax(jobSettings).done((matchedJobs) => {
        const personHiringID = (matchedJobs.Data.CompanyId);
        const employerSettings = {
          async: true,
          crossDomain: true,
          url: `https://www.guru.com/api/v1/employer/details/${personHiringID}/`,
          method: 'Get',
          headers: {
            Authorization: `Bearer ${clientInfo.access_token}`,
          },
        };
        $.ajax(employerSettings).done((employerInfo) => {
          project.JobTitle = matchedJobs.Data.JobTitle;
          if (matchedJobs.Data.Locations === null) {
            project.JobLocation = 'Unspecified';
          } else {
            project.JobLocation = matchedJobs.Data.Locations.Key;
          }
          project.JobDescription = matchedJobs.Data.JobDescription;
          project.ShortJobDescription = matchedJobs.Data.JobDescriptionShort;

          function convertUnixPostDate() {
            const unixtimestamp = matchedJobs.Data.DatePosted;
            const monthsArr = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const date = new Date(unixtimestamp * 1);
            const year = date.getFullYear();
            const month = monthsArr[date.getMonth()];
            const day = date.getDate();
            const hours = date.getHours();
            const minutes = `0${date.getMinutes()}`;
            const seconds = `0${date.getSeconds()}`;
            const datePosted = new Date(`${month}-${day}-${year} ${hours}:${minutes.substr(-2)}:${seconds.substr(-2)}`);
            return datePosted;
          }

          function converUnixExpiryDate() {
            const unixtimestamp = matchedJobs.Data.DateExpires;
            const monthsArr = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const date = new Date(unixtimestamp * 1);
            const year = date.getFullYear();
            const month = monthsArr[date.getMonth()];
            const day = date.getDate();
            const hours = date.getHours();
            const minutes = `0${date.getMinutes()}`;
            const seconds = `0${date.getSeconds()}`;
            const dateExpires = new Date(`${month}-${day}-${year} ${hours}:${minutes.substr(-2)}:${seconds.substr(-2)}`);
            return dateExpires;
          }

          project.DatePosted = convertUnixPostDate();
          project.DateExpires = converUnixExpiryDate();
          project.jobUrlToGuru = matchedJobs.Data.JobTinyUrl;
          project.JobCategory = matchedJobs.Data.ProjectSubCategory;
          project.CompanyId = employerInfo.CompanyID;
          project.Username = employerInfo.ScreenName;
          project.Country = employerInfo.Country;

          if (matchedJobs.Data.Budget.BudgetAmountShortDescription !== '') {
            project.ShortBudgetDescription = matchedJobs.Data.Budget.BudgetAmountShortDescription;
          }

          if (matchedJobs.Data.Budget.BudgetType === '1') {
            project.PaymentType = 'Fixed price';
            if (matchedJobs.Data.Budget.MinRate != null && matchedJobs.Data.Budget.MaxRate != null) {
              if (matchedJobs.Data.Budget.MinRate === 0) {
                project.Budget = `Under ${matchedJobs.Data.Budget.MaxRate}$`;
              } else if (matchedJobs.Data.Budget.MaxRate !== 0 && matchedJobs.Data.Budget.MinRate !== 0) {
                project.Budget = `Between ${matchedJobs.Data.Budget.MinRate}$ - ${matchedJobs.Data.Budget.MaxRate}$`;
              }
            } else if (matchedJobs.Data.Budget.BudgetType === '2') {
              project.PaymentType = 'Hourly rate';
              if (matchedJobs.Data.Budget.MinRate === 0) {
                project.Budget = `Under ${matchedJobs.Data.Budget.MaxRate}$`;
              } else if (matchedJobs.Data.Budget.MaxRate !== 0) {
                project.Budget = `Between ${matchedJobs.Data.Budget.MinRate}$ - ${matchedJobs.Data.Budget.MaxRate}$`;
              }
            } else if (matchedJobs.Data.Budget.BudgetType === '0') {
              project.PaymentType = 'Fixed price or hourly rate';
              if (matchedJobs.Data.Budget.MinRate === 0) {
                project.Budget = `${matchedJobs.Data.Budget.MaxRate}$`;
              } else if (matchedJobs.Data.Budget.MaxRate !== 0) {
                project.Budget = `${matchedJobs.Data.Budget.MinRate}$ - ${matchedJobs.Data.Budget.MaxRate}$`;
              }
            }
          }
          projects.push(project);
          counter += 1;
          if (counter === ids.length) {
            database();
          }
        });
      });
    });
  }
}

async function main() {
  const mainPage = await getMainPage();
  const projectLinks = await getProjectLinks(mainPage);
  const projectIds = await getProjectIds(projectLinks);
  await getProjectCompanyID(projectIds);
}

module.exports = main;