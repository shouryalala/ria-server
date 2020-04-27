var request = require("request");
const { db } = require('./admin');
const authKey = 'c2hvdXJ5YWxhbGE6NTk0QkJGOTUtMTc5MS1ERUJBLTc1RTYtRUJEQkY4RDMyRjA5';

/**
 * SENDVOICENOTIFICATION
 */
exports.sendVoiceNotification = async function(astId) {
    if(astId === undefined) {
        console.error('Invalid asistant Id received');
        return false;
    }
    //1. Get ast mobile number
    let assistantDetails = await db.collection(COLN_ASSISTANTS).doc(astId.trim()).get();
    if(!assistantDetails.exists || assistantDetails.data().mobile === undefined) {
        return false;
    }
    let astName = assistantDetails.data().name;
    let astMobile = assistantDetails.data().mobile;    

    //2.Construct rest post request
    var options = { 
        method: 'POST',
        url: 'https://rest.clicksend.com/v3/voice/send',
        headers: 
        {   'cache-control': 'no-cache',
            'content-type': 'application/json',
            authorization: `Basic ${authKey}` },
        body: { 
            messages: 
            [ { voice: 'female',
                require_input: 0,
                to: astMobile,
                body: body,
                lang: 'en-in',
                custom_string: 'custom_string' } ] 
            },
        json: true 
    };

    //3.Send request
    request(options, function (error, response, body) { //TODO use async/await 
        //if (error) throw new Error(error);
        if(error) console.error('error:', error); 
        console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
        console.log('Voice Notification result: ', body);         
    });

    return true;
}
