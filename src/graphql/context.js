import MarketplaceContract from '../contracts/V00_Marketplace'
import UserRegistryContract from '../contracts/V00_UserRegistry'
import ClaimHolderRegisteredContract from '../contracts/ClaimHolderRegistered'
import TokenContract from '../contracts/OriginToken'
import eventCache from './eventCache'
import pubsub from './pubsub'

let metaMask, web3WS, wsSub
const HOST = process.env.HOST || 'localhost'

const Configs = {
  mainnet: {
    provider: 'https://mainnet.infura.io',
    providerWS: 'wss://mainnet.infura.io/ws',
    ipfsGateway: 'https://ipfs.originprotocol.com',
    ipfsRPC: `https://ipfs.originprotocol.com`,
    V00_UserRegistry: '0xa4428439ec214cc68240552ec93298d1da391114',
    OriginIdentity: '0x1af44feeb5737736b6beb42fe8e5e6b7bb7391cd',
    OriginToken: '0x8207c1ffc5b6804f6024322ccf34f29c3541ae26',
    V00_Marketplace: '0x819bb9964b6ebf52361f1ae42cf4831b921510f9',
    V00_Marketplace_Epoch: '6436157'
  },
  rinkeby: {
    provider: 'https://rinkeby.infura.io',
    providerWS: 'wss://rinkeby.infura.io/ws',
    ipfsGateway: 'https://ipfs.staging.originprotocol.com',
    ipfsRPC: `https://ipfs.staging.originprotocol.com`,
    V00_UserRegistry: '0x56727c8a51b276aec911afa8d6d80d485c89d5cc',
    OriginIdentity: '0x8a294aaece85ca472f09ab6c09d75448bf3b25c1',
    OriginToken: '0xa115e16ef6e217f7a327a57031f75ce0487aadb8',
    V00_Marketplace: '0xe842831533c4bf4b0f71b4521c4320bdb669324e',
    V00_Marketplace_Epoch: '3086315'
  },
  localhost: {
    provider: `http://${HOST}:8545`,
    providerWS: `ws://${HOST}:8545`,
    ipfsGateway: `http://${HOST}:9090`,
    ipfsRPC: `http://${HOST}:5002`
  }
}

const context = {}

export function setContext(net) {
  const config = Configs[net]
  if (!config) {
    return
  }

  context.ipfsGateway = config.ipfsGateway
  context.ipfsRPC = config.ipfsRPC

  window.localStorage.ognNetwork = net

  delete context.marketplace
  delete context.ogn
  delete context.marketplaces
  delete context.tokens
  delete context.claimHolderRegistered
  delete context.metaMask
  if (wsSub) {
    wsSub.unsubscribe()
  }

  window.web3 = new Web3(config.provider)
  context.web3Exec = web3
  web3WS = new Web3(config.providerWS)
  wsSub = web3WS.eth.subscribe('newBlockHeaders').on('data', blockHeaders => {
    pubsub.publish('NEW_BLOCK', {
      newBlock: { ...blockHeaders, id: blockHeaders.hash }
    })
  })
  web3.eth.getBlockNumber().then(block => {
    web3.eth.getBlock(block).then(blockHeaders => {
      if (blockHeaders) {
        pubsub.publish('NEW_BLOCK', {
          newBlock: { ...blockHeaders, id: blockHeaders.hash }
        })
      }
    })
  })
  if (window.localStorage.privateKeys) {
    JSON.parse(window.localStorage.privateKeys).forEach(key =>
      web3.eth.accounts.wallet.add(key)
    )
    web3.eth.defaultAccount = window.localStorage.defaultAccount
  }

  context.EventBlock = config.V00_Marketplace_Epoch || 0

  context.claimHolderRegistered = new web3.eth.Contract(
    ClaimHolderRegisteredContract.abi
  )

  context.userRegistry = new web3.eth.Contract(
    UserRegistryContract.abi,
    config.V00_UserRegistry
  )
  context.marketplace = new web3.eth.Contract(
    MarketplaceContract.abi,
    config.V00_Marketplace
  )
  context.marketplace.eventCache = eventCache(
    context.marketplace,
    config.V00_Marketplace_Epoch
  )
  context.marketplaceExec = context.marketplace
  context.ogn = new web3.eth.Contract(TokenContract.abi, config.OriginToken)
  context[config.OriginToken] = context.ogn
  context.ognExec = context.ogn

  if (metaMask) {
    context.metaMask = metaMask
    context.web3Exec = metaMask
    context.marketplaceMM = new metaMask.eth.Contract(
      MarketplaceContract.abi,
      config.V00_Marketplace
    )
    context.marketplaceExec = context.marketplaceMM
    context.ognMM = new metaMask.eth.Contract(TokenContract.abi, config.OriginToken)
    context.ognExec = context.ognMM
  }
}

if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'CSS') {
  window.context = context
  if (window.web3) {
    metaMask = new Web3(web3.currentProvider)
  }

  Configs.localhost.V00_UserRegistry = window.localStorage.userRegistryContract
  Configs.localhost.OriginToken = window.localStorage.OGNContract
  Configs.localhost.V00_Marketplace = window.localStorage.marketplaceContract

  setContext(window.localStorage.ognNetwork || 'mainnet')

  window.context = context
  // window.setNet = (net) => {
  //   setContext(net)
  //   gql.resetStore()
  // }
}

export default context
