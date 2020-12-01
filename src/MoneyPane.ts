/*   Money Pane
 **
 **  A ledger consists a of a series of transactions.
 */

import { v4 as uuidv4 } from 'uuid'
import { icons, ns, solidLogicSingleton, authn } from 'solid-ui'
import { st, namedNode } from 'rdflib'
import { fileUploadButtonDiv } from 'solid-ui/lib/widgets/buttons'
import { parseAsnCsv } from './parsers/asnbank-csv'

ns.halftrade = (label: string) => namedNode(`https://ledgerloops.com/vocab/halftrade#${label}`)
ns.money = (tag: string) => namedNode(`https://example.com/#${tag}`) // @@TBD

const mainClass = ns.halftrade('Ledger')
const LEDGER_LOCATION_IN_CONTAINER = 'index.ttl#this'

function generateTable(halfTrades: HalfTrade[]) {
  let str = '<table><tr><td>Date</td><td>From</td><td>To</td><td>Amount</td><td>Description</td>\n'
  halfTrades.forEach(halfTrade => {
    str += `<tr><td>${halfTrade.date}</td><td>${halfTrade.fromId}</td><td>${halfTrade.toId}</td><td>${halfTrade.amount} ${halfTrade.unit}</td><td>${halfTrade.description}</td></tr>\n`
  })
  return str + '</table>\n'
}

async function findLedgers() {
  return authn.findAppInstances({}, ns.halftrade('Ledger'))
}

async function importCsvFile(text: string, graphStr: string): Promise<void> { 
  let str = '<table><tr><td>Date</td><td>From</td><td>To</td><td>Amount</td><td>Description</td>\n'
  // TODO: Support more banks than just ASN Bank
  const halfTrades = parseAsnCsv(text)
  const ins = []
  const why = namedNode(graphStr)
  halfTrades.forEach(halfTrade => {
    str += `<tr><td>${halfTrade.date}</td><td>${halfTrade.fromId}</td><td>${halfTrade.toId}</td><td>${halfTrade.amount} ${halfTrade.unit}</td><td>${halfTrade.description}</td></tr>\n`
    // console.log(halfTrade)
    // const sub = namedNode(new URL(`#${uuidv4()}`, graphStr).toString())
    // ins.push(st(sub, ns.rdf('type'), ns.halftrade('HalfTrade'), why))
    // const fields = [ 'date', 'from', 'to', 'amount', 'unit', 'impliedBy', 'description' ]
    // fields.forEach((field: string) => {
    //   if (!!halfTrade[field]) {
    //     // console.log(halfTrade)
    //     ins.push(st(sub, ns.halftrade(field), halfTrade[field], why))
    //   }
    // })
  })
  console.log(`Imported ${ins.length} triples, patching your ledger`)
  // await solidLogicSingleton.updatePromise([], ins)
  console.log('done')
}

function displayLedger(node) {
  console.log("ploading")
  solidLogicSingleton.load(node);
}

export const MoneyPane = {
  icon: 'noun_Trade_1585569.svg', // Trade by bezier master from the Noun Project
  name: 'Personal Finance',
  label (subject, context) {
    const kb = context.session.store
    if (kb.holds(subject, ns.rdf('type'), mainClass)) {
      return 'Ledger'
    }
    return null // Suppress pane otherwise
  },

  mintClass: mainClass,

  mintNew: function (context, newPaneOptions) {
    const kb = context.session.store
    var updater = kb.updater
    if (newPaneOptions.me && !newPaneOptions.me.uri) {
      throw new Error('money mintNew:  Invalid userid ' + newPaneOptions.me)
    }

    var newInstance = (newPaneOptions.newInstance =
      newPaneOptions.newInstance ||
      kb.sym(newPaneOptions.newBase + LEDGER_LOCATION_IN_CONTAINER))
    var newLedgerDoc = newInstance.doc()

    kb.add(newInstance, ns.rdf('type'), mainClass, newLedgerDoc)
    kb.add(newInstance, ns.dc('title'), 'Ledger', newLedgerDoc)
    kb.add(newInstance, ns.dc('created'), new Date(), newLedgerDoc)
    if (newPaneOptions.me) {
      kb.add(newInstance, ns.dc('author'), newPaneOptions.me, newLedgerDoc)
    }

    return new Promise(function (resolve, reject) {
      updater.put(
        newLedgerDoc,
        kb.statementsMatching(undefined, undefined, undefined, newLedgerDoc),
        'text/turtle',
        function (uri2, ok, message) {
          if (ok) {
            resolve(newPaneOptions)
          } else {
            reject(
              new Error(
                'FAILED to save new ledger at: ' + uri2 + ' : ' + message
              )
            )
          }
        }
      )
    })
  },

  render: function (subject: string, context: { dom: HTMLDocument }, paneOptions: {}) {
    console.log('rendering')
    const dom = context.dom
    // const kb = context.session.store
    const paneDiv = dom.createElement('div')
    const listDiv = dom.createElement('div')
    const uploadButton = fileUploadButtonDiv(document, (files) => {
      if (files.length === 1) {
        const reader = new FileReader();
        reader.addEventListener('load', (event) => {
          importCsvFile(event.target.result.toString(), subject);
        });
        reader.readAsText(files[0]);
      } else {
        window.alert('hm');
      }
    })
    
    // console.log('finding ledgers')
    // findLedgers().then(async (ledgers) => {
    //   await solidLogicSingleton.load(ledgers.instances);
    //   const ledgerList = ledgers.instances.map(node => `<li>${displayLedger(node)}</li>`);
    //   console.log({ ledgers })
    //   listDiv.innerHTML = `<ul>${ledgerList.join('\n')}</ul>`
    // })
    paneDiv.innerHTML='<h2>under construction</h2>' +
      '<p>Upload a .csv file from your bank. Currently only <a href="https://asnbank.nl">ASN Bank</a>\'s csv format is supported.</p>' +
      'Month: <input id="month" value="11"> Year: <input id="year" value="2020"><input type="submit" value="Analyze" onclick="analyze()">'
    paneDiv.appendChild(uploadButton)
    paneDiv.appendChild(listDiv)
    console.log('returning paneDiv')
    return paneDiv
  }
}
