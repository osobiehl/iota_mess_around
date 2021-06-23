//const iotaMysqlConnector = require('./iotaMysqlConnector.js')
const {iotaPaymentMonitor} = require('./iotaPaymentMonitor')

require('dotenv').config()
const secret = process.env.SECRET_KEY
const credentials = {
 user: process.env.MYSQL_USER,
 password: process.env.MYSQL_PASSWORD,
 database: process.env.MYSQL_DATABASE,
 host: process.env.MYSQL_HOST
}



console.log(credentials)
const sample_source_address = "atoi1qqydc70mpjdvl8l2wyseaseqwzhmedzzxrn4l9g2c8wdcsmhldz0ulwjxpz"
const sample_dev_eui = "187187187ABABADD"
const sample_index = "DRAEGER_SAMPLE_SENSOR"
const sample_transactions = 
[
  '07a787acdb939713f6d19be1077eed1be7a53e039f60ddd96231d4de8fb525960000',
  '114f3831843f8d325230970192d4d0eb125fd91ede18e1705e2275c58244c7870100',
  '15130d74a1dc2cdc109081ef1b94796dbc62acc4b156e27b1585042e4c0bcbbb0000',
  '2611e9d49743ff15e0d5cd4261d65556fe9a0fbe5c29eded75bb8ebe44dd33df0000',
  '26cfec1887a95037eb5924be21ba2e7c2eacb332f7dea952846887d7df2e0a560000',
  '26d7700f1f496f91df6bc106e70615feb36d1e8bacad50ef101e5b2cac9f88030000',
  '2c32cb2564daea813c2aa04a24840cbd98481b3813f3d8d7852844159f36ac9c0100',
  '3040b649e07f8323a91604ea6b0a90705d0d18293c1a0d47919d8511d746552e0000',
  '36e5a71fa8075642397007cd6c11a38140646f90dd24e8cb6195bda1d4cea5540100',
  '389a7cd05c61ef8c925ed780bb775a5cfa6694f79c8fd57e6addf967eb155f2a0100',
  '3b8b71fe122ead6ec6c3d3ab58644cdb970e0e152d1fe33fa5a2fd1047bfc2770000',
  '4be6aa1c8b8fe50a5ec198833f7e01a027ae2909ee88166744092038931eb9580000',
  '4d1f02f76780c38af728ab81c5b78411b24053ce667e215dedb3a1b3275250800000',
  '557fe40fc52acf5de15980d4c1f430b1eaab5324a4e2cfc50995ed4e2dc96c4d0000',
  '5606c0ec1315c259ca732762975a2838e7d75f12fc32aeb52270875ee7ca4c8c0100',
  '5a2efeeb17df908f2528aa90fd319a0fd050db2159c2a08f95dad8435ffa731a0000',
  '5b5be2de6cd0096ba399966b9c0e560a9167cfd5f79c3fac94401dfd92d6a7e30000',
  '5c73d10255159543e987cc698f2b7acc73c2e26c87663b4afa8ab2e59f3041470000',
  '637318364609b67adc3faeaa21c21a89995868190d765d977be916950482779e0000',
  '656f6fd04a5126290f3f96a8e51c4d226cf3ea341e7e0970907caf9aad147a550000',
  '7df85d3301005a582453d55e4ebf4edc2131ceba455c57e3bb4b3d233773a7620000',
  '87318084294c9fdc91e5224c3fbb6b813557ca9ae97efb1796ef45d7c5ae327e0000',
  '8a319fe0b349ca77cdc8225c1154ac7631e92e45d86287ca594a28a5f9be2c010000',
  '8e0db1c19b85cfd5ee1189362c7044606fcaf5fbaa2cb738345468dea37dfa150000',
  '941464372a1ec0e59b41a39f74bcc80a328f7838f4c62f776c47c56bee5c00410000',
  '9bd70906f003c3aa7dd42761d4862fc46f0be43acd4543cee242a425207448c60100',
  'a06a0877f1db4711add3a218ad513d1cdc5112ce7df2176667a60432ebc678f70000',
  'a59c285161fec77f73e082f4d02f142ea72d30c3f753088e4ee267cba1da12b90100',
  'a87eb07690ee657587bc7ec9a46331280f2d33d97dc9cd201db5f11dc9d464280000',
  'a8e8b3537a0cf3ed9809b9a75b9d5e5b57e3278974ca6f8987c509959e3fb21b0000',
  'a916fb6acc5dae2222dc8a11a3c784482da2510b54c8b2a531c4775867b7fb050000',
  'b645f23d83158699dece8b484cab0ee78c8867a13fdcc18eff8a48bc0af639e90000',
  'bab209ba099bca848aadb3058f824d9f4205f44053db356b1fb77169d5a2d2530000',
  'bbf89c2d0147b0dde83a9fbde28dfcb4d11abff56c89aa2e9c3168f6b88059c10000',
  'c3f416b4394dd6e49354444d53e3c33f1169f25889ad7bc1c2ea83e35e291d5c0000',
  'c616f4a777e016184eac7640d10381dc50e11b2eeac74ce84ccc3c1d0423617d0000',
  'c7a12f83e0dd5838180d763437291839a9ba20ca0ebd71a33778b380d62592780000',
  'c8d1139b35ba50b96df3ecca1a68ce0a691d4fa780a3958e072c377d8bc7be130000',
  'cd0ba93261bb1f06baabae720dbcb267924e639d0ec2e18f5f0b0ecf8d9619850000',
  'd7bac3da12cc3004f8eef4bac153461d131e969fa507e43b238e81de5216050c0000',
  'e1c082f2ebce3d064bf1df40f4a22ec56bd038812194167ac1536e310239ebc00000',
  'e20f867eafc2ce67c76d6794ed137d87bf6d176132094406aafbc4721d3357810000',
  'fb95fc3c2d587e12a91df7e3e9e7a63648e621c5946ce5db750a4421cfd5fbff0000',
  'ffad09d47097b449a77643a7051ccb3321f92f110af77d8fa5913dbbbf99e9300000',
  'ffad09d47097b449a77643a7051ccb3321f92f110af77d8fa5913dbbbf99e9300200'
]









async function setup(){
  // let mysqlConnector = await iotaMysqlConnector.build(credentials)
  // await mysqlConnector.insertDummyValues();
  // console.log(await mysqlConnector.registerDevice('test_eui22','atoi1qc8382tatspuxane9wdnv7ygw0xhrd9ewfw7phnds6d56cc9095qwljder4', 'DRAEGER2'))
  // console.log(await mysqlConnector.getIotaAddress(sample_dev_eui))
  // console.log(await mysqlConnector.getIotaIndex(sample_dev_eui))
  // await mysqlConnector.getResolvedTransactions(sample_dev_eui);

  let iotaMonitor = await iotaPaymentMonitor.init(credentials)
  try{
  let dev = await iotaMonitor.registerDevice(
    "187187187ABABADD", 
    "atoi1qzy73208r0lkhmvspyfq9mpytg0zu0wp6xwh5yl250d0ky962rzzqe4y3sv",
    'DRAEGER_SENS_1a'
    )
  }
  catch(e){   }
  let addresses = await iotaMonitor.getSensorAddresses()
  console.log(addresses)
  let add = addresses[0];

  let outputs = await iotaMonitor.client.getAddressOutputs(add)
  console.log('total outputs: ')
  console.log(outputs)
  let p1 = await iotaMonitor.getNewTransactions(add);
  console.log("transactions: ")
  console.log(p1)



  let test = await iotaMonitor.mainLoop((unresolved_transactions) =>{    
    console.log("UNRESOLVED TRANSACTIONS: ")
    console.log(unresolved_transactions)
    if (unresolved_transactions.length != 0){
      let first = unresolved_transactions[0]
      console.log('LOGGING FIRST . . . \n\n')
      console.log(first)
      iotaMonitor.__resolveTransaction(first.sensor_address, first.output_id);
    }
  })



}
setup()