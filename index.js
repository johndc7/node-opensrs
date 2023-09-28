let axios = require('axios');
const xmlBuilder = require('xmlbuilder2');
const crypto = require('crypto');

module.exports = (options) => ({
  mail: {
    authenticate: async () => {
      let {data} = await axios.post(`${options.mail.apiUrl}/authenticate`, {
        credentials: options.mail.credentials
      })
      return data && data.success;
    },
    getDomain: async (domain) => {
      let {data} = await axios.post(`${options.mail.apiUrl}/get_domain`, {
        credentials: options.mail.credentials,
        domain
      })
      return data && data.success && data;
    },
    addDomain: async (domain) => {
      let {data} = await axios.post(`${options.mail.apiUrl}/change_domain`, {
        credentials: options.mail.credentials,
        domain,
        attributes: {},
        create_only: true
      })
      if(!data || !data.success) console.log(data && data.success || 'Unknown error enabling email')
      return data && data.success;
    },
    searchUsers: async (domain) => {
      let {data} = await axios.post(`${options.mail.apiUrl}/search_users`, {
        credentials: options.mail.credentials,
        criteria:{domain}
      })
      return data && data.success && data;
    },
    /*
    changeUser will create a new user or edit an existing one
    type - Can be mailbox, forward, or filter
    password - send as plain text
    */
    changeUser: async (user, attributes) => {
      let {data} = await axios.post(`${options.mail.apiUrl}/change_user`, {
        credentials: options.mail.credentials,
        user,
        attributes
      })
      if(!data || !data.success)
        console.error(data)
      return data && data.success;
    },
    deleteUser: async (user) => {
      let {data} = await axios.post(`${options.mail.apiUrl}/delete_user`, {
        credentials: options.mail.credentials,
        user
      })
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
      let {data} = await axios.post(options.domains.apiUrl, xml, {
        headers: {
          'Content-Type': 'text/xml',
          'X-Username': options.domains.username,
          'X-Signature': getSignature(xml, options.domains.apiKey),
          'Content-Length': xml.length
        }
      })
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
      let {data} = await axios.post(options.domains.apiUrl, xml, {
        headers: {
          'Content-Type': 'text/xml',
          'X-Username': options.domains.username,
          'X-Signature': getSignature(xml, options.domains.apiKey),
          'Content-Length': xml.length
        }
      })
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
      let {data} = await axios.post(options.domains.apiUrl, xml, {
        headers: {
          'Content-Type': 'text/xml',
          'X-Username': options.domains.username,
          'X-Signature': getSignature(xml, options.domains.apiKey),
          'Content-Length': xml.length
        }
      })
      let price = parseXml(data);
      return price.body.attributes
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
      let {data} = await axios.post(options.domains.apiUrl, xml, {
        headers: {
          'Content-Type': 'text/xml',
          'X-Username': options.domains.username,
          'X-Signature': getSignature(xml, options.domains.apiKey),
          'Content-Length': xml.length
        }
      })
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
      let {data} = await axios.post(options.domains.apiUrl, xml, {
        headers: {
          'Content-Type': 'text/xml',
          'X-Username': options.domains.username,
          'X-Signature': getSignature(xml, options.domains.apiKey),
          'Content-Length': xml.length
        }
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
