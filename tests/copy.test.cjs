'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { formatText } = require('../copy.js');

test('interpolation preserves user braces, markup, and replacement syntax as literal text', () => {
  const userText = 'Read {date} <img src=x onerror=alert(1)> $&';
  assert.equal(
    formatText('Complete: {task}', { task: userText, date: 'must-not-replace' }),
    'Complete: ' + userText
  );
});

test('formatting handles zero and leaves missing or inherited placeholders alone', () => {
  assert.equal(formatText('{hours}h', { hours: 0 }), '0h');
  assert.equal(formatText('{task} {date}', { task: 'Take a walk' }), 'Take a walk {date}');
  assert.equal(formatText('{toString}', {}), '{toString}');
  assert.equal(formatText('Three Days'), 'Three Days');
});
