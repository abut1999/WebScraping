/* eslint-disable no-await-in-loop */
/* eslint-disable import/no-extraneous-dependencies */
const request = require('request-promise');
const cheerio = require('cheerio');
const logger = require('../logger');

const arkitektforeningen = {};
const origin = 'arkitektforeningen';

function dateConverter(string) {
  const dateParts = string.split('.');
  const date = new Date(+dateParts[2], dateParts[1] - 1, +dateParts[0]);
  return date;
}

arkitektforeningen.getMainPage = async () => {
  const url = 'https://arkitektforeningen.dk/arkitektforeningen-tilbyder/konkurrencer/';
  const mainPageHtml = await request(url);
  return mainPageHtml;
};

arkitektforeningen.getCompetitionLinks = async (mainPage) => {
  const competitionsLinks = [];
  const $ = cheerio.load(mainPage);
  $('.row.populated-columns.list-news').first().find('.col-24.col-lg-8.items').each((_i, e) => {
    const eachDiv = cheerio.load(e);
    competitionsLinks.push(eachDiv('a').attr('href'));
  });
  return competitionsLinks;
};

arkitektforeningen.getCompetitionsInfo = async (resolvedLinks) => {
  const projects = [];
  for (let i = 0; i < resolvedLinks.length; i += 1) {
    const project = {};
    const requestCompetitionLink = await request(resolvedLinks[i]);
    const $ = cheerio.load(requestCompetitionLink);
    const title = $('.content-box').first().find('h1').text();
    const dateString = $('.short-post .date').text() + 20;
    const date = dateConverter(dateString);
    const shortDescription = $('.content-box').first().find('p').text();
    // eslint-disable-next-line newline-per-chained-call
    const img = $('.module-image.is-block-item').first().find('.container .row .col-24').find('picture').find('img').attr('src');
    let description = '';
    $('.wrap-text-editor.is-block-item').each((_i, e) => {
      const eachTextBlock = cheerio.load(e);
      description += eachTextBlock.html().replace('<div class="wrap-text-editor is-block-item">', '').replace('</div>', '');
    });
    project.title = title;
    project.date = date;
    project.shortDescription = shortDescription;
    project.image = img;
    project.description = description;
    project.origin = origin;
    projects.push(project);
  }
  return projects;
};

arkitektforeningen.main = async () => {
  logger.info('------------------------------------------------');
  logger.info(`Started scraping ${origin}`);

  logger.info('Getting main page');
  const mainCompetitionsPage = await arkitektforeningen.getMainPage();
  logger.info('Getting project links');
  const competitionLinks = await arkitektforeningen.getCompetitionLinks(mainCompetitionsPage);
  logger.info('Getting information');
  const projectsInfo = await arkitektforeningen.getCompetitionsInfo(competitionLinks);

  logger.info(`Done scraping ${origin}`);
  return projectsInfo;
};

module.exports = arkitektforeningen;
