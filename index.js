const xmlBuilder = require('xmlbuilder2');
const crypto = require('crypto');

module.exports = (options) => ({
  mail: {
    authenticate: async () => {
      let response = await fetch(`${options.mail.apiUrl}/authenticate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentials: options.mail.credentials })
      });
      let data = await response.json();
      return data && data.success;
    },
    getDomain: async (domain) => {
      let response = await fetch(`${options.mail.apiUrl}/get_domain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentials: options.mail.credentials, domain })
      });
      let data = await response.json();
      return data && data.success && data;
    },
    addDomain: async (domain) => {
      let response = await fetch(`${options.mail.apiUrl}/change_domain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentials: options.mail.credentials,
          domain,
          attributes: {},
          create_only: true
        })
      });
      let data = await response.json();
      if(!data || !data.success) console.log(data && data.success || 'Unknown error enabling email')
      return data && data.success;
    },
    searchUsers: async (domain) => {
      let response = await fetch(`${options.mail.apiUrl}/search_users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentials: options.mail.credentials,
          criteria:{domain}
        })
      });
      let data = await response.json();
      return data && data.success && data;
    },
    /*
    changeUser will create a new user or edit an existing one
    type - Can be mailbox, forward, or filter
    password - send as plain text
    */
    changeUser: async (user, attributes) => {
      let response = await fetch(`${options.mail.apiUrl}/change_user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentials: options.mail.credentials,
          user,
          attributes
        })
      });
      let data = await response.json();
      if(!data || !data.success)
        console.error(data)
      return data && data.success;
    },
    deleteUser: async (user) => {
      let response = await fetch(`${options.mail.apiUrl}/delete_user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentials: options.mail.credentials,
          user
        })
      });
      let data = await response.json();
      if(!data || !data.success)
        console.error(data)
      return data && data.success;
    },
    deleteDomain: async (domain) => {
      let response = await fetch(`${options.mail.apiUrl}/delete_domain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentials: options.mail.credentials,
          domain
        })
      });
      let data = await response.json();
      if(!data || !data.success)
        console.error(data)
      return data && data.success;
    },
    getUser: async (user) => {
      let response = await fetch(`${options.mail.apiUrl}/get_user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentials: options.mail.credentials,
          user
        })
      });
      return await response.json();
    },
    renameUser: async (user, new_name) => {
      let response = await fetch(`${options.mail.apiUrl}/rename_user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentials: options.mail.credentials,
          user,
          new_name
        })
      });
      let data = await response.json();
      if(!data || !data.success)
        console.error(data)
      return data && data.success;
    },
    restoreDomain: async (domain, id, new_name) => {
      let response = await fetch(`${options.mail.apiUrl}/restore_domain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentials: options.mail.credentials,
          domain,
          id,
          new_name
        })
      });
      let data = await response.json();
      if(!data || !data.success)
        console.error(data)
      return data && data.success;
    },
  },
  domains: {
    getDomainsContacts: async (domains) => {
      if(!domains) throw new Error('Domains parameter required')
      if(typeof domains == 'string')
        domains = [domains]
      let xml = buildXmlRequest({
        dt_assoc: {
          item: [
            {'@key': 'protocol', '#': 'XCP'},
            {'@key': 'object', '#': 'DOMAIN'},
            {'@key': 'action', '#': 'GET_DOMAINS_CONTACTS'},
            {'@key': 'attributes', '#': {
              dt_assoc: {
                item: {'@key': 'domain_list', '#': {
                  dt_array: {
                    item: domains.map((domain, i) => ({'@key': i, '#': domain}))
                  }
                }}
              }
            }}
          ]
        }
      });
      let response = await fetch(options.domains.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml',
          'X-Username': options.domains.username,
          'X-Signature': getSignature(xml, options.domains.apiKey),
          'Content-Length': xml.length
        },
        body: xml
      });
      let data = await response.text();
      let contacts = parseXml(data);
      return contacts.body.attributes
    },
    updateContacts: async (params) => {
      if(!params)
        throw new Error('Missing required paramaters for updateContacts()')
      let xml = buildXmlRequest({
        dt_assoc: {
          item: [
            {'@key': 'protocol', '#': 'XCP'},
            {'@key': 'object', '#': 'DOMAIN'},
            {'@key': 'action', '#': 'UPDATE_CONTACTS'},
            {'@key': 'attributes', '#': {
              dt_assoc: {
                item: [
                  {'@key': 'domain', '#': params.domain},
                  Object.keys(params).filter((key) => ['affect_domains','report_email', 'domains'].includes(key)).map((key) => ({
                    '@key': key,
                    '#': params[key]
                  })),
                  {'@key': 'types', '#': {
                    dt_array: {
                      item: (params.types || Object.keys(params.contact_set)).map((type, i) => ({'@key': i, '#': type}))
                    }
                  }},
                  {'@key': 'contact_set', '#': {
                    dt_assoc: {
                      item: Object.keys(params.contact_set).map((type) => ({
                        '@key': type,
                        '#': {
                          dt_assoc: {
                            item: Object.keys(params.contact_set[type]).map((prop) => ({
                              '@key': prop,
                              '#': params.contact_set[type][prop]
                            }))
                          }
                        }
                      }))
                    }
                  }}
                ]
              }
            }}
          ]
        }
      })
      await fetch(options.domains.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml',
          'X-Username': options.domains.username,
          'X-Signature': getSignature(xml, options.domains.apiKey),
          'Content-Length': xml.length
        },
        body: xml
      });
    },
    getPrice: async (params) => {
      if(!params || !params.domain)
        throw new Error('Missing required paramaters for getPrice()')
      let xml = buildXmlRequest({
        dt_assoc: {
          item: [
            {'@key': 'protocol', '#': 'XCP'},
            {'@key': 'object', '#': 'DOMAIN'},
            {'@key': 'action', '#': 'GET_PRICE'},
            {'@key': 'attributes', '#': {
              dt_assoc: {
                item: [
                  Object.keys(params).map((key) => ({
                    '@key': key,
                    '#': params[key]
                  }))
                ]
              }
            }}
          ]
        }
      })
      let response = await fetch(options.domains.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml',
          'X-Username': options.domains.username,
          'X-Signature': getSignature(xml, options.domains.apiKey),
          'Content-Length': xml.length
        },
        body: xml
      });
      let data = await response.text();
      let price = parseXml(data);
      return price.body.attributes
    },
    lookup: async (params) => {
      if(!params || !params.domain)
        throw new Error('Missing required paramaters for lookup()')
      let xml = buildXmlRequest({
        dt_assoc: {
          item: [
            {'@key': 'protocol', '#': 'XCP'},
            {'@key': 'object', '#': 'DOMAIN'},
            {'@key': 'action', '#': 'LOOKUP'},
            {'@key': 'attributes', '#': {
              dt_assoc: {
                item: [
                  Object.keys(params).map((key) => ({
                    '@key': key,
                    '#': params[key]
                  }))
                ]
              }
            }}
          ]
        }
      })
      let response = await fetch(options.domains.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml',
          'X-Username': options.domains.username,
          'X-Signature': getSignature(xml, options.domains.apiKey),
          'Content-Length': xml.length
        },
        body: xml
      });
      let data = await response.text();
      let lookup = parseXml(data);
      return lookup.body.attributes
    },
    sw_register: async (params) => {
      if(!params)
        throw new Error('Missing required paramaters for sw_register()')
      let xml = buildXmlRequest({
        dt_assoc: {
          item: [
            {'@key': 'protocol', '#': 'XCP'},
            {'@key': 'object', '#': 'DOMAIN'},
            {'@key': 'action', '#': 'SW_REGISTER'},
            {'@key': 'attributes', '#': {
              dt_assoc: {
                item: [
                  Object.keys(params).map((key) => ({
                    '@key': key,
                    '#': params[key]
                  }))
                ]
              }
            }}
          ]
        }
      })
      let response = await fetch(options.domains.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml',
          'X-Username': options.domains.username,
          'X-Signature': getSignature(xml, options.domains.apiKey),
          'Content-Length': xml.length
        },
        body: xml
      });
      let data = await response.text();
      let register = parseXml(data);
      return register.body.attributes
    }
  },
  events: {
    poll: async (limit) => {
      let xml = buildXmlRequest({
        dt_assoc: {
          item: [
            {'@key': 'protocol', '#': 'XCP'},
            {'@key': 'object', '#': 'EVENT'},
            {'@key': 'action', '#': 'POLL'},
            {'@key': 'attributes', '#': {
              dt_assoc: {
                item: {'@key': 'limit', '#': limit || 1}
              }
            }}
          ]
        }
      })
      let response = await fetch(options.domains.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml',
          'X-Username': options.domains.username,
          'X-Signature': getSignature(xml, options.domains.apiKey),
          'Content-Length': xml.length
        },
        body: xml
      });
      let data = await response.text();
      let e = parseXml(data).body.attributes;
      if(!e.events)
        return [];
      // If only one event returned. Otherwise it will look like: {total: 2, events: {0: ..., 1: ...}}
      if(e.events.object)
        return [e.events]
      return Object.keys(e.events).map(k => e.events[k])
    },
    ack: async (eventId) => {
      if(!eventId) throw new Error('eventId must be defined');
      let xml = buildXmlRequest({
        dt_assoc: {
          item: [
            {'@key': 'protocol', '#': 'XCP'},
            {'@key': 'object', '#': 'EVENT'},
            {'@key': 'action', '#': 'ACK'},
            {'@key': 'attributes', '#': {
              dt_assoc: {
                item: {'@key': 'event_id', '#': eventId}
              }
            }}
          ]
        }
      })
      await fetch(options.domains.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml',
          'X-Username': options.domains.username,
          'X-Signature': getSignature(xml, options.domains.apiKey),
          'Content-Length': xml.length
        },
        body: xml
      });
    }
  }
})

function getSignature(xml, key){
  let signature = crypto.createHash('md5').update(xml + key).digest("hex")
  return crypto.createHash('md5').update(signature + key).digest("hex")
}

function buildXmlRequest(data_block){
  return xmlBuilder.create({
    encoding: 'UTF-8',
    standalone: true
  }).ele({
    OPS_envelope: {
      header: { version: '0.9' },
      body: { data_block }
    }
  }).dtd({ sysID: 'ops.dtd' }).end({ prettyPrint: true });
}

function parseXml(data){
  if(typeof data == 'string')
    data = xmlBuilder.create(data).end({ format: 'object' })
  if(data instanceof Array){
    let obj = {}
    data.map((item) => parseXml(item)).forEach((item => obj = Object.assign(obj, item)))
    return obj;
  }
  if(data.hasOwnProperty('@key') && data.hasOwnProperty('#')){
    if(typeof data['#'] == 'string')
      return {[data['@key']]: data['#']}
    return {[data['@key']]: parseXml(data['#'])}
  }
  let out = {}
  for(let key in data){
    if(key == '@key') continue;
    if(typeof data[key] == 'string')
      out[key] = data[key]
    else
      out[key] = parseXml(data[key])
  }
  if(data.hasOwnProperty('@key'))
    return {[data['@key']]: out}
  return flattenObject(out)
}

function flattenObject(object){
  if(!object || typeof object !== 'object') return object;
  if(Object.keys(object).length == 0)
    return null;
  if(Object.keys(object).length == 1)
    return flattenObject(object[Object.keys(object).pop()])
  let flat = {}
  for(let key in object)
    flat[key] = flattenObject(object[key])
  return flat
}
