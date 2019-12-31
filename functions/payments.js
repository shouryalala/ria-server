const express = require('express');
const cors = require('cors');
const {auth} = require('./admin');

const app = express();
app.use(cors({origin: true}));

app.get('/', async (req,res) => {    
    console.log('Payments Module:: GETCHARGE INVOKED:');
    if(!await requestAuthorised(req)) {
        console.error('The request recevied was not authorised. Discarding request');
        res.status(500).send('Unauthorised Request');
    }
    try{        
        if(req.query.service !== undefined && req.query.socId !== undefined && req.query.reqTime !== undefined) {
            res.status(200).send(getServiceCharge(req.query.service, req.query.socId, req.query.reqTime));
        }
        console.error('Received Invalid parameters: ',req.query.service, req.query.socId, req.query.reqTime);
        res.status(500).send('Invalid Parameters. Discarding message');        
    }catch(e) {
        console.error('Failed to execute get Charge method, ', e);
        res.status(500).send(e);
    }
});


//TODO
let getServiceCharge = (service, socId, reqTime) => {
    console.log('Calculating charge for: ',service, '\t', socId, '\t', reqTime);
    let min = 0;
    let max = 100;    
    let calCost = Math.random()*(max - min);
    return {
        cost: calCost
    };
}

let requestAuthorised = async function(req) {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        console.log('Found "Authorization" header');
        // Read the ID Token from the Authorization header.
        idToken = req.headers.authorization.split('Bearer ')[1];
        console.log('Token found: ', idToken);
    //   } else if(req.cookies) {
    //     console.log('Found "__session" cookie');
    //     // Read the ID Token from cookie.
    //     idToken = req.cookies.__session;
    } else {                
       return false;
    }

    try {
       const decodedIdToken = await auth.verifyIdToken(idToken);
       console.log('ID Token correctly decoded', decodedIdToken);        
       return true;
    } catch (error) {
       console.error('Error while verifying Firebase ID token:', error);        
       return false;
    }    
}

module.exports = {app}