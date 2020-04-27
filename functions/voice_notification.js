var request = require("request");

exports.sendVoiceNotification = function(mobile,body) {
    var options = { 
        method: 'POST',
        url: 'https://rest.clicksend.com/v3/voice/send',
        headers: 
        {   'cache-control': 'no-cache',
            'content-type': 'application/json',
            authorization: 'Basic c2hvdXJ5YWxhbGE6NTk0QkJGOTUtMTc5MS1ERUJBLTc1RTYtRUJEQkY4RDMyRjA5' },
        body: { 
            messages: 
            [ { voice: 'female',
                require_input: 0,
                to: mobile,
                body: body,
                lang: 'en-in',
                custom_string: 'custom_string' } ] 
            },
        json: true 
    };

    request(options, function (error, response, body) {
        //if (error) throw new Error(error);
        if(error) console.error('error:', error); 
        console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
        console.log('Voice Notification result: ', body);         
    });
}
