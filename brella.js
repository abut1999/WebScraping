/* eslint-disable no-await-in-loop */
/* eslint-disable import/no-extraneous-dependencies */
const request = require('request-promise');
const ObjectsToCsv = require('objects-to-csv');
const logger = require('../logger');

const brella = {};
const origin = 'brella';

brella.getMainPage = async () => {
  const url = 'https://api.brella.io/api/events/2675/attendees/matches?type=people&sort=match&offset=0&limit=1400';
  const mainPageHtml = await request(url, {
    headers: {
      Accept: 'application/vnd.brella.v3+json',
      Authorization: '',
      Connection: 'keep-alive',
      Referer: 'https://next.brella.io/events/presidents19',
    },
    method: 'GET',
  });
  return JSON.parse(mainPageHtml);
};

brella.getEachAttendeeInfo = async (jsonData) => {
  const attendeeInformations = [];
  for (let i = 0; i < jsonData.data.length; i += 1) {
    const attendeeInformation = {};
    attendeeInformation['First name'] = jsonData.data[i].attributes['first-name'];
    attendeeInformation['Last name'] = jsonData.data[i].attributes['last-name'];
    attendeeInformation.Email = jsonData.data[i].attributes.email;
    attendeeInformation.Company = jsonData.data[i].attributes['company-name'];
    attendeeInformation['Company title'] = jsonData.data[i].attributes['company-title'];
    attendeeInformation.Website = jsonData.data[i].attributes.website;
    attendeeInformation.Twitter = jsonData.data[i].attributes.twitter;
    attendeeInformation.Linkedin = jsonData.data[i].attributes.linkedin;
    attendeeInformation.Pitch = jsonData.data[i].attributes.pitch;
    attendeeInformation.ID = jsonData.data[i].id;
    attendeeInformations.push(attendeeInformation);
  }
  return attendeeInformations;
};

brella.enrichEachAttendeeInfo = async (gatheredInformation) => {
  const baseUrl = 'https://api.brella.io/api/me/attendees/';
  for (let i = 0; i < gatheredInformation.length; i += 1) {
    const attendeeEnrichedJson = await request(baseUrl + gatheredInformation[i].ID, {
      headers: {
        Accept: 'application/vnd.brella.v3+json',
        Authorization: '',
        Connection: 'keep-alive',
        Referer: 'https://next.brella.io/events/presidents19',
      },
      method: 'GET',
    });
    const jsonInformation = JSON.parse(attendeeEnrichedJson);
    for (let b = 0; b < jsonInformation.included.length; b += 1) {
      gatheredInformation[i].interests = [];
      if (jsonInformation.included[b].attributes !== undefined) {
        gatheredInformation[i].interests.push(jsonInformation.included[b].attributes.name);
      }
    }
  }
  return gatheredInformation;
};

brella.saveToCSV = async (csvData) => {
  const csv = new ObjectsToCsv(csvData);
  await csv.toDisk('./Brella_Attendees.csv');
};

brella.main = async () => {
  logger.info('------------------------------------------------');
  logger.info(`Started scraping ${origin}`);

  logger.info('Getting main page');
  const mainCompetitionsPage = await brella.getMainPage();
  logger.info('Getting attendee information');
  const attendeeInformation = await brella.getEachAttendeeInfo(mainCompetitionsPage);
  logger.info('Enriching ettendee information');
  const enrichedInformation = await brella.enrichEachAttendeeInfo(attendeeInformation);
  logger.info('Saving to CSV');
  await brella.saveToCSV(enrichedInformation);

  logger.info('Done');
};

module.exports = brella;
