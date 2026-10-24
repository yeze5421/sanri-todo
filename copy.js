(function (root, factory) {
  'use strict';
  const copy = factory();
  if (typeof module === 'object' && module.exports) module.exports = copy;
  else root.ThreeDaysCopy = copy;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function formatText(phrase, values = {}) {
    // Replace once so a user's text containing braces stays literal.
    return phrase.replace(/\{(\w+)\}/g, (match, name) => Object.hasOwn(values, name) ? String(values[name]) : match);
  }
  return Object.freeze({ formatText });
});
