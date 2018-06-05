const Mail = require('mail');

const projectId = 'yoshi-team';
const region = 'us-central1';
const keyFilename = './keys.json';
const domainName = 'yoshi.email-insights.net';

const client = new Mail.CloudMailClient({ keyFilename, projectId });
const projectPath = client.projectPath(projectId);

async function createDomain() {
  const createDomainRequest = {
    parent: projectPath,
    region,
    domain: { domainName }
  };
  const res = await client.createDomain(createDomainRequest);
  console.log(res[0]);
}
// regions/us-central1/domains/6740021587999437418

async function createAddressSet() {
  const domainId = 'regions/us-central1/domains/6740021587999437418'
  const addressSetId = 'some-address-set-id';
  const addressPatterns = ['sloth'];
  const addressSetRequest = {
      parent: domainId,
      addressSetId,
      addressSet: { addressPatterns }
  };
  const res = await client.createAddressSet(addressSetRequest);
  const addressSet = res[0];
  console.log('Address set created.');
  console.log(`Address set ID: ${addressSet.name}`);
}
// regions/us-central1/domains/6740021587999437418/addressSets/some-address-set-id

async function createSender() {
  const senderId = 'some-sender-id-6';
  const addressSetId = 'regions/us-central1/domains/6740021587999437418/addressSets/some-address-set-id';
  const senderRequest = {
    parent: projectPath,
    senderId: senderId,
    region,
    sender: {
      addressSets: [ addressSetId ],
      defaultEnvelopeFromAuthority: addressSetId,
      defaultHeaderFromAuthority: addressSetId
    }
  };
  const res = await client.createSender(senderRequest);
  const sender = res[0];
  console.log('Sender created.');
  console.log(`Sender ID: ${sender.name}`);
}
// projects/yoshi-team/regions/us-central1/senders/some-sender-id-6

async function sendMessage() {
  const senderId = 'projects/yoshi-team/regions/us-central1/senders/some-sender-id-6';
  const fromAddress = `sloth@${domainName}`;
  const toAddress = 'beckwith@google.com';
  const subject = 'Hello from the Sloth mailer!';
  const textBody = 'This is 🔥';
  const authority = `projects/${projectId}/regions/${region}/emailVerifiedAddresses/sloth@${domainName}`;
  const sendSimpleMessageRequest = {
    sender: senderId,
    envelopeFromAddress: fromAddress,
    simpleMessage: {
      from: {
        addressSpec: fromAddress,
      },
      to: [{
        addressSpec: toAddress,
      }],
      subject: subject,
      textBody: textBody
    }
  };
  const res = await client.sendMessage(sendSimpleMessageRequest);
  const sendSimpleMessageResponse = res[0];
  console.log('Message sent.');
  console.log(sendSimpleMessageResponse);
}

const args = process.argv.slice(2);
if (!args[0]) {
  throw new Error('Please pass a function to run.');
} else {
  const fn = eval(args[0]);
  fn().catch(console.error);
}
