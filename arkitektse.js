/* eslint-disable no-await-in-loop */
/* eslint-disable import/no-extraneous-dependencies */
const request = require('request-promise');
const cheerio = require('cheerio');
const logger = require('../logger');

const arkitektse = {};
const origin = 'arkitektse';

arkitektse.getMainPage = async () => {
  const url = 'https://www.arkitekt.se/tavlingar/';
  const mainPageHtml = await request(url);
  return mainPageHtml;
};

arkitektse.getCompetitionLinks = async (mainPage) => {
  const competitionsLinks = [];
  const $ = cheerio.load(mainPage);
  $('.innex-box').next().find('.inner-box').each((_i, e) => {
    const eachDiv = cheerio.load(e);
    competitionsLinks.push(eachDiv('a').attr('href'));
  });
  return Array.from(new Set(competitionsLinks));
};


arkitektse.main = async () => {
  logger.info('------------------------------------------------');
  logger.info(`Started scraping ${origin}`);

  logger.info('Getting main page');
  const mainCompetitionsPage = await arkitektse.getMainPage();
  logger.info('Getting project links');
  const competitionLinks = await arkitektse.getCompetitionLinks(mainCompetitionsPage);
  logger.info('Getting information');
  console.log(competitionLinks)

  logger.info(`Done scraping ${origin}`);
};

module.exports = arkitektse;
