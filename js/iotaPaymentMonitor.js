
const { ClientBuilder } = require('@iota/client'); 
const mysql = require('mysql2/promise');
const crypto = require('crypto')

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
   * @param {Promise<string>} dev_eui - the eui of the searched device after resolution
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
   * @param {string} address - the bech32 address searched 
   * @param {string} output_id - the output id to be resolved
   */
  async __resolveTransaction(address, output_id){
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
        console.log("got new transactions!")

        let unresolved_payments = []
        for (const payment of new_payments){
            let data = await this.__getTransactionMessage(payment)
            if (data)
            {   let output = this.__getTransactionOutput(data)
              
              let validation = await this.__validateTransactionOutputs(address, output)
              //console.log("validated!")
              if (!validation){
                  await this.__resolveTransaction(address, payment);
              }
              else{
                  unresolved_payments.push({
                      output_id: payment,
                      source_address: validation,
                      sensor_address: address,
                      payload: this.__getTransactionPayload(data)
                  })
              }
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
      for (const addr of addresses){
        let unresolved_payments = await this.getUnresolvedAddressPayments(addr);
        res = res.concat(unresolved_payments)
      }
      return res;
    }





    /**
     * 
     * @param {string} address - the iota address being monitored
     * @returns {Array<string>} - the transaction payments
     */
    async getNewTransactions(address){
        try{
            let total_payments = await this.client.getAddressOutputs(address)
            let known_payments = await this.getResolvedTransactions(address)
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
      const msg_id = (await this.client.getOutput(output)).messageId;
      // console.log(`message id: ${msg_id}`)
      try{
        let data = (await this.client.getMessage().data(msg_id))
        return data
      }catch(e){
        // console.log(e)
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
        const sample_payment_threshhold=1000000
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
    console.log(crypto.getCurves())
    this.ecdh = crypto.createECDH('prime256v1')
    this.keys = this.ecdh.generateKeys()
    this.externalPublicKey = Buffer.from(payload.data, 'hex')
    this.secret = this.ecdh.computeSecret(this.externalPublicKey)
    console.log("Secret: ")
    console.log(this.secret.toString('hex'))
  }

  /**
   * 
   * @returns {Buffer} the public key to post on the tangle
   */
  getPublicKey(){
    return this.keys.getPublicKey()
  }
  getSecret(){
    return this.secret
  }

  
}
module.exports={iotaMysqlConnector, iotaPaymentMonitor, iotaEncryption}

