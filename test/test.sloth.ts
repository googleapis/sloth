// Copyright 2018 Google LLC
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

import * as assert from 'assert';
import {describe, it} from 'mocha';
import {getPriority} from '../src/issue';

// TODO:...
describe('sloth', () => {
  it('should work', () => {
    assert(true);
  });
});

describe('getPriority', () => {
  it('returns unknown on non "P" items', () => {
    assert(getPriority('FOO') === undefined);
  });
  it('is case insensitive', () => {
    assert(getPriority('p0') === 0);
  });
  it('parses correctly', () => {
    assert(getPriority('P0') === 0);
    assert(getPriority('P1') === 1);
    assert(getPriority('P2') === 2);
    assert(getPriority('P3') === 3);
    assert(getPriority('P4') === 4);
  });
});
