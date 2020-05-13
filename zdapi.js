/* Requirements & Empty Arrays */
const https = require('https');
const csv = require('csv-parser');
const fs = require('fs');
const curl = require('curl');
const config = require('./config.json');
const request = require('request');
let uploadData = [];
let exportData = [];
let count = 0;

const createCsvWriter = require('csv-writer').createObjectCsvWriter;

function PullTicketNumbers() {
  /* Import Ticket numbers from CSV*/
  fs.createReadStream('data.csv')
    .pipe(csv(['id', 'type']))
    .on('data', (data) => uploadData.push(data))
    .on('end', () => {
      for (var i = 0; i < uploadData.length; i++) {
        var url =
          'https://' +
          config.subDomain +
          '.zendesk.com/api/v2/tickets/' +
          uploadData[i].id.trimStart() +
          '.json?include=users';

        var options = {
          headers: {
            Authorization: config.authorization,
          },
        };

        request(url, options, function (err, res, body) {
          // Parse the JSON out to something useable
          let data = JSON.parse(body);

          //set global variables
          let ticketData = data.ticket;

          let customFields = ticketData.fields;
          let userData = data.users;
          let dateCreated = ticketData.created_at;
          let ticketNumber = ticketData.id;

          // set variables for custom fields
          let businessUnit = customFields[47].value;
          let jobCharged = customFields[105].value;
          let jobNumber = customFields[104].value;
          let recipientName = customFields[34].value;

          // pull submitter name from userData using submitter ID
          let submitter = ticketData.submitter_id;
          let submitterName = [];
          for (var i = 0; i < userData.length; i++) {
            if (userData[i].id === submitter) {
              submitterName.push(userData[i].name);
            } else {
            }
          }

          // set friendly text for job charged
          if (customFields[105].value == 'no_bucharged') {
            jobCharged = 'No, Business Unit Charged';
          } else if (customFields[105].value == 'yes_jobcharged') {
            jobCharged = 'Yes, Job charged';
          } else {
            jobCharged = 'N/A';
          }

          // sets n/a if no job number provided/applicable
          if (
            customFields[104].value == null ||
            customFields[104].value == undefined
          ) {
            jobNumber = 'N/A';
          } else {
            jobNumber = customFields[104].value;
          }

          // create the csvWriter
          const csvWriter = createCsvWriter({
            path: './export.csv',
            header: [
              { id: 'ticketNumber', title: 'Ticket Number' },
              { id: 'dateCreated', title: 'Date Ticket Created' },
              { id: 'businessUnit', title: 'Business Unit' },
              { id: 'jobCharged', title: 'Job Charged?' },
              { id: 'jobNumber', title: 'Job Number' },
              { id: 'recipientName', title: 'Recipient Name' },
              { id: 'submitterName', title: 'Submitter' },
            ],
          });

          // store the data about each ticket and then push to the object.
          var dataToPush = {
            ticketNumber: ticketNumber,
            dateCreated: dateCreated,
            businessUnit: businessUnit,
            jobCharged: jobCharged,
            jobNumber: jobNumber,
            recipientName: recipientName,
            submitterName: submitterName[0],
          };
          exportData.push(dataToPush);

          //generate the csv.
          csvWriter.writeRecords(exportData).then(() => {
            count++;
            console.log(count + '. Ticket #' + ticketNumber + ' added');
          });
        });
      }
    });
}

PullTicketNumbers();
