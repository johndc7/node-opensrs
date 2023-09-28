node-opensrs
============

This is a simple implementation of the OpenSRS API in node.js

Installation
============
```shell
npm i node-opensrs
```

Getting started
===============
```js
const opensrs = require('node-opensrs')(options)
```

Documentation
=============
Configuration Options
---------------------
| Option                     | Description                                                                                                                                                                                       |
|----------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `email.credentials`        | This is an OpenSRS credentials object. See https://email.opensrs.guide/docs/authenticate for more info.                                                                                           |
| `email.apiUrl`             | URL for the email API. This should be https://admin.b.hostedemail.com/api or https://admin.a.hostedemail.com/api depending on your cluster. See https://email.opensrs.guide/docs/sending-requests |
| `domains.apiKey`           | API key for the domains API. See https://domains.opensrs.guide/docs/quickstart                                                                                                                    |
| `domains.apiUrl`           | URL for the domains API. This should be https://rr-n1-tor.opensrs.net:55443 for production or https://horizon.opensrs.net:55443 for testing.                                                      |
| `domains.username` | Your OpenSRS reseller username.                                                                                                                                                                   |

API Functions
-------------
These functions are implementations of the OpenSRS API. All functions will return a promise. For more details on each function, see the OpenSRS documentation.

**Email API**

- `opensrs.mail.authenticate()`
- `opensrs.mail.getDomain(domain)`
- `opensrs.mail.addDomain(domain)`
- `opensrs.mail.searchUsers(domain)`
- `opensrs.mail.changeUser(user, attributes)`
- `opensrs.mail.deleteUser(user)`

**Domains and SSL API**
- `opensrs.domains.getDomainsContacts(domains)`
- `opensrs.domains.updateContacts(params)`
- `opensrs.domains.getPrice(params)`
- `opensrs.events.poll(limit)`
- `opensrs.events.ack(eventId)`

Official Documentation
======================
The official OpenSRS API documentation can be found at the following links:
- Email: https://email.opensrs.guide/
- Domains and SSL: https://domains.opensrs.guide/
