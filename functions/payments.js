const express = require('express');
const cors = require('cors');
const {auth} = require('./admin');
const util = require('./utils');

const app = express();
app.use(cors({origin: true}));

const BASIC_CX_SERVICE_CHARGE = 40.0;
const BASIC_UX_SERVICE_CHARGE = 25.0;
const BASIC_DX_SERVICE_CHARGE = 30.0;

app.get('/', async (req,res) => {    
    console.log('Payments Module:: GETCHARGE INVOKED:');
    if(!await requestAuthorised(req)) {
        console.error('The request recevied was not authorised. Discarding request');
        return res.status(500).send('Unauthorised Request');
    }
    try{        
        if(req.query.service === undefined || req.query.socId === undefined || req.query.reqTime === undefined) {
            console.error('Received Invalid parameters: ',req.query.service, req.query.socId, req.query.reqTime);
            return res.status(500).send('Invalid Parameters. Discarding message');                    
        }
        return res.status(200).send(getServiceCharge(req.query.service, req.query.socId, req.query.reqTime));
    }catch(e) {
        console.error('Failed to execute get Charge method, ', e);
        return res.status(500).send('Request Failed');
    }
});

var getServiceCharge = (service, socId, reqTime) => {
    console.log('Calculating charge for: ',service, '\t', socId, '\t', reqTime);
    // let min = 0;
    // let max = 100;    
    // let calCost = Math.random()*(max - min);
    // return {
    //     cost: calCost
    // };

    //Setting a simple service charge calculator for now
    switch(service) {
        case util.SERVICE_CLEANING: return BASIC_CX_SERVICE_CHARGE;
        case util.SERVICE_UTENSILS: return BASIC_UX_SERVICE_CHARGE;
        case util.SERVICE_DUSTING: return BASIC_DX_SERVICE_CHARGE;
        case util.SERVICE_CLEANING_UTENSILS: return BASIC_CX_SERVICE_CHARGE + BASIC_UX_SERVICE_CHARGE;
        case util.SERVICE_CLEANING_DUSTING: return BASIC_CX_SERVICE_CHARGE + BASIC_DX_SERVICE_CHARGE;
        case util.SERVICE_DUSTING_UTENSILS: return BASIC_DX_SERVICE_CHARGE + BASIC_UX_SERVICE_CHARGE;
        case util.SERVICE_CLEANING_DUSTING_UTENSILS: return BASIC_CX_SERVICE_CHARGE + BASIC_DX_SERVICE_CHARGE + BASIC_UX_SERVICE_CHARGE;
        default: return BASIC_DX_SERVICE_CHARGE;
    }
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

module.exports = {app, getServiceCharge}