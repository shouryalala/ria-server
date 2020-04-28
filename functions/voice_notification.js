var request = require("request");
const util = require('./utils');
const { db } = require('./admin');
const authKey = 'c2hvdXJ5YWxhbGE6NTk0QkJGOTUtMTc5MS1ERUJBLTc1RTYtRUJEQkY4RDMyRjA5';
// const voice_body = "<speak><prosody volume='x-loud' rate='slow' pitch='high'>NAJMA, AAPKE LIYE KAAM AAYA HAI, KRIPYA APP KHOLE,"+
//  "NAJMA, AAPKE LIYE KAAM AAYA HAI, KRIPYA APP KHOLE, NAJMA, AAPKE LIYE KAAM AAYA HAI, KRIPYA APP KHOLE, AAPKE LIYE KAAM AAYA HAI, KRIPYA APP KHOLE</prosody></speak>";
const BODY = "AAPKE LIYE KAAM AAYA HAI, KRIPYA APP KHOLE";
const BREAK = ", ";
const HEADER = "<speak><prosody volume='x-loud' rate='slow' pitch='high'>";
const FOOTER = "</prosody></speak>";
/**
 * SENDVOICENOTIFICATION
 */
exports.sendVoiceNotification = async function(astId) {
    console.log('::SENDVOICENOTIFICATION::INVOKED--for: ', astId);
    if(astId === undefined) {
        console.error('Invalid asistant Id received');
        return false;
    }
    //1. Get ast mobile number
    let assistantDetails = await db.collection(util.COLN_ASSISTANTS).doc(astId.trim()).get();
    if(!assistantDetails.exists || assistantDetails.data().mobile === undefined) {
        console.error("Invalid assistant object");
        return false;
    }
    let astName = assistantDetails.data().name;
    let astMobile = assistantDetails.data().mobile;    
    console.debug('Voice Params:',astName, astMobile);
    let voice_body = constructBody(astName);

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
                body: voice_body,
                lang: 'en-in',
                country: 'IN',
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

var constructBody = function(name) {
    let sVoice = "";
    if(name !== undefined)
        sVoice = HEADER + name.toUpperCase() + BREAK + BODY + BREAK + name.toUpperCase() + BREAK + BODY + BREAK + name.toUpperCase() + BREAK + BODY + BREAK + BODY + FOOTER;
    else 
        sVoice = HEADER + BODY + BREAK + BODY + BREAK + BODY + BREAK + BODY + FOOTER;
    console.debug("Voice string constructed: " + sVoice);
    return sVoice;
}
