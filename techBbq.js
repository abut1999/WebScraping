/* eslint-disable no-await-in-loop */
const request = require('request-promise');
const ObjectsToCsv = require('objects-to-csv');
const logger = require('../logger');

const techBBQ = {};
const origin = 'TechBBQ';

techBBQ.getPartners = async () => {
  const partnersJSON = [];
  const partners = [];
  for (let page = 1; page < 8; page += 1) {
    const url = `https://api.intros.at/1/container/2123/search?search=&sort=name&order=asc&type_id=1329&page=${page}`;
    const mainPageHtml = await request(url, {
      headers: {
        Accept: 'aapplication/json',
        Connection: 'keep-alive',
        Referer: 'https://matchmaking.grip.events/techbbq2019/app/home;type=0',
        'X-Authorization': '',
      },
      method: 'GET',
    });
    partnersJSON.push(JSON.parse(mainPageHtml));
  }
  for (let i = 0; i < partnersJSON.length; i += 1) {
    for (let b = 0; b < partnersJSON[i].data.length; b += 1) {
      const partnersInformation = {};
      partnersInformation['Company name'] = partnersJSON[i].data[b].company_name;
      partnersInformation.Location = partnersJSON[i].data[b].location;
      partnersInformation.Summary = partnersJSON[i].data[b].summary;
      partners.push(partnersInformation);
    }
  }
  return partners;
};

techBBQ.getSpeakers = async () => {
  const speakersJSON = [];
  const speakers = [];
  for (let page = 1; page < 17; page += 1) {
    const url = `https://api.intros.at/1/container/2123/search?search=&sort=name&order=asc&type_id=1328&page=${page}`;
    const mainPageHtml = await request(url, {
      headers: {
        Accept: 'aapplication/json',
        Connection: 'keep-alive',
        Referer: 'https://matchmaking.grip.events/techbbq2019/app/home;type=1',
        'X-Authorization': '',
      },
      method: 'GET',
    });
    speakersJSON.push(JSON.parse(mainPageHtml));
  }
  for (let i = 0; i < speakersJSON.length; i += 1) {
    for (let b = 0; b < speakersJSON[i].data.length; b += 1) {
      const speakersInformation = {};
      speakersInformation['Full name'] = speakersJSON[i].data[b].first_name;
      speakersInformation['Job title'] = speakersJSON[i].data[b].job_title;
      speakersInformation.Company = speakersJSON[i].data[b].company_name;
      speakersInformation['Primary Role'] = speakersJSON[i].data[b].headline;
      speakersInformation.Summary = speakersJSON[i].data[b].summary;
      speakers.push(speakersInformation);
    }
  }
  return speakers;
};

techBBQ.getInvestors = async () => {
  const investorsJSON = [];
  const investors = [];
  for (let page = 1; page < 10; page += 1) {
    const url = `https://api.intros.at/1/container/2123/search?search=&sort=name&order=asc&type_id=1307,1306&page=${page}`;
    const mainPageHtml = await request(url, {
      headers: {
        Accept: 'aapplication/json',
        Connection: 'keep-alive',
        Referer: 'https://matchmaking.grip.events/techbbq2019/app/home;type=2',
        'X-Authorization': '',
      },
      method: 'GET',
    });
    investorsJSON.push(JSON.parse(mainPageHtml));
  }
  for (let i = 0; i < investorsJSON.length; i += 1) {
    for (let b = 0; b < investorsJSON[i].data.length; b += 1) {
      const investorsInformation = {};
      investorsInformation.ID = investorsJSON[i].data[b].id;
      investorsInformation['Full Name'] = investorsJSON[i].data[b].name;
      investorsInformation['First Name'] = investorsJSON[i].data[b].first_name;
      investorsInformation['Last Name'] = investorsJSON[i].data[b].last_name;
      investorsInformation['Job Title'] = investorsJSON[i].data[b].headline;
      investorsInformation.Company = investorsJSON[i].data[b].company_name;
      investorsInformation.Country = investorsJSON[i].data[b].location;
      if (investorsJSON[i].data[b].job_industry !== null && typeof (investorsJSON[i].data[b].job_industry) !== 'string') {
        investorsInformation.Industry = (investorsJSON[i].data[b].job_industry).join(', ');
      } else {
        investorsInformation.Industry = investorsJSON[i].data[b].job_industry;
      }
      investorsInformation.Summary = investorsJSON[i].data[b].summary;
      investors.push(investorsInformation);
    }
  }
  for (let i = 0; i < investors.length; i += 1) {
    const investorEnrich = await request(`https://api.intros.at/1/container/2123/thing/${investors[i].ID}`, {
      headers: {
        Accept: 'aapplication/json',
        Connection: 'keep-alive',
        Referer: 'https://matchmaking.grip.events/techbbq2019/app/home;type=2',
        'X-Authorization': '',
      },
      method: 'GET',
    });
    const jsonInformation = JSON.parse(investorEnrich);
    if (jsonInformation.data.rtm_raw.looking_for !== undefined) {
      investors[i]['Looking For'] = (jsonInformation.data.rtm_raw.looking_for.value).join(', ');
      delete investors[i].ID;
    } else {
      investors[i]['Looking For'] = undefined;
      delete investors[i].ID;
    }
  }
  return investors;
};

techBBQ.saveToCSV = async (csvPartners, csvSpeakers, csvInvestors) => {
  const parnetsToCSV = new ObjectsToCsv(csvPartners);
  await parnetsToCSV.toDisk('./TechBBQ_Partners.csv');
  const speakersToCSV = new ObjectsToCsv(csvSpeakers);
  await speakersToCSV.toDisk('./TechBBQ_Speakers.csv');
  const investorsToCSV = new ObjectsToCsv(csvInvestors);
  await investorsToCSV.toDisk('./TechBBQ_Investors.csv');
};

techBBQ.main = async () => {
  logger.info('------------------------------------------------');
  logger.info(`Started scraping ${origin}`);

  logger.info('Getting partners');
  const partners = await techBBQ.getPartners();
  logger.info('Getting speakers');
  const speakers = await techBBQ.getSpeakers();
  logger.info('Getting investors');
  const investors = await techBBQ.getInvestors();
  logger.info('Saving to CSV');
  await techBBQ.saveToCSV(partners, speakers, investors);
  logger.info('Done');
};

module.exports = techBBQ;
