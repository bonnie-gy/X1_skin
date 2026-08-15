'use strict';

module.exports = function healthHandler(request, response) {
  response.setHeader('Cache-Control', 'no-store');

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ message: 'Method not allowed' });
  }

  return response.status(200).json({ status: 'ok', service: 'x1-website' });
};
