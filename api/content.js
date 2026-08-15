'use strict';

const content = require('../backend/content.json');

module.exports = function contentHandler(request, response) {
  response.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300');

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ message: 'Method not allowed' });
  }

  return response.status(200).json(content);
};
