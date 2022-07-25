// Automation 1 is used to scrap website from company job portals and create subcorpora in sketch engine with them
const request = require('sync-request');
const cheerio = require('cheerio');
const xlsx = require('xlsx');
const fs = require('fs');

// Load JSON configs into the automation
const automation_configs = require('./automation_configs.json'); 
var companies = automation_configs.companies;

// Loop through companies and scrap all websites from their job portal
for (let company of companies) {

  // Load in already scrapped urls
  let existing_urls = [];
  let workbook = xlsx.readFile("./used_urls.xlsx");
  let address_of_cell = "URL";
  let worksheet = workbook.Sheets[company.name];
  let columnName = Object.keys(worksheet).find(key=> worksheet[key].v === address_of_cell);

  for (let key in worksheet) {
    if (key.toString()[0] === columnName[0]) {
      existing_urls.push(worksheet[key].v);
    }
  }

  // Remove column identifier from array
  existing_urls.shift();

  // Don't get all urls as we only want to test for now
  let restriction = 30; 
  let top = 50;
  var scrapped_websites = [];

  // Get urls from job posting website
  for (let i = 0; i < restriction; i++) {

    // Create the url to scrap all job postings from website
    let curr_url = company.website;
    curr_url = curr_url.replace("COUNTER", (company.website_counter_start + company.website_search_increment * i).toString());

    
    scrap_urls(curr_url, scrapped_websites, company.job_posting_url_identifier, existing_urls)
    if (scrapped_websites.length > top) {
      break;
    }
  }
  console.log(scrapped_websites);

  // Depending on company make final edits to scrapped urls
  let final_website_list = [];

  switch(company.name) {
    case "SAP":
      
      scrapped_websites.shift();
      for (let url of scrapped_websites) {

        let temp_url = "https://jobs.sap.com" + url;
        final_website_list.push(temp_url);
      }

      break;

    case "Apple":

      for (let url of scrapped_websites) {

        let temp_url = "https://jobs.apple.com" + url;
        final_website_list.push(temp_url);
      }

      break;

    default:
      final_website_list = scrapped_websites;
  } 

  // Create string to write to text file for Sketch Engine
  let website_string = ""
  for (let url of final_website_list) {
    website_string += url + " ";
  }
  // Write data to text file for copy-pasting into Sketch Engine
  let today = new Date();
  today = today.toISOString().substring(0, 7);
  let file_path = "./sketch_engine_urls/" + company.name + "/" + today + ".txt";
  fs.writeFileSync(file_path, website_string);

  // Append used urls to excel to ignore next time (make sure to use unedited urls)
  let excel_list = [];
  for (let url of scrapped_websites) {
    let temp_array = [url];
    excel_list.push(temp_array); 
  }
  console.log(excel_list);

  xlsx.utils.sheet_add_aoa(worksheet, excel_list, { origin: -1 });
  xlsx.writeFile(workbook, "./used_urls.xlsx");
}

// Function to scrap urls from provided url and add them to a list
function scrap_urls(url, website_array, jobposting_identifier, existing_urls) {

  // Get body of web page
  var res = request('GET', url);
  var body = res.getBody();

  $ = cheerio.load(body);

  links = $('a');
  $(links).each(function(i, link){

    var href = $(link).attr('href');
    // Check that the url is defined
    if (!(typeof(href) === 'undefined')) {
      console.log(href);
      // Check that the url is a jobposting
      if (href.includes(jobposting_identifier)) {

        // Check that the url is new 
        if (!(website_array.includes(href)) && !(existing_urls.includes(href))) {

          website_array.push(href);
        }
      }
    }
  });
}