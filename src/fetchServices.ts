#!/usr/bin/env node

// Copyright 2021 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as google from '@googleapis/sheets';
import {ServiceManagerClient, protos} from '@google-cloud/service-management';
import * as Throttle from 'p-throttle';
import * as meow from 'meow';
import Table = require('cli-table');
import {allow, deny} from './services.json';
import * as CSV from 'csv-string';

const auth = new google.auth.GoogleAuth({
  scopes: [
    'https://www.googleapis.com/auth/cloud-platform',
    'https://www.googleapis.com/auth/spreadsheets',
  ],
});
const servicemanagement = new ServiceManagerClient();
const sheets = google.sheets({
  version: 'v4',
  auth: auth,
});
const spreadsheetId = '14JYzl_8W3HyD0c1jYDXQJA2sVWBZiMoxT8Sp57xGWvk';

/**
 * Make a call to the Google Cloud Service Management API's services.list endpoint
 * @return an array of hostnames ('foo.googleapis.com') for all available services
 */
export async function getAllServiceNames(): Promise<string[]> {
  const serviceNames: string[] = [];
  for await (const service of servicemanagement.listServicesAsync()) {
    if (service.serviceName) {
      serviceNames.push(service.serviceName);
    }
  }
  return serviceNames;
}

/**
 * Make a call to the Google Cloud Service Management API's services.getConfig endpoint
 * @param serviceName - the hostname of a service ('foo.googleapis.com')
 * @return the service config of the passed hostname
 */
export async function getServiceConfig(serviceName: string) {
  const [config] = await servicemanagement.getServiceConfig({
    serviceName: serviceName,
  });
  return config;
}
/**
 * Determines if a given service is a 'Cloud API'.
 * @param serviceName - the hostname of a service ('foo.googleapis.com')
 * @return well is it, or not?
 */
export function getApiClientScope(serviceConfig: protos.google.api.IService) {
  let category = null;
  let hasSurface = true;
  let inScope = true;

  if (serviceConfig.name && serviceConfig.name.endsWith('googleapis.com')) {
    const hostname = serviceConfig.name.split('.')[0];

    if (!serviceConfig.apis || serviceConfig.apis.length === 0) {
      hasSurface = false;
      inScope = false;
    }

    allow.forEach(x => {
      if (
        x.services.includes(hostname) ||
        x.slugs.some(slug => {
          return serviceConfig.title?.includes(slug);
        })
      ) {
        category = x.category;
        inScope = x.in_scope;
      }
    });

    deny.forEach(y => {
      if (y.services.includes(hostname)) {
        category = y.category;
        inScope = false;
      }
    });

    if (category !== null) {
      return [category, hasSurface, inScope];
    }

    if (serviceConfig.authentication?.rules) {
      allow.forEach(x => {
        serviceConfig.authentication?.rules?.forEach(rule => {
          if (
            x.auth_scopes.some(a => {
              return rule.oauth?.canonicalScopes?.includes(a);
            })
          ) {
            category = x.category;
            inScope = x.in_scope;
          }
        });
      });
    }

    if (category !== null) {
      return [category, hasSurface, inScope];
    }

    // Config JSON snippet: "usage: { requirements: [ 'serviceusage.googleapis.com/tos/cloud' ] }"
    if (serviceConfig.usage?.requirements) {
      const usage: string[] = serviceConfig.usage?.requirements;
      if (usage.includes('serviceusage.googleapis.com/tos/cloud')) {
        return ['Cloud/GCP', hasSurface, inScope];
      }
    }
    return ['Not Cloud (Other)', hasSurface, false];
  } else {
    return ['Third party endpoint', hasSurface, false];
  }
}

export async function getResults(): Promise<string[][]> {
  const services: string[] = await getAllServiceNames();
  const throttle = Throttle({
    limit: 2,
    interval: 2200,
  });
  const throttledGetServiceConfig = throttle(async (s: string) => {
    console.log(`requesting service config: ${s}`);
    const config = await getServiceConfig(s);
    const category: (string | boolean)[] = getApiClientScope(config);
    return [
      String(s),
      String(config.title),
      String(category[0]),
      String(category[1]),
      String(category[2]),
      String(config.usage?.requirements),
    ];
  });
  const results = await Promise.all(
    services.map(s => throttledGetServiceConfig(s))
  );
  return results;
}

/**
 * Export results to a known Google Sheet.
 */
export async function exportApisToSheets() {
  const values = await getResults();
  values.unshift(['Service', 'Title', 'Group', 'HasSurface', 'InScope', 'ToS']);

  // clear the current text in the sheet
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: 'A1:Z10000',
  });

  // insert it into the sheet
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: [
        {
          range: 'A1',
          values,
        },
      ],
    },
  });
}

/**
 * Output results for CLI command `sloth services`
 * @param cli
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function showCloudApis(cli: meow.Result<any>) {
  const output = new Array<string>();
  const res = await getResults();
  const head = ['Service', 'Title', 'Group', 'HasSurface', 'InScope', 'ToS'];
  let table: Table;
  if (cli.flags.csv) {
    output.push(CSV.stringify(head));
  } else {
    table = new Table({head: head});
  }

  res.forEach(x => {
    if (cli.flags.csv) {
      output.push(CSV.stringify(x));
    } else {
      table.push(x);
    }
  });
  if (table!) {
    output.push(table!.toString());
  }
  output.forEach(l => process.stdout.write(l));
  process.stdout.write('\n');
}
