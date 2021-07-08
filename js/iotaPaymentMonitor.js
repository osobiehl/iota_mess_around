
const { ClientBuilder } = require('@iota/client'); 
const mysql = require('mysql2/promise');
const crypto = require('crypto')
const {createCipheriv, createDecipheriv, createSign, createVerify, generateKeyPairSync} = require('crypto');
const { setUncaughtExceptionCaptureCallback } = require('process');
const { exception } = require('console');
require('dotenv').config()


class iotaMysqlConnector{
  constructor(connection){
    if (!connection){
      throw new Error("please give a connection object or call the build method")
    }
    this.connection = connection;
  }
  static async build(credentials){
    let connection = await mysql.createConnection(credentials);
    return new iotaMysqlConnector(connection)
  }

 

  /**
   * @returns {string} the associated iota address
   * @param {string} dev_eui - the eui of the searched device after resolution
   */
  async getIotaAddress(dev_eui){
    let [rows, useless] = await this.connection.execute('SELECT iota_address from sensors where device_eui = ? ',
    [dev_eui])
    if (!rows.length)
      return null
    else return rows[0].iota_address
  }

  /**
   * 
   * @param {string} dev_eui - the device eui used as identifier
   * @returns {Promise<string>} - promise resolving to index
   */
  async getIotaIndex(dev_eui){
    let [rows, useless] = await this.connection.execute('SELECT iota_index from sensors where device_eui = ? ',
    [dev_eui])
    if (!rows.length)
      return null
    else return rows[0].iota_index
  }
  /**
   * 
   * @param {string} dev_eui 
   * @param {string} address - the IOTA address to be registered to the device
   * @param {*} index - the index the sensor will be associated to
   * @returns {number | null} the id of the newly created device, else
   */
  async registerDevice(dev_eui, address, index){
    try{
      let res = await this.connection.execute('INSERT INTO sensors (device_eui, iota_address, iota_index) VALUES  (?, ?, ?)',
      [dev_eui, address, index]);
      let [row, x] = await this.connection.execute('SELECT sensor_id from sensors where device_eui = ?',
      [dev_eui]);
      let sens_id = row[0].sensor_id
      this.connection.commit()
      return sens_id
      }
    catch(e)
    {
      console.log(e)
      return null
    }
  }

  /**
   * @summary returns all resolved transactions associated with a device eui
   * @param {string} dev_eui - device eui
   * @returns {Promise<Array<string>>} a promise resolving with an array of output ids
   * 
   */
  async getResolvedTransactionsFromEui(dev_eui){
    let result = await this.connection.execute(
      `SELECT r.output_id FROM resolved_transactions r INNER JOIN sensors s on s.sensor_id = r.sensor_id AND s.device_eui = ?`,
    [dev_eui])
    const [rows, fields] = result;
    let res = rows.map(obj=>obj.output_id)
    // console.log(res)
    return res;
  }

  /**
   * 
   * @param {string} address  iota address to searcg
   * @returns {Array<string>} resolved transactions related to an address
   */
  async getResolvedTransactions(address){
    let result = await this.connection.execute(
      `SELECT r.output_id FROM resolved_transactions r INNER JOIN sensors s on s.sensor_id = r.sensor_id AND s.iota_address = ?`,
    [address])
    const [rows, fields] = result;
    let res = rows.map(obj=>obj.output_id)
    // console.log(res)
    return res;
  }
  /**
 * 
 * @param {string} output_id - the output id to be resolved
 */
   async __removeOngoingTransactionIfExists(output_id){
    await this.connection.execute("DELETE FROM ongoing_transactions WHERE output_id =  ?",
     [output_id])
 }

 async getOngoingTransactions(address){
   let result = await this.connection.execute(
     `SELECT r.output_id, session_key, init_vector, idx, number_of_samples, current_data_count FROM ongoing_transactions r INNER JOIN sensors s on s.sensor_id = r.sensor_id AND s.iota_address = ?`,
   [address])
   const [rows, fields] = result;
   // console.log(res)
   return rows

 }
 async __incrementTransactionCount(address){
   let id = await this.getSensorId(address)
  let result = await this.connection.execute(
    'UPDATE ongoing_transactions SET current_data_count = current_data_count +1 WHERE sensor_id = ?',
  [id])
  this.connection.commit();
  let result2 = await this.connection.execute(
    'SELECT sensor_id, output_id FROM ongoing_transactions where current_data_count >= number_of_samples AND sensor_id = ? ',
  [id])
  const [rows, fields] = result2;
  for (const t of rows){
    console.log(`RESOLVING ${t.output_id} AFTER REACHING INCREMENT END`)
    await this.__resolveTransaction(address, t.output_id)
  }


 }


 async getTransactionsInSystem(address){
   let resolved = await this.getResolvedTransactions(address)
   let ongoing = await this.getOngoingTransactions(address)
   return resolved.concat(ongoing)
 }




  /**
   * 
   * @param {string} address - the bech32 address searched 
   * @param {string} output_id - the output id to be resolved
   */
  async __resolveTransaction(address, output_id){
      await this.__removeOngoingTransactionIfExists(output_id)
      let sens_id = await this.getSensorId(address)
      if (!sens_id){
          // console.log(`address: ${address}, output_id: ${output_id}`)
          throw new Error("address not identified to sensor in database!")
      }
      let result = await this.connection.execute(
          `INSERT INTO resolved_transactions (sensor_id, output_id) VALUES  (?,?)`,
          [sens_id,output_id]
      )
      this.connection.commit()
  }

  /**
   * 
   * @returns  {Array<string>} all sensor addresses found in the database
   */
  async getSensorAddresses(){
    let [rows, x] = await this.connection.execute("SELECT iota_address FROM sensors");
    return rows.map(r=>r.iota_address);

  }
  /**
   * 
   * @param {string} address address to be searched
   * @returns {number | null } the id or null
   */
  async getSensorId(address ){
      
      let [rows, x] = await this.connection.execute("SELECT sensor_id FROM sensors WHERE iota_address=  ?",
      [address])
      if (rows === [])
        return null
      return rows[0].sensor_id;
  }


  async insertOngoingTransaction(sensor_address, output_id, iotaEncryption_obj, number_samples=100, starting_count=0){
    let id = await this.getSensorId(sensor_address)
    if (!id){
      throw new Error('sensor address not found in database!')
    }

    let x = iotaEncryption_obj;
    ['index', 'secret', 'iv'].forEach( k=>{
        if (!iotaEncryption_obj[k]){
          throw new Error(`${k} not found in iotaEncryption object!`)
        }
      }
    )
    

    let result = await this.connection.execute(
      'INSERT INTO ongoing_transactions (sensor_id, output_id, session_key, init_vector, idx, number_of_samples, current_data_count) VALUES  (?, ?, ?, ?, ?, ?, ?)',
      [id, output_id, x.secret, x.iv, x.index, number_samples, starting_count]
  )

  this.connection.commit()

  }
}



class iotaPaymentMonitor extends iotaMysqlConnector{

    /**
     * @summary DO USE BUILD METHOD TO CREATE AN OBJECT PASSING AN ASYNC MYSQLCONNECTION!
     * @param {iotaMysqlConnector} mysqlconnection - underlying connection to connect to backend
     * 
     */
    constructor(connection){
        super(connection)
        this.client = new ClientBuilder().build();
    }

    static async init(credentials){
        let connection = await mysql.createConnection(credentials);
        return new iotaPaymentMonitor(connection)
    }


  /**
   * 
   * @typedef unresolved_payments
   * @type {object}
   * @property {string} output_id the output id used to identify the transaction
   * @property {string} source_address the source that sent the payment
   * @property {string} sensor_address the address of the sensor involved
   * @property {Object: {index: string, data: string, type: number}} payload the encoded payload
   */


    /**
     * 
     * @description gets all payments that have not been marked as resolved
     * @param {string} address to monitor new changes 
     * @returns {Array<unresolved_payments>} the resulting addresses that require action
     */
    async getUnresolvedAddressPayments(address){
        let new_payments = await this.getNewTransactions(address);
        // console.log("got new transactions!")

        let unresolved_payments = []
        for (const payment of new_payments){
            let data = await this.__getTransactionMessage(payment)
            if (data)
            {   let output = this.__getTransactionOutput(data)
              
              let validation = await this.__validateTransactionOutputs(address, output)
              console.log("GOING THROUGH VALIDATION!! ~~~~\n\n\n\n")
              console.log(validation);
              if (!validation){
                  await this.__resolveTransaction(address, payment);
              }
              else{
                  unresolved_payments.push({
                      message_id: data.messageId,
                      output_id: payment,
                      source_address: validation,
                      sensor_address: address,
                      payload: this.__getTransactionPayload(data)
                  })
              }
           }
           else
           {
           	console.log("NO DATA FOUND \n\n\n\n\n\n)")
            await this.__resolveTransaction(address, payment)
           }
        }
        return unresolved_payments;
    }

    /**
     * 
     * @param {function(string, Array<unresolved_payments>)} callback callback used to iterate on each unresolved transaction 
     */
    async mainLoop( callback ){
        let addresses = await this.getSensorAddresses()
        addresses.forEach(async(addr)=>{
            let unresolved_payments = await this.getUnresolvedAddressPayments(addr);
             await callback(unresolved_payments)
        })
    }

    async getAllUnresolvedPaymentAddresses(){
      let addresses = await this.getSensorAddresses()

      let res = []
      await Promise.all(addresses.map(async(addr)=>{
        let unresolved_payments = await this.getUnresolvedAddressPayments(addr);
        res = res.concat(unresolved_payments)
      }))
      return res;
    }
    /**
     * 
     * @param {unresolved_payments} unresolved_payments 
     * @param {iotaEncryption} iotaEncryption 
     * @param {crypto.KeyObject} signature_key used for ECDSA signature
     */
    async sendPaymentResponse(unresolved_payment, iotaEncryption, signature_key){
      // console.log('message id: '+unresolved_payment.message_id)
      // // console.log('unresolved payment: ')
      // console.log(unresolved_payment)
      let idx = Buffer.from(unresolved_payment.message_id, 'hex').slice(0, 16)
      
      let message = await this.client.message()
      .index(idx)
      .data(iotaEncryption.generatePayload(signature_key) )
      .submit()
      // console.log('sent message: ')
      // console.log(message)


    }

    async setUpNewPaymentStreams(signature_key){
      let new_payments = await this.getAllUnresolvedPaymentAddresses();
      // console.log(new_payments)
      
      new_payments.forEach(async(payment) =>{
        try{
        let encryption = new iotaEncryption(payment.payload)
        await this.insertOngoingTransaction(payment.sensor_address, payment.output_id, encryption)
        await this.sendPaymentResponse(payment, encryption, signature_key)
        }
        catch(e){
          console.log(e);
          await this.__resolveTransaction(payment.sensor_address, payment.output_id)

        }
      })
      return new_payments


    }

    /**
     * 
     * @param {string} address - the iota address being monitored
     * @returns {Array<string>} - the transaction payments
     */
    async getNewTransactions(address){
        try{
            let total_payments = await this.client.getAddressOutputs(address)
            let known_payments = await this.getTransactionsInSystem(address)
            const missing = total_payments.filter(p => !known_payments.includes(p) )
            return missing
        }
        catch(e){
            console.log(e)
            return []
        }
    }
    /**
     * 
     * @param {output} output from iota thing 
     * @returns {Object} message object
     */

    async __getTransactionMessage(output){
      
      try{
        const msg_id = (await this.client.getOutput(output)).messageId;
        let data = (await this.client.getMessage().data(msg_id))
        return data
      }catch(e){
        return null;
      }
    }


    /**
     * @description parses an output id to get its related outputs
     * @param {string} output - iota transaction output
     * @returns {Array<string>>|null} the outputs associated to the transaction, null if the message was not found
     * 
     */
    __getTransactionPayload(data){
      return data.message.payload.essence.payload
    }

   __getTransactionOutput(data){

        return data.message.payload.essence.outputs
    }
    /**
     * @description validates outputs related to a transaction
     * @param {string} address the address being looked up
     * @param {Array<Object>} the outputs received from getTransactionOutput
     * @returns {string|null} the address of the validated transaction, null if nothing is validated
     */
    async __validateTransactionOutputs(receiver_address, output){
        const sample_payment_threshhold=0
        let destintation_address = null;
        for (const t of output){
            
            let addr = t.address.address;
            let bech32 = await this.client.hexToBech32(addr)
            // console.log(`bech32: ${bech32}`)
            if (bech32 === receiver_address ){
                // console.log("match!")
                if (t.amount < sample_payment_threshhold){
                    console.log('below payment threshold!')
                    return null;
                }
                destintation_address = bech32
            }
        }
        if (!destintation_address){
            return null
        }

        //returns the first non-owner address found in bech32 format
        for (const t of output){
            const bech32 = await this.client.hexToBech32(t.address.address);
            if (bech32 !== destintation_address)
                return bech32
        }
    }
}

class iotaEncryption{
  /**
   * 
   * @param {Object: {index: string, data: string}} payload object received from iota message 
   */
  constructor(payload){
    this.ecdh = crypto.createECDH('prime256v1')
    this.keys = this.ecdh.generateKeys()
    this.externalPublicKey = Buffer.from(payload.data, 'hex')
    this.secret = this.ecdh.computeSecret(this.externalPublicKey)
    // console.log("Secret: ")
    // console.log(this.secret.length)
    //now we generate our index:
    this.index = Buffer.from(Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 8));

    let hash =  Buffer.from( crypto.createHash('sha256').update(this.secret).digest('hex') , 'hex' )
    this.iv = hash.slice(0, 16)
    
    // console.log("iv ")
    // console.log(this.iv)
    // console.log(this.iv.length)



  }

  static SignECDSA( message, private_key){

    if (!private_key){

    }
    const sign = createSign('SHA256');
    sign.update(message)
    sign.end();
    const signature = sign.sign(private_key);
    return signature;


  }

  
  __encryptAES128(data, inputFormat){
    const algorithm_name = 'aes-128-cbc'
    const aes_secret = this.secret.slice(0, 16);
    const cipher = createCipheriv(algorithm_name, aes_secret, this.iv);
    // cipher.setEncoding('hex');
    let encrypted = cipher.update(data, inputFormat);
    encrypted += cipher.final('binary');
    return encrypted
  }

  


  /**
   * 
   * @returns {string} the public key to post on the tangle, in base64
   */
  getPublicKey(){
    return  Buffer.from(this.ecdh.getPublicKey('hex', 'compressed'), 'hex' )
  }
  
  getSecret(){
    return this.secret
  }

  generatePayload(signature_key){
    let encrypted_index = Buffer.from( this.__encryptAES128(this.index, 'binary'), 'binary' )
    
    let unsigned_payload = Buffer.concat( [this.getPublicKey(),  encrypted_index] )
    
    let signature = iotaEncryption.SignECDSA(unsigned_payload, signature_key)

    let res = Buffer.concat([unsigned_payload, signature])

    return res;

  }
}


class iotaDataWriter extends iotaMysqlConnector {

    /**
     * @summary DO USE BUILD METHOD TO CREATE AN OBJECT PASSING AN ASYNC MYSQLCONNECTION!
     * @param {iotaMysqlConnector} mysqlconnection - underlying connection to connect to backend
     * 
     */
     constructor(connection, signingKey){
      super(connection)
      this.client = new ClientBuilder().build();
      this.signingKey=signingKey;
  }

  static async init(credentials, signingKey){
      let connection = await mysql.createConnection(credentials);
      return new iotaDataWriter(connection, signingKey)
  }
  /**
   * 
   * @param {string} device_eui 
   * @param {*} payload 
   * @description: logs a data value on the tangle for each ongoing transaction,
   * then increases transaction count
   * @returns 
   */
  async sendPayload(device_eui, payload){
    let iota_address = await this.getIotaAddress(device_eui);
    let transactions = await this.getOngoingTransactions(iota_address);
    // console.log(transactions);
    let results = transactions.map(async(t_obj)=>{
      t_obj.session_key = t_obj.session_key.slice(0, 16);
      let message_to_send = this.preparePayload(t_obj, payload)
      let index = t_obj.idx;
      await this.__incrementTransactionCount(iota_address)

      let message = await this.client.message()
      .data(message_to_send )
      .index(index)
      
      .submit()
      //console.log(message);  
      return message
    })
    return Promise.all(results);
                 
  }

  prependPayloadSize(buf){
    let b = new Buffer.alloc(4);
    b.writeUInt32LE(buf.length);
    return Buffer.concat([b, buf])
  }

  signPrependedPayload(prepended_payload){
    const sign = createSign('SHA256');
    sign.update(prepended_payload)
    sign.end();
    const signature = sign.sign(this.signingKey);
    return Buffer.concat([prepended_payload, signature]);
  }

  encryptPayload(transaction_obj, payload){
    const algorithm_name = 'aes-128-cbc'
    const aes_secret = transaction_obj.session_key
    const iv = transaction_obj.init_vector

    const cipher = createCipheriv(algorithm_name, aes_secret, iv);
    // cipher.setEncoding('hex');
    // payload = payload.toString('hex')
    // console.log(payload)
    // let encrypted = cipher.update(payload, 'hex', 'hex');
    return Buffer.concat([cipher.update(payload), cipher.final()])
  }

  preparePayload(transaction_obj, payload){
    if (typeof(payload) !== 'string')
    payload = JSON.stringify(payload);
    let payload_buffer = Buffer.from(payload, 'utf-8');
    let prepended_buffer =  this.prependPayloadSize(payload_buffer);
    let signed_prepended_buffer = this.signPrependedPayload(prepended_buffer)
    let final_payload = this.encryptPayload(transaction_obj, signed_prepended_buffer)
    return final_payload;
  }
  

  

}



module.exports={iotaMysqlConnector, iotaPaymentMonitor, iotaEncryption, iotaDataWriter}

