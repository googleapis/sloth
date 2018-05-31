const Mail = require('mail');
const client = new Mail.CloudMailClient();

var createDomainRequest = {
  parent: client.projectPath('yoshi-team'),
  domain: {
    domainName: 'yoshi.email-insights.net'
  }
};

client
    .createDomain(createDomainRequest)
    .then((res) => {
        const domain = res[0];
        console.log('Domain created.');
        console.log(`Domain Resource Name: ${domain.name}`);
        console.log(`Domain DKIM Key #1 Selector: ${domain.dkimKey1.selector}`);
        console.log(`Domain DKIM Key #1 CNAME: ${domain.dkimKey1.cnameValue}`);
        console.log(`Domain DKIM Key #2 Selector: ${domain.dkimKey2.selector}`);
        console.log(`Domain DKIM Key #2 CNAME: ${domain.dkimKey2.cnameValue}`);
    })
    .catch(err => {
        console.log('Error:', err);
    });
