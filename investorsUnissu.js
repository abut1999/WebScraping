/* eslint-disable no-await-in-loop */
const request = require('request-promise');
const ObjectsToCsv = require('objects-to-csv');

const projects = [];

async function getInvestorCount() {
  const investorsCount = await request('https://api.unissu.com/vendors/investors/list/').json();
  const investorsAmount = investorsCount.count;
  return investorsAmount;
}

async function getInvestors(count) {
  const apiListRequest = await request(`https://api.unissu.com/vendors/investors/list/?limit=${count}`).json();
  return apiListRequest;
}

async function getInvestorsInfo(list) {
  for (let i = 0; i < list.count; i += 1) {
    const project = {};
    await new Promise((resolve) => setTimeout(resolve, 10000));
    const investorInfo = await request(`https://api.unissu.com/vendors/investors/${list.results[i].slug}`).json();
    project.InvestorName = investorInfo.name;
    project.InvestorType = investorInfo.type.replace(/_/g, ' ');
    project.Logo = investorInfo.logo;
    project.InvestorTwitter = investorInfo.twitter_url;
    project.InvestorFacebook = investorInfo.facebook_url;
    project.InvestorRegion = investorInfo.region;
    project.investorCity = investorInfo.city;
    project.InvestorWebsite = investorInfo.domain;
    projects.push(project);
    console.log(i);
  }
}
async function saveToCSV() {
  const csv = new ObjectsToCsv(projects);
  await csv.toDisk('./test.csv');
}

async function main() {
  const countInvestors = await getInvestorCount();
  const investors = await getInvestors(countInvestors);
  await getInvestorsInfo(investors);
  await saveToCSV();
  console.log('Completed');
}

main();
