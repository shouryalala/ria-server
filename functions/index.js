const functions = require('firebase-functions');
//const admin = require('firebase-admin');
const {db, auth} = require('./admin');
const twilioAccSid = 'ACa5c1c8a644b5865026a9efb1633d564a';
const twilioAuthToken = 'eb2f66297a8319ecae91f53851c14778';
const twilio = require('twilio')(twilioAccSid, twilioAuthToken);
const requestModule = require('./requests');
const visitModule = require('./visits');
const util = require('./utils');

/**
 * Terminal commands
 * npm run-script lint
 * firebase deploy --only functions
 * firebase functions:log --only {function name} 
 */

/*
* createToken method - accepts mobile number and returns a custom JWT token for authentication
*/
exports.createToken = functions.https.onRequest((req, res) => {
    //fetch mobile number from query
    const today = new Date();
    console.log("Received createToken request at " + today.getTime());
    var mobile = req.query.mobile;

    if(mobile === null) {        
        mobile = req.body.mobile;
        console.log("Didnt receive mobile in query parameters. Body check reveiles: " + mobile);
        res.status(550).send();
    }
    
    if(mobile !== null) {
        auth.createCustomToken(mobile)
            .then(function(customToken) {
                console.log("Custom Token created successfully! Token: " + customToken);    
                res.setHeader('Content-Type', 'application/json');
                res.status(200);
                res.send(JSON.stringify({ token: customToken }));
                return 1;
            })
            .catch(function(error) {
                console.log("Custom Token genration failed: " + error);
                res.status(550).send();
            });
    }
    //TODO add end() somehow    
});

//************ Dummy Methods ********************************************************
//BOILERPLATE NOTIFICATION
exports.sendNotification = functions.https.onRequest((req, res) => {
	const sent_text = req.query.text;
	const promises = [];	
	const getInstaceIdToSend = admin.database().ref('/users').once('value').then(function(snapshot) {	
	//return Promise.all(admin.database().ref('/users').once('value')).then(function(snapshot) {	
		const instanceId = snapshot.val();
		console.log('notifying right here right now yo' + instanceId);

		const payload = {
			notification: {
				title: "You've got work",
				body: sent_text,
				icon: "default"
			}
		};
		return admin.messaging().sendToDevice(instanceId, payload)
                .then(function (response) {
                    console.log("Successfully sent message:", response);                    
                    return 1;
                })
                .catch(function (error) {
                    console.log("Error sending message:", error);
                    return 0;
                });
	});
    end();
});


exports.createJsObject = functions.https.onRequest((req, res) => {
    var docRef = db.collection("appts").doc();
    const lsd = {
        5: [4,5],
        6: [0,1],
        7: [3,4,5]
    }

    var packetF = {
        id: "peace on the ground",
        slotRef: lsd
    }

    return docRef.set(packetF).then(ress => {
        return res.status(200).send("Foxygen was a success");
    }).catch(error => {
        return res.status(500).send("Foxygen failed");
    });
});

exports.pushDataMessage = functions.https.onRequest((req, res) => {
    const instanceId = req.query.token;
    const payload = {
        data: {
            aid: 'Sadma',
            lname:'vati',
            click_action: 'FLUTTER_NOTIFICATION_CLICK'
        }
    };

    util.sendDataPayload(instanceId, payload);
    return res.status(200).send("Success");
});

exports.pushNotification = functions.https.onRequest((req, res) => {
    const instanceId = req.query.token;
    const payload = {
        notification: {
            title: 'Sadma',
            body:'vati',
            click_action: 'FLUTTER_NOTIFICATION_CLICK'
        }
    };

    util.sendDataPayload(instanceId, payload);
    return res.status(200).send("Success");
});

exports.pushDataNotification = functions.https.onRequest((req, res) => {
    const instanceId = req.query.token;
    const payload = {
        notification: {
            title: 'Sadma',
            body:'vati',
            click_action: 'FLUTTER_NOTIFICATION_CLICK'
        },
        data: {
            aid: 'Kehti',
            lname:'rahi',
            click_action: 'FLUTTER_NOTIFICATION_CLICK'
        }
    };

    util.sendDataPayload(instanceId, payload);
    return res.status(200).send("Success");
});


//BOILERPLATE FUNCTION
exports.sendDataPacket = functions.https.onRequest((req, res) => {
	const service = req.query.service;
	const address = req.query.address;
	const time = req.query.time;
	const priority = req.query.priority;
	const promises = [];	
	const getInstaceIdToSend = admin.database().ref('/users').once('value').then(function(snapshot) {	
	//return Promise.all(admin.database().ref('/users').once('value')).then(function(snapshot) {	
		const instanceId = snapshot.val();
		console.log('sending data packet as a notification' + instanceId);

		const payload = {
			data: {
				Service: service,
				Address: address,
				Time: time,
				Priority: priority
			}
		};
		return admin.messaging().sendToDevice(instanceId, payload)
                .then(function (response) {
                    console.log("Successfully sent message:", response);                    
                    return 1;
                })
                .catch(function (error) {
                    console.log("Error sending message:", error);
                    return 0;
                });
	});
    end();

});

//url: 'https://handler.twilio.com/twiml/EH85c13367eb9bd0456c90a363f632ee7c',
exports.hitMeUp = functions.https.onRequest((req, res) => {    
    twilio.calls
      .create({
         url: "https://handler.twilio.com/twiml/EH85c13367eb9bd0456c90a363f632ee7c",         
         to: '+919986643444',
         from: '+12019925236'
       })
      .then(call => {
        console.log(call.sid);
        return res.status(200).send("Success Yo");
      })
      .catch(error => {
        console.log(error);
        return res.status(500).send("Error!");
      });
});

//BOILERPLATE FUNCTION
exports.sendDataPacketFixedClient = functions.https.onRequest((req, res) => {
	const service = req.query.service;
	const address = req.query.address;
	const time = req.query.time;
	//const priority = req.query.priority;
    const promises = [];
    
    const instanceId = "eI_G6yeMYKM:APA91bEFa8OHe7l67ZO8Es5zgVVeIUKo6ok_BSg-MmB1H5YDBZYTt8_BOM_IwlT1aH6ilTWHsvFrUKglD3ImXrrajS4x0J6C0i26_xZCgMKAOmkwTMajuKFYDPkj2fFrIIMx0tduhwMW";
	
	console.log('sending data packet to client: ' + instanceId);

    const payload = {
        data: {
            Service: service,
            Address: address,
            Time: time,
            Command: COMMAND_WORK_REQUEST
            //Priority: priority
        }
    };
    return admin.messaging().sendToDevice(instanceId, payload)
            .then(function (response) {
                console.log("Successfully sent message:", response);
                return res.status(200).send("ok");
            })
            .catch(function (error) {
                console.log("Error sending message:", error);
                return res.status(500).send(error);
            });
});

exports.setArrayToDocument = functions.https.onRequest((req, res) => {
    var docRef = admin.firestore().collection(COLN_TIMETABLE).doc('2019_z23').collection('MAR').doc('c5vzN2aaUoYlrNuop7wt');
    var song = req.query.song;
    return docRef.update({
        t00: [dummy2],
        t10: [dummy1],
        t20: [dummy1],
        t30: [dummy1]        
    })
    .then(x => {
        console.log("Added to document fields. go check");
        return res.status(200).send('Done.');
    })
    .catch(error => {
        console.log("Whoops:  " + error);
        return res.status(500).send('error');
    });
});

exports.createDummyRequest = functions.https.onRequest((req, res) => {
    console.log("::createDummyRequest::INVOKED");
    const yearDoc = "2019";
    const monthSubCollection = "JUL"; 
    var packet = {
        user_id: "9986643444",
        service: req.query.service,
        date: new Date().getDate(),
        address:req.query.address,
        society_id: "bnx",
        asn_response: util.AST_RESPONSE_NIL,        
        status: util.REQ_STATUS_UNASSIGNED,
        req_time: parseInt(req.query.time),     //in secs since 12
        timestamp: Date.now()
    }

    return db.collection(util.COL_REQUEST).doc(yearDoc).collection(monthSubCollection).add(packet).then(() => {
        console.log("Dummy request created!");
        return res.status(200).send("Created automagically!");
    })
    .catch((error) => {
        console.error("Error creating dummy request: " + error);
        return res.status(500).send("Error: " + error);
    });
});

exports.createComplexObject = functions.https.onRequest((req, res) => {
    console.log("::createComplexObject::INVOKED");
    const yearDoc = "2019";
    const monthSubCollection = "NOV"; 
    const key = req.query.kez;
    var packet = {};
    var rObj = {
        in_diff: 32,
        out_diff: 42,
        total: 36
    };
    packet[key] = rObj;   
    
    
    return db.collection(util.COLN_ASSISTANTS).doc("Wesu70gc3HXtBZYAkapDr8dIJka2").collection("analytics").doc("2019-NOV-VDIFF").set(packet, {merge: true}).then(() => {
        console.log("Complex object created!");
        return res.status(200).send("Created automagically!");
    })
    .catch((error) => {
        console.error("Error creating dummy request: " + error);
        return res.status(500).send("Error: " + error);
    });
});


exports.getTimetably = functions.https.onRequest((req, res) => {    
    return getAvailableAssistant('abc','JUN',28,parseInt(req.query.stx),parseInt(req.query.enx),null,req.query.force).then(function(response){
        if(response === null) {
            console.log("Method failed");
            return res.status(500).send("BOOO");            
        }else{
            console.log("Method ran succesfully");
            console.log("Assistant ID: " + response.assistantId + " \nClient Token: " + response.assistantClientToken + "\nSlot Lib: " + response.freeSlotLib);
            return res.status(200).send("SUCCESS");
        }
    });
});


/**
 * GETAVAILABLEASSISTANT
 * @param {string} address 
 * @param {string} service 
 * @param {string} time (in system millis) 
 * @param {array} exceptions (array of assistants to ommit from availability)
 * 
 * return assistant = {name, instanceId, assId}
 */
var getAvailableAssistant2 = function(address, service, time, exceptions) {
    console.log("::getAvailableAssistant::INVOKED");    

    //TODO
    var aId = "alYssfTuB2Y1tTw5jEaQfVCxUhX2";

    return admin.firestore().collection(COLN_ASSISTANTS).doc(aId).get().then(doc => {
        const aDoc = doc.data();
        console.log("Fetched Available assitant details: Assistant name: " + aDoc.name + " ID: " + aId)
        var assistant = {
            name: aDoc.name,
            assId: aId,
            clientToken: aDoc.client_token
        }
        return assistant;
    })
    .catch(error => {
        console.error("Error fetching record: " + error);
        return null;
    });   
}
//***********************************************************************************

exports.userRequestHandler = functions.firestore
    .document('requests/{yearDocId}/{monthSubcollectionId}/{requestId}')
    .onCreate(requestModule.onCreateHandler);


exports.assistantResponseHandler = functions.firestore
    .document('requests/{yearDocId}/{monthSubcollectionId}/{requestId}')
    .onUpdate(requestModule.onUpdateHandler);

exports.visitHandler = functions.firestore
    .document('visits/{yearDocId}/{monthSubcollectionId}/{visitId}')
    .onUpdate(visitModule.onUpdateHandler);


