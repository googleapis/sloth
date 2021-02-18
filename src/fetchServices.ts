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

import {google} from 'googleapis';
const spreadsheetId = '14JYzl_8W3HyD0c1jYDXQJA2sVWBZiMoxT8Sp57xGWvk';

/**
 * Make a call to the Google Cloud Service Management API's services.list endpoint
 * @return {string[]} an array of hostnames ('foo.googleapis.com') for all available services
 */
export async function getAllServiceNames(): Promise<string[]> {
  try {
    const auth = await google.auth.getClient({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    const client = google.servicemanagement({
      version: 'v1',
      auth: auth,
    });
    const serviceNames: string[] = [];
    return await listServices(client, serviceNames);
  } catch (e) {
    console.log(e);
    throw e;
  }
}

export async function listServices(
  client: any,
  serviceNames: string[],
  nextPageToken = ''
): Promise<any> {
  const res = await client.services.list(
    {
      pageSize: 100,
      pageToken: nextPageToken,
    },
    {
      retryConfig: {
        retry: 10,
      },
    }
  );

  if (res.data.services) {
    res.data.services.map((item: any) => {
      serviceNames.push(item.serviceName);
    });
  }

  if (res.data.nextPageToken) {
    await listServices(client, serviceNames, res.data.nextPageToken);
  }
  return serviceNames;
}

/**
 * Make a call to the Google Cloud Service Management API's services.getConfig endpoint
 * @param {string} serviceName - the hostname of a service ('foo.googleapis.com')
 * @return {Object} the service config of the passed hostname
 */
export async function getServiceConfig(serviceName: string): Promise<any> {
  try {
    const auth = await google.auth.getClient({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    const servicemanagement = google.servicemanagement({
      version: 'v1',
      auth: auth,
    });
    const res = await servicemanagement.services.getConfig(
      {
        serviceName: serviceName,
      },
      {
        retryConfig: {
          retry: 10,
        },
      }
    );
    return res.data;
  } catch (e) {
    console.log(e);
    throw e;
  }
}

/**
 * Get service configs for all available services.
 * @return {Object}
 */
export async function getAllServiceConfigs(): Promise<any> {
  try {
    const serviceNames = await getAllServiceNames();
    const serviceConfigs = serviceNames.map(async (name: string) => {
      await getServiceConfig(name);
    });
    return serviceConfigs;
  } catch (e) {
    console.log(e);
    throw e;
  }
}

/**
 * Determines if a given service is a 'Cloud API'.
 * @param {string} serviceName - the hostname of a service ('foo.googleapis.com')
 * @return {Boolean}
 */
export async function isCloudApi(serviceName: string): Promise<boolean> {
  try {
    const serviceConfig = await getServiceConfig(serviceName);

    if ('title' in serviceConfig) {
      if (serviceConfig.title.includes('Firebase')) {
        return false;
      }
    }
    if ('authentication' in serviceConfig) {
      if ('rules' in serviceConfig['authentication']) {
        const scopes: boolean[] = serviceConfig.authentication.rules.map(
          (item: any) => {
            if ('oauth' in item) {
              if ('canonicalScopes' in item['oauth']) {
                const scopesStr: string = item.oauth.canonicalScopes;
                if (scopesStr.includes('auth/firebase')) {
                  return false;
                } else if (scopesStr.includes('auth/cloud-platform')) {
                  return true;
                } else if (scopesStr.includes('auth/drive')) {
                  return true;
                } else if (scopesStr.includes('auth/apps')) {
                  return true;
                }
              }
            }
            return false;
          }
        );

        if (scopes.includes(true)) {
          return true;
        }
      }
    }

    // usage: { requirements: [ 'serviceusage.googleapis.com/tos/cloud' ] }
    if (serviceConfig.usage.requirements) {
      const usage: string[] = serviceConfig.usage.requirements;
      if (usage.includes('serviceusage.googleapis.com/tos/cloud')) {
        return true;
      }
    }

    return false;
  } catch (e) {
    console.log(e);
    throw e;
  }
}

/**
 * Classify all available services as Cloud API or not and export to a known Google Sheet.
 */
export async function exportApisToSheets() {
  const services: string[] = await Promise.all(await getAllServiceNames());
  const values: string[][] = await Promise.all(
    services.map(async s => {
      return [s, String(await isCloudApi(s))];
    })
  );
  values.unshift(['Service', 'isCloud']);

  const auth = await google.auth.getClient({
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({
    version: 'v4',
    auth,
  });
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
