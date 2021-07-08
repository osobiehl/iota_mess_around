fs = require('fs');
const assert = require('assert')
const { ClientBuilder, AddressGetter } = require('@iota/client'); 
const mysql = require('mysql2/promise');
const crypto = require('crypto')
const { iotaMysqlConnector, iotaPaymentMonitor, iotaEncryption, iotaDataWriter } = require('../iotaPaymentMonitor');
const {createCipheriv, createDecipheriv, createSign, createVerify, generateKeyPairSync} = require('crypto');
const { setUncaughtExceptionCaptureCallback } = require('process');
require('dotenv').config()
const { fromKeyLike } = require('jose/jwk/from_key_like');
const { createImportSpecifier } = require('typescript');
const { serializePayload } = require('@iota/iota.js');
const private_key_precursor = process.env.PRIVATE_KEY;
const public_key_precursor = process.env.PUBLIC_KEY;
const private_key = crypto.createPrivateKey({
  'key': private_key_precursor,
  'format': 'pem',
  'type': 'sec1',
})
const public_key = crypto.createPublicKey({
  'key': public_key_precursor,
   type: 'spki',
   format: 'pem'

})
        // let optionsPublicKey = {
        //   type: 'spki',
        //   format: 'pem'

        // }
       
const sample_payload = {"type":2,"index":"445241454745525f504f435f5041594d454e5453","data":"0410a67c74c8450b0b3b049f652d8bf27251c84372f11c18b1b95bdeb71490f345e69426c379ae428660f8dd35e8dc6536c87d8d19a77c977aa71469fcbd4d0c5c"};


async function db_setup(mysql_connection){
    let db_setup = fs.readFileSync('test/test_db_script.sql', 'utf-8');
    console.log('clearing db!')
    // console.log(db_setup)
    await mysql_connection.query(db_setup)
    await connection.commit()
}

const credentials = {
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    // database: process.env.TEST_DATABASE,
    host: process.env.MYSQL_HOST
   }

var connection;
var mysqlConnector;


describe('iotaMysqlConnector', function() {
    before(async function() {
        console.log('running...')
      // runs once before the first test in this block
      connection = await mysql.createConnection({...credentials, multipleStatements: true})
      await db_setup(connection);
    mysqlConnector = new iotaMysqlConnector(connection);
        

    });
    const sample_source_address = "atoi1qqydc70mpjdvl8l2wyseaseqwzhmedzzxrn4l9g2c8wdcsmhldz0ulwjxpz"
    const sample_dev_eui = "187187187ABABADD"
    const sample_index = "DRAEGER_SAMPLE_SENSOR"
    it('test device registration', async() => {
        
        let id = await mysqlConnector.registerDevice(sample_dev_eui, sample_source_address, sample_index);
        let [rows, x] = await connection.execute('SELECT * FROM sensors where sensor_id = ?',
        [id])

        assert(rows[0].sensor_id == id, "sensor ids do not match!")
      });

      const other_accounts = [
        'atoi1qrm30kqk25xf2htqm4d0g2fmgd6fkxmln9ug3td3q56k5y8pst3guhk3l2d',
        'atoi1qzgr9044xughncdyh9ag6mutrryk76zn9as8d222e68v7v64affmv4aqynn',
        'atoi1qz8ukqf5pc0u46n2tagfeewzl4cawxsp54sftncpvfz9ud2tgufksfjxj68',
        'atoi1qppsdes89q7ynecnkvuygdc4xe23js9xfs66nx4h20u4qk8sk28ncefjxkm'
        
      ]

      it('can get all sensor addresses', async() => {
        for (const a of other_accounts){
            let id = await mysqlConnector.registerDevice(a.slice(0,8), a, a.slice(0,7));
        }
        let accounts= await mysqlConnector.getSensorAddresses()

        for (const a of other_accounts){
            assert(accounts.includes(a), `account: ${a} not in array!`)
        }

      });
      it('can get sensor id', async() => {
          let sens_addr = 'atoi1qpmg2cautq9dj8jr4urgqqpyaakl3pvxus5grvn0rn2nq99a5f7syds7zkx'
        
        let id = await mysqlConnector.registerDevice(sens_addr.slice(0, 8), sens_addr, sens_addr.slice(0,7) );
        let res = await mysqlConnector.getSensorId(sens_addr)

        assert(res === id, "sensor ids do not match!")
      });
      
      it('can resolve transactions', async() => {
        let sens_addr = 'atoi1qpmg2cautq9dj8jr4urgqqpyaakl3pvxus5grvn0rn2nq99a5f7syds7zkx'
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
        for (const t of sample_transactions)
            await mysqlConnector.__resolveTransaction(sens_addr, t)
        
       let results = await mysqlConnector.getResolvedTransactions(sens_addr)
       for (const t of sample_transactions )
            assert(results.includes(t), `${t} not found in resolved transactions!`)
    });
    it('can get iota address, index from dev eui', async() => {
        let sens_addr = 'atoi1qpmg2cautq9dj8jr4urgqqpyaakl3pvxus5grvn0rn2nq99a5f7syds7zkx'
      
        let addr = await mysqlConnector.getIotaAddress(sample_dev_eui);
        assert(addr = sample_source_address);
        let index = await mysqlConnector.getIotaIndex(sample_dev_eui);
        assert(index = sample_index)
    });
    it('can insert ongoing transaction and increment count correctly', async() => {
      await db_setup(connection);
      try{
      let id = await mysqlConnector.registerDevice(sample_dev_eui, sample_source_address, sample_index);
      let [rows, x] = await connection.execute('SELECT * FROM sensors where sensor_id = ?',
      [id])}catch(e){}

      let crypt = new iotaEncryption(sample_payload)

      await mysqlConnector.insertOngoingTransaction(sample_source_address, 'lmaokaii', crypt , 1, 0)
      await mysqlConnector.__incrementTransactionCount(sample_source_address)
      let res = await mysqlConnector.getOngoingTransactions(sample_source_address)
      assert(res = [])
      assert(index = sample_index)
  });

    this.afterAll(()=>{
        connection.close()
    })



    
})
var iotaMonitor;
describe('iotaPaymentMonitor', function() {
  const sample_source_address = "atoi1qqydc70mpjdvl8l2wyseaseqwzhmedzzxrn4l9g2c8wdcsmhldz0ulwjxpz"
  const sample_dev_eui = "187187187ABABADD"
  const sample_index = "DRAEGER_SAMPLE_SENSOR"
    before(async function() {
        console.log('running...')
      // runs once before the first test in this block
      connection = await mysql.createConnection({...credentials, multipleStatements: true})
      await db_setup(connection);
    iotaMonitor = new iotaPaymentMonitor(connection);
    let id = await iotaMonitor.registerDevice(sample_dev_eui, sample_source_address, sample_index);
    let [rows, x] = await connection.execute('SELECT * FROM sensors where sensor_id = ?',
    [id])

    assert(rows[0].sensor_id == id, "sensor ids do not match!")
        

    });

      it('can get new transactions on the tangle', async() => {
        let new_payments = await iotaMonitor.getNewTransactions(sample_source_address);
        // console.log(new_payments)
        assert(new_payments.length > 0)
      });
      it('can get transaction outputs', async() => {
        let new_payments = await iotaMonitor.getNewTransactions(sample_source_address);
        // console.log(new_payments)
        let first_transaction = new_payments[0];
        assert(new_payments.length > 0)
        data = await  iotaMonitor.__getTransactionMessage(first_transaction);
        output = await iotaMonitor.__getTransactionOutput(data)
        assert(output != null);
      });
      it('can resolve an output to a payer address', async() => {
        let new_payments = await iotaMonitor.getNewTransactions(sample_source_address);
        // console.log(new_payments)
        let first_transaction = new_payments[0];
        assert(new_payments.length > 0)
        data = await  iotaMonitor.__getTransactionMessage(first_transaction);
        output = await  iotaMonitor.__getTransactionOutput(data);
        payer_address = await iotaMonitor.__validateTransactionOutputs(sample_source_address, output);
        assert(payer_address != null);

        assert(output != null);
      });
      it('can resolve an output to a payer address', async() => {
        let new_payments = await iotaMonitor.getNewTransactions(sample_source_address);
        // console.log(new_payments)
        let first_transaction = new_payments[0];
        assert(new_payments.length > 0)
        output = await  iotaMonitor.__getTransactionMessage(first_transaction);

        output =  iotaMonitor.__getTransactionOutput(output)
        payer_address = await iotaMonitor.__validateTransactionOutputs(sample_source_address, output);
        assert(payer_address != null);

        assert(output != null);
      });
      it('can resolve a transaction', async() => {
        let new_payments = await iotaMonitor.getNewTransactions(sample_source_address);
        // console.log(new_payments)
        // console.log("NEW PAYMENTS: ")
        // console.log(new_payments)
        let first_transaction = new_payments[0];
        
        await iotaMonitor.__resolveTransaction(sample_source_address,first_transaction);
        let new_payments_resolved = await iotaMonitor.getNewTransactions(sample_source_address);
        assert(! new_payments_resolved.includes(first_transaction) )
      });
      it('main loop works correctly', async() => {
        let resolved = [];

        let unresolved = await iotaMonitor.getAllUnresolvedPaymentAddresses();
        let sens = await iotaMonitor.getNewTransactions(sample_source_address);
        
        unresolved.forEach(async(payment)=>{
          assert( 'payload' in payment)
          assert( 'output_id' in payment)
          assert( 'source_address' in payment)
          assert( 'sensor_address' in payment)
          assert('message_id' in payment)
          assert(payment.source_address != payment.sensor_address);
          await iotaMonitor.__resolveTransaction(payment.sensor_address, payment.output_id) 
          resolved.push(payment)

        })
        let unresolved_again = await iotaMonitor.getAllUnresolvedPaymentAddresses();
        assert(unresolved_again.length === 0)
        // console.log(await iotaMonitor.getNewTransactions(sample_source_address))

        // console.log(unresolved_again)
       



      }).timeout(10000);
    
})

describe('iotaEncryption', function() {
    it('test device registration', async() => {
       let crypt = new iotaEncryption(sample_payload)
      //  console.log(crypt.getSecret())
        assert(true)
      });
      
      it('get public key', async() => {
  
        let crypt = new iotaEncryption(sample_payload)
        // console.log("public key: ")
        // console.log(crypt.getPublicKey())
        
        // console.log(crypt.getPublicKey().length)
         assert(crypt.getPublicKey().length === 33)
       });
       it('__encrypt and decrypt in aes128 method', async() => {
      
        let crypt = new iotaEncryption(sample_payload)
        let text = "hello, world!"
        let ans = crypt.__encryptAES128(text, 'utf-8')
        console.log(ans)
        // now try to decrypt
        let decipher = createDecipheriv('aes-128-cbc', crypt.secret.slice(0, 16), crypt.iv);
        let decrypted = decipher.update(ans, 'binary', 'utf-8')
        decrypted += decipher.final('utf-8')
        // console.log(decrypted)
        assert(decrypted === text)
        
        
       });
       it('create key', async() => {
        // const curve = 'prime256v1';
        // const { privateKey, publicKey } = generateKeyPairSync('ec', {
        //   namedCurve: curve,
        // });
        // let options = {
        //   type: 'sec1',
        //   format: 'pem'
        // }
        // console.log(privateKey.export(options))
        // let optionsPublicKey = {
        //   type: 'spki',
        //   format: 'pem'

        // }
        // console.log(publicKey.export(optionsPublicKey))
        //  console.log(fromKeyLike(public_key))

       
      
        let crypt = new iotaEncryption(sample_payload)
        let text = "hello, world!"
        let sig = iotaEncryption.SignECDSA(text, private_key)
        //now try to verify
        console.log('signature: '+ sig.length)
        console.log(sig)

        const verify = createVerify('SHA256');
        verify.write(text);
        verify.end();
        assert(verify.verify(public_key, sig))
        
        
       });
       it('prepare a payload', async() => {

        let crypt = new iotaEncryption(sample_payload)

        let payload = crypt.generatePayload(private_key);
        // now we try to decrypt everything
        let pk = payload.slice(0, 33)
        
        
        assert(Buffer.compare(pk, crypt.getPublicKey()) === 0)

        let encrypted_index = payload.slice(33, 33+16);
        let decipher = createDecipheriv('aes-128-cbc', crypt.secret.slice(0, 16), crypt.iv);
        let decrypted = decipher.update(encrypted_index.toString('binary'), 'binary', 'utf-8')
        decrypted += decipher.final('utf-8')

        assert(crypt.index.toString('utf-8') === decrypted)

        let signature = payload.slice(33+16)

        const verify = createVerify('SHA256');
        verify.write(payload.slice(0, 33 + 16));
        verify.end();
        assert(verify.verify(public_key, signature))

        

       });
       it('signature verification', async() => {        

        let msg = "02c242b3bd9ccd5ffa301814b9d517bd518eec82119615f921e0da5c6833db05abb2803141292323faa00777a02532270e30460221008c8522af294515537ed7fa02175681defbea782be16522a30c15e96e36bd59990221009f64994abefc74e648d3d3fbf1ba765017584f7ed6ca7317beec7a604f8167e7"
        let payload = Buffer.from(msg, 'hex');

        let signature = payload.slice(33+16)

        const verify = createVerify('SHA256');
        verify.write(payload.slice(0, 33 + 16));
        verify.end();
        const result = verify.verify(public_key, signature)
        console.log(result);
        assert(result === true)

        

       });
       




      
     


    
})
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}  
describe('stream', function() {
  before(async function() {
    console.log('running...')
  // runs once before the first test in this block
  connection = await mysql.createConnection({...credentials, multipleStatements: true})
  await db_setup(connection);
  mysqlConnector = new iotaMysqlConnector(connection);
  iotaMonitor = new iotaPaymentMonitor(connection);
  const sample_dev_eui = "187187187ABABADD"
  const sample_index = "DRAEGER_SAMPLE_SENSOR"
  const sample_address_stream = "atoi1qr7y55culqz9uqcqycwmzr2pl07cxfyke0rtty7wjp0f2akjmtvw7n3504a"
  let id = await mysqlConnector.registerDevice(sample_dev_eui, sample_address_stream, sample_index);
  let [rows, x] = await connection.execute('SELECT * FROM sensors where sensor_id = ?',
  [id])

  assert(rows[0].sensor_id == id, "sensor ids do not match!")

    

});
    it('set up payment stream' , async() => {


      //  console.log(crypt.getSecret())
       await iotaMonitor.setUpNewPaymentStreams(private_key);

      }).timeout(20000);
      
'33656632323030626639386665373136653463376464323435363065383933333237303363373334643336646366383432326236663465333436393464393732'



      
     


    
})
const sample_dev_eui = "187187187ABABADD"
  const sample_index = "DRAEGER_SAMPLE_SENSOR"
  const sample_address_stream = "atoi1qr7y55culqz9uqcqycwmzr2pl07cxfyke0rtty7wjp0f2akjmtvw7n3504a"
var dataWriter
describe('Data Writer', function() {
  this.timeout(5000);
  before(async function() {
    console.log('running...')
  // runs once before the first test in this block
  connection = await mysql.createConnection({...credentials, multipleStatements: true})
  await db_setup(connection);
  mysqlConnector = new iotaMysqlConnector(connection);
  iotaMonitor = new iotaPaymentMonitor(connection);
  dataWriter = new iotaDataWriter(connection, private_key)
  let id = await mysqlConnector.registerDevice(sample_dev_eui, sample_address_stream, sample_index);
  let [rows, x] = await connection.execute('SELECT * FROM sensors where sensor_id = ?',
  [id])
  let crypt = new iotaEncryption(sample_payload)
  await iotaMonitor.insertOngoingTransaction(sample_address_stream, sample_address_stream, crypt )


  assert(rows[0].sensor_id == id, "sensor ids do not match!")

    

});
    it('prepend payload size works correctly:' , async() => {
      let message = 'hello, beautiful world!';
      payload = JSON.stringify(message);
      payload = Buffer.from(message, 'utf-8');
      let desired_length = payload.length
      let pp = dataWriter.prependPayloadSize(payload);
      let size = pp.slice(0, 4)
      let size_num = size.readUInt32LE();
      assert(size_num === desired_length);


      });
    
      let aes_key = crypto.randomBytes(16);
      let hash =  Buffer.from( crypto.createHash('sha256').update(aes_key).digest('hex') , 'hex' )
      let iv = hash.slice(0, 16)

      it('payload encryption works', async()=>{
        let message = 'hello, beautiful world!';
        let transaction_obj = 
        {
          session_key: aes_key,
          init_vector: iv
        }
        let cipher = dataWriter.encryptPayload(transaction_obj, Buffer.from(message, 'utf-8'));
        let decipher = createDecipheriv('aes-128-cbc', aes_key, iv);
        let decrypted = Buffer.concat([decipher.update(cipher), decipher.final() ])
        assert(message ===decrypted.toString('utf-8') )


      })
      it('payload preparation works' , async() => {
        let message = 'hello, beautiful world!';
        let transaction_obj = 
        {
          session_key: aes_key,
          init_vector: iv
        }
        let final_payload = dataWriter.preparePayload(transaction_obj, message);


        let decipher = createDecipheriv('aes-128-cbc', aes_key, iv);
        let decrypted = Buffer.concat([decipher.update(final_payload), decipher.final() ])

        let raw_message = decrypted;
        let message_size = raw_message.slice(0, 4)
        let size_num = message_size.readUInt32LE();

        const verify = createVerify('SHA256');
        let signature = raw_message.slice(size_num + 4);
        let text = raw_message.slice(0, size_num + 4);
        verify.write(text);
        verify.end();
        const result = verify.verify(public_key, signature)
        assert(result === true)
        });
      let sample_transaction_stream = '07a787acdb939713f6d19be1077eed1be7a53e039f60ddd96231d4de8fb525960000'
        it('can get send payload' , async() => {

          let sent_msg = 'hello, encrypted world!'
          let messages = await dataWriter.sendPayload(sample_dev_eui, sent_msg)
          // console.log(messages)
          let t_obj = await dataWriter.getOngoingTransactions(sample_address_stream);
    
    
          }).timeout(60000);

            it('can get payload sent on tangle and decrypt it' , async() => {
              let sent_msg = 'hello, encrypted world!'
              let messages = await dataWriter.sendPayload(sample_dev_eui, sent_msg)


              // console.log(messages)
              let t_obj = await dataWriter.getOngoingTransactions(sample_address_stream);
              let resp = await dataWriter.client.getMessage().index(t_obj[0].idx)

              for (const ans of resp){

                  try
                  {
                    let msg = await dataWriter.client.getMessage().data(ans);

                  let encrypted_message = Buffer.from(msg.message.payload.data, 'hex');

                  let decipher = createDecipheriv('aes-128-cbc', t_obj[0].session_key.slice(0, 16), t_obj[0].init_vector);
                  let decrypted = Buffer.concat([decipher.update(encrypted_message), decipher.final() ])
                  let raw_message = decrypted
                  let message_size = decrypted.slice(0, 4)
                  let size_num = message_size.readUInt32LE();

                  const verify = createVerify('SHA256');
                  let signature = raw_message.slice(size_num + 4);
                  let text = raw_message.slice(0, size_num + 4);
                  verify.write(text);
                  verify.end();
                  const result = verify.verify(public_key, signature)

                    let final_message = text.slice(4)

                  console.log(result);
                  assert(result === true)


                  assert(final_message.toString('utf-8') === sent_msg)
                  }
                  catch(e){
                    console.log(e);
                  }
              


              }
        
        
              }).timeout(60000);
 
})

