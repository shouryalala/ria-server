const functions = require('firebase-functions');
// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');

//var serviceAccount = require('kanta-6f9f5-firebase-adminsdk-53vmc-c7119079df.json');
//firebase-adminsdk-53vmc@kanta-6f9f5.iam.gserviceaccount.com

/**
 * Terminal commands
 * npm run-script lint
 * firebase deploy --only functions
 * firebase functions:log --only {function name} 
 */

//OLD
//admin.initializeApp(functions.config().firebase);
//NEW
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: 'kanta-6f9f5',
    clientEmail: 'firebase-adminsdk-53vmc@kanta-6f9f5.iam.gserviceaccount.com',
    privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQClIavgMQGsqAar\nd+KNowlif8d7PyRo03xM0wVbpcA8PnqnxRLtOSjGfHFeIbeJ0f5O5JzUavjBdTkF\nq4NAuWJvfcXMPlbF9OmLrP8428y7ZKTz37Z2o89teXAWi6pt25ERoJd8HcvM49gt\niljBbUgHL7Ckm8wFD+h2m/LTeDEpS2KVpmQcawd3H5ZYR59bBQZFhym9XXVOBxl3\njUpz33LgI8SIjgPyq6RzI0syJkxjSLRTZliI0oZza9pA8oyMFAW30ytS4kfjnky5\nLsm6sC9UcLHKRXu0yo8qFz88IFWApL6gr/Ko68iJTpKH4Ix00O4D+Y+ThyLyhcjI\ncmjKlhAZAgMBAAECggEAM3ASKINLeLtcXIQ7G5CaJ0cTXeZU0pxyH0IqbJpsj7eM\noH8IfsGr3Gw+KirJj9JMa8nVumtZ8nUv3n7HI1279mvQtecDQ6WfLEWmuNDq7MKU\niWz52un6/qhxzGwUGiVngnyqQ1zKs5eTqtfp/tKqOabW2Oe4/Siv6mZ4lPvfIHPd\nU8js1jlVqfQI1JbcdKoLJDF4IcD+Hz1Bu40BA3Rfivhm8ljyX86GhWNsHCMjQTwH\nrEefoB1pa0fkUjIo7vpdyuNVyID3OvwJsJWYd7J7vooqYJpL8cZDNUudxUaBM/zr\ncsyAvwRkV9FD8/C39fBX23ctbSZHJBPqIzVJ4XDeswKBgQDXtGbssSdPTzRZcTTU\n3xfudMntpdKOLvG2tlZR2itvW/Z9+AsDvp/i0FQfnlMWWRhnz8ydJvYfUlMYD26Z\nLOJczhuy3WLqbfFG5mVCgu7tF5qtwlpmjIoE2dBj29CpE3FczmMJjVCBaxmqazZm\nbuTQwI5mASQaNlyKGM9caaqg/wKBgQDD+rhQX55vlsiS0Dd2xBnJ1O62w0Pm/KGQ\n0STbKbvmyFoR58xoZVejhAYlZPjbm8HFhBRgGY982KlBxn38eWfCvgzpEJv3U9Bw\nqd8dhq7WivywwuIAxbwEQ/CEeYHSWq1sWJ49JsDDDjXc1F5oU7RtHwOlKbsX53FN\ny51kQ1c25wKBgH+F5ud94EiSAdfzBpHnBsXyA8Ncqntmo34qlCO2AMHIM5TLhO+E\nzg+QrHs45dQrfjM5dbVe6FkiGX/6957VG0pUi6mWGrmPn/oTkb/dmpVOxCJ/6WQB\nKEOv5fRzawvaM8XzOjfWdMbeY4EN+05Ztyr2+/iwKgDZLKJ0AnuW+MpPAoGBAKqn\nbFAws1ogRs/xGBsHcB1cmfHz3vEJE/dy51Eg6kpwNF5bJpfRh5sPn/p4DmvNGdLQ\nzJ1SJKxmThzEp3huj3f43m0k1WttRJiWk362hRC1Poz9Zqedh7d/IbV5yR5Pb6xl\nDoXZdQllGmoNU5gtK3PKCfaMfCq4kuVXZNql+RAJAoGAWl6jHaFAIbyF4n54vp8m\nQu7kF7y0AuIvpL6v3/TuRzpQ/PIjH8k8xaJ6AQHiq5CXPLONbAYD5MHDS6hGjIIF\nq1r+01C8lHafeffZR92wAoO8XHASV76qvfGmsDpXW6SbTlCycGTakJZzxSXwyxsq\nbbO+52HaKOqB/7oHrfH0yjc=\n-----END PRIVATE KEY-----\n'
  }),

  databaseURL: 'https://kanta-6f9f5.firebaseio.com'
});
//fix timestamps for firestore
admin.firestore().settings({timestampsInSnapshots: true});

//Firebase collections
const COLN_USERS = "users";
const COLN_ASSISTANTS = "assistants";
const COL_REQUEST = "requests";
//Firebase db fields
const AST_TOKEN = "client_token";
const AST_TOKEN_TIMESTAMP = "ct_update_tmstmp";
const REQ_STATUS_ASSIGNED = "ASN";
const REQ_STATUS_UNASSIGNED = "UNA";
const AST_RESPONSE_NIL = "NIL";
const AST_RESPONSE_ACCEPT = "ACCEPT";
const AST_RESPONSE_REJECT = "REJECT";
const COMMAND_WORK_REQUEST = "WRDP";
//Service decodes
const SERVICE_CLEANING = "Cx";
const SERVICE_DUSTING = "Dx";
const SERVICE_UTENSILS = "Ux";
const SERVICE_CHORE = "Chx";
const SERVICE_CLEANING_UTENSILS = "CUx";


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
        admin.auth().createCustomToken(mobile)
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


exports.createDummyRequest = functions.https.onRequest((req, res) => {
    console.log("::createDummyRequest::INVOKED");    
    var packet = {
        address:req.query.address,
        asn_response: AST_RESPONSE_NIL,
        service: req.query.service,      //SERVICE_CLEANING
        society_id: "we dont need no education",
        status: REQ_STATUS_UNASSIGNED,
        user_id: "9986643444",
        requested_time: req.query.time,     //in secs since 12
        timestamp: Date.now()
    }

    return admin.firestore().collection(COL_REQUEST).add(packet).then(() => {
        console.log("Dummy request created!");
        return res.status(200).send("Created automagically!");
    })
    .catch((error) => {
        console.error("Error creating dummy request: " + error);
        return res.status(500).send("Error: " + error);
    });
});


/**
 * USERREQUESTHANDLER
 * -Triggered on Creation of new Request document
 * -Fetches fields 
 * -Gets available assistant
 * -sends her a request 
 */
//better to get address from the packet than another db fetch i guess.
exports.userRequestHandler = functions.firestore
    .document('requests/{requestId}')
    .onCreate((snap, context) => {
        console.log("::userRequestHandler::INVOKED");
        const requestObj = snap.data();
        const requestId = context.params.requestId;     //get request ID from wildcard
        console.log("Request ID: " + requestId);
        
        return getAvailableAssistant(requestObj.address, requestObj.service, requestObj.time, null)
            .then(function(assistant){
                /*
                    assistant should contain: 
                    {assistant client token, assistant name, assistant ID}
                */
                if(assistant === null) {
                    console.log("No available maids at the moment.");
                    //TODO
                    return 0;
                }
               
                console.log("Assistant details obtained: " + assistant.name + "\nSending assitant request..");            

                return sendAssitantRequest(requestId, requestObj, assistant)
                    .then(function(response){
                        if(response === 1) {
                            console.log("Updating the snapshot's assignee.");
                            return snap.ref.set({
                                assignee_id: assistant.assId,
                                asn_response: "NIL"     //Can be set by client
                            }, {merge: true});
                        }else{
                            console.error("Recevied error tag from :sendAssistantRequest: method");
                            return 0;
                        }
                }, function(error){
                    console.error("Recevied error tag from :sendAssistantRequest: method: " + error);
                    return 0;
                });

            });       
    });


/**
 * @param {string} requestId
 * @param {service, address, time} request 
 * @param {name, instanceId, assId} assistant 
 */
var sendAssitantRequest = function(requestId, request, assistant) {
    console.log("::sendAssitantRequest::INVOKED");    
    const payload = {
        data: {
            RID: requestId,
            Service: request.service,
            Address: request.address,
            Time: '' + request.requested_time,      //cant send number
            Command: COMMAND_WORK_REQUEST
        }
    };

    console.log("Attempting to send the request to assistant. Request ID: " + requestId + "to Assistant: " + assistant.assId);
    //send payload to assistant        
    return admin.messaging().sendToDevice(assistant.clientToken, payload)
            .then(function(response) {
                console.log("Request sent succesfully! Request ID: " + requestId);
                setTimeout(() => {
                    console.log("Invoking routine Request status check for requestId: " + requestId);
                    checkRequestStatus(requestId, assistant.assId);
                }, 2*60*1000);
                return 1;
            })
            .catch(function(error) {
                console.error("Request couldnt be sent: Request ID: " + requestId + "\n" + error);
                //TODO
                return 0;
            });
}

//BE SUPER CAREFUL OF SELF LOOPING
exports.assistantResponseHandler = functions.firestore
    .document('requests/{requestId}')
    .onUpdate((change, context) => {
        console.log("::assistantResponseHandler::INVOKED");
        const after_data = change.after.data();
        const status_after = after_data.status;
        if(status_after === REQ_STATUS_ASSIGNED) {
            //probably recalled due to status update. exit asap
            console.log("status is confirmed. Exiting method");
            return 0;
        }

        const prev_data = change.before.data();              
        const response_before = prev_data.asn_response;
        const response_after = after_data.asn_response;        
        const requestId = context.params.requestId;

        console.log("RequestId: " + requestId + "\nResponse before: " + response_before + " Response after: " + response_after);                
        //CASE 1
        if(response_before === response_after) {
            //exit if no changes to response or if request already confirmed
            console.log("No change to response. Exiting method.");
            return 0;
        }        
        if(response_before === AST_RESPONSE_NIL) {
            //CASE 2
            if(response_after === AST_RESPONSE_ACCEPT) {
                console.log("Request accepted. Confirming request and notifying user");
                //TODO  update assistant object. update request status. notify user
                return change.after.ref.set({                    
                    status: REQ_STATUS_ASSIGNED     //looping handled
                }, {merge: true});
            }
            //CASE 3
            else if(response_after === AST_RESPONSE_REJECT) {
                console.log("Request rejected. Reroute request");
                //TODO
                return 0;
            }
        }
        //TODO make sure any other updates to the document are also handled accordingly
        return 0;
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
var getAvailableAssistant = function(address, service, time, exceptions) {
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

/**
 * CHECKREQUESTSTATUS
 * @param {string} rId (request ID)
 * @param {string} assId (assistant ID)
 * 
 * method checks whether assistant has responded to request or not after waiting for a period of time. 
 * -if not, restart request handling process
 */
var checkRequestStatus = function(rId, assId) {
    console.log("::checkRequestStatus::INVOKED");
    admin.firestore().collection(COL_REQUEST).doc(rId).get().then(doc => {
        const aDoc = doc.data();
        if(aDoc.assignee_id === null && aDoc.asn_response === null) {
            console.error("Request has no assignee yet!");
            return 0;
        }
        if(aDoc.assignee_id === assId) {
            if(aDoc.asn_response === AST_RESPONSE_NIL){
                //the assigned assistant is still the same and the her response is still nil
                //Houston we have a problem
                console.log("Request: " + rId + " hasnt been responded to by assistant: " + assId + " Required to be rerouted");
                return 0;
                //TODO
            }else if(aDoc.asn_response === AST_RESPONSE_ACCEPT){
                //TODO maybe verify if status is assigned yet or not. not reqd
                console.log("checkRequestStatus verified request: " + rId + " All in order.");
                return 1;
            }else{
                //should never happen. corner case when request is in process of being rerouted and gets caught by this method
                console.error("Request: " + rId + " has been rejected by Assistant: " + assId + " but hasnt been rerouted.");
                return 0;
            }
        }else{
            console.log("checkRequestStatus for RequestId: " + rId + ", AssistantId: " + assId + " outdated. Request reassigned.");
            return 1;
        }
    })
    .catch(error => {
        console.log("Error in retrieving record");
        return 0;
    });
}