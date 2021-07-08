require('dotenv').config()
const secret = process.env.SECRET_KEY
const { ClientBuilder } = require('@iota/client');

const client = new ClientBuilder().build();





async function setup() {


    const addresses = await client.getAddresses(secret)
    .accountIndex(0)
    .range(0, 10)
    .get();
    console.log("logging addresses: \n")
    console.log(addresses)
    const address = addresses[0];
    const sampleData = JSON.stringify({
        'temperature': '100.325',
        'scale': 'C',
        "extra": "THIS IS A TESTERINO"
    })
    console.log(address)
    try{
        console.log("balance of account 1: ")
        console.log(await client.getAddressBalance(address))
        //const message = await 
        client.message()
        .index('TEST JOSE LMAOKAI')
        .data(sampleData)
        .seed(secret)
        .accountIndex(0)
        .output('atoi1qzy73208r0lkhmvspyfq9mpytg0zu0wp6xwh5yl250d0ky962rzzqe4y3sv', 1690000)
        .submit().then(message => {
            console.log(JSON.stringify(message))
            console.log('\n')
            console.log(   JSON.stringify(message.message.payload.essence.payload))
        }).catch(e =>{
            console.log(e)
        })
    }
    catch(e){
        console.log(e)
    }


      
}
async function output_tests(){
    const addresses = await client.getAddresses(secret)
    .accountIndex(0)
    .range(0, 200)
    .get();

    console.log("logging addresses: aaa\n")
    console.log(addresses)
    const address = addresses[0];
    const sampleData = JSON.stringify({
        'temperature': '100.325',
        'scale': 'C',
        "extra": "THIS IS A TESTERINO"
    })
    console.log(address)
    const destintation_address = "atoi1qqydc70mpjdvl8l2wyseaseqwzhmedzzxrn4l9g2c8wdcsmhldz0ulwjxpz";
    let test = await client.getAddressOutputs(destintation_address)

    console.log(test)
    await test.forEach( async(transaction) => {
        resp = await client.getOutput(transaction)
        console.log(resp)
    })
    console.log("total balance: ")
    console.log(await client.getAddressBalance("atoi1qqydc70mpjdvl8l2wyseaseqwzhmedzzxrn4l9g2c8wdcsmhldz0ulwjxpz"))
}



// // const iotaClient = require('@iota/client')
// // const ClientBuilder  = iotaClient.ClientBuilder
// const client = new ClientBuilder().build();
// const msg = {index: 'abcdefg'}
// client.message()
// .index(msg.index)
// .data('hello, world!')
// .submit().then(message => {
//     console.log(message)
// })
// return;
// output_tests()
setup();






