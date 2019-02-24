const functions = require('firebase-functions');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');

//var serviceAccount = require('kanta-6f9f5-firebase-adminsdk-53vmc-c7119079df.json');
//firebase-adminsdk-53vmc@kanta-6f9f5.iam.gserviceaccount.com

//OLD
//admin.initializeApp(functions.config().firebase);
//NEw
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: 'kanta-6f9f5',
    clientEmail: 'firebase-adminsdk-53vmc@kanta-6f9f5.iam.gserviceaccount.com',
    privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQClIavgMQGsqAar\nd+KNowlif8d7PyRo03xM0wVbpcA8PnqnxRLtOSjGfHFeIbeJ0f5O5JzUavjBdTkF\nq4NAuWJvfcXMPlbF9OmLrP8428y7ZKTz37Z2o89teXAWi6pt25ERoJd8HcvM49gt\niljBbUgHL7Ckm8wFD+h2m/LTeDEpS2KVpmQcawd3H5ZYR59bBQZFhym9XXVOBxl3\njUpz33LgI8SIjgPyq6RzI0syJkxjSLRTZliI0oZza9pA8oyMFAW30ytS4kfjnky5\nLsm6sC9UcLHKRXu0yo8qFz88IFWApL6gr/Ko68iJTpKH4Ix00O4D+Y+ThyLyhcjI\ncmjKlhAZAgMBAAECggEAM3ASKINLeLtcXIQ7G5CaJ0cTXeZU0pxyH0IqbJpsj7eM\noH8IfsGr3Gw+KirJj9JMa8nVumtZ8nUv3n7HI1279mvQtecDQ6WfLEWmuNDq7MKU\niWz52un6/qhxzGwUGiVngnyqQ1zKs5eTqtfp/tKqOabW2Oe4/Siv6mZ4lPvfIHPd\nU8js1jlVqfQI1JbcdKoLJDF4IcD+Hz1Bu40BA3Rfivhm8ljyX86GhWNsHCMjQTwH\nrEefoB1pa0fkUjIo7vpdyuNVyID3OvwJsJWYd7J7vooqYJpL8cZDNUudxUaBM/zr\ncsyAvwRkV9FD8/C39fBX23ctbSZHJBPqIzVJ4XDeswKBgQDXtGbssSdPTzRZcTTU\n3xfudMntpdKOLvG2tlZR2itvW/Z9+AsDvp/i0FQfnlMWWRhnz8ydJvYfUlMYD26Z\nLOJczhuy3WLqbfFG5mVCgu7tF5qtwlpmjIoE2dBj29CpE3FczmMJjVCBaxmqazZm\nbuTQwI5mASQaNlyKGM9caaqg/wKBgQDD+rhQX55vlsiS0Dd2xBnJ1O62w0Pm/KGQ\n0STbKbvmyFoR58xoZVejhAYlZPjbm8HFhBRgGY982KlBxn38eWfCvgzpEJv3U9Bw\nqd8dhq7WivywwuIAxbwEQ/CEeYHSWq1sWJ49JsDDDjXc1F5oU7RtHwOlKbsX53FN\ny51kQ1c25wKBgH+F5ud94EiSAdfzBpHnBsXyA8Ncqntmo34qlCO2AMHIM5TLhO+E\nzg+QrHs45dQrfjM5dbVe6FkiGX/6957VG0pUi6mWGrmPn/oTkb/dmpVOxCJ/6WQB\nKEOv5fRzawvaM8XzOjfWdMbeY4EN+05Ztyr2+/iwKgDZLKJ0AnuW+MpPAoGBAKqn\nbFAws1ogRs/xGBsHcB1cmfHz3vEJE/dy51Eg6kpwNF5bJpfRh5sPn/p4DmvNGdLQ\nzJ1SJKxmThzEp3huj3f43m0k1WttRJiWk362hRC1Poz9Zqedh7d/IbV5yR5Pb6xl\nDoXZdQllGmoNU5gtK3PKCfaMfCq4kuVXZNql+RAJAoGAWl6jHaFAIbyF4n54vp8m\nQu7kF7y0AuIvpL6v3/TuRzpQ/PIjH8k8xaJ6AQHiq5CXPLONbAYD5MHDS6hGjIIF\nq1r+01C8lHafeffZR92wAoO8XHASV76qvfGmsDpXW6SbTlCycGTakJZzxSXwyxsq\nbbO+52HaKOqB/7oHrfH0yjc=\n-----END PRIVATE KEY-----\n'
  }),

  databaseURL: 'https://kanta-6f9f5.firebaseio.com'
});

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

/**
 * SENDJOBREQUESTANDEVALUATE
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
        /*
        assistant should contain:
        {assistant instance ID, assistant name, assistant ID}
        */
        var assistant = getAvailableAssistant(requestObj.address, requestObj.service, requestObj.time, null);
        console.log("Request Id: "+ requestId + "\nSelected assistant: " + assistant.name);

        if(!assistant) {
            console.log("No available maids at the moment.");
            //TODO
            return 0;
        }

        //sendAssitantRequest(requestObj, assistant)
        return sendAssitantRequest(requestId, requestObj, assistant)
            .then(function(response){
                if(response === 1) {
                    console.log("Updating the snapshot's assignee.");
                    return snap.ref.set({
                        assignee_id: assistant.ass_id,
                        asn_response: "NIL"     //Can be set by client
                    }, {merge: true});
                }else{
                    console.log("Recevied error tag from :sendAssistantRequest: method");
                    return 0;
                }
        }, function(error){
            console.log("Recevied error tag from :sendAssistantRequest: method");
            return 0;
        });
    });


/**
 * @param {string} requestId
 * @param {service, address, time} request 
 * @param {name, instanceId, assId} assistant 
 */
var sendAssitantRequest = function(requestId, request, assistant) {
    const payload = {
        data: {
            Service: request.service,
            Address: request.address,
            Time: request.time
        }
    };

    console.log("Attempting to send the request to an available assistant..");
    //send payload to assistant        
    return admin.messaging().sendToDevice(assistant.instanceId, payload)
            .then(function(response) {
                console.log("Request sent succesfully.");
                setTimeout(() => {
                    checkRequestStatus(requestId, assistant.assId);
                }, 4*60*1000);
                return 1;
            })
            .catch(function(error) {
                console.log("Request couldnt be sent.");
                //TODO
                return 0;
            });
}

    /*
    QUICK ENUM FOR REQUEST STATUSES:
    UNNASSIGNED: UNA
    ASSIGNED: ASN

    ASSISTANT_RESPONSES:
    NIL
    APPROVED
    REJECTED
    */

exports.assistantResponseHandler = functions.firestore
    .document('request/{requestId}')
    .onUpdate((change, context) => {
        console.log("::assistantResponseHandler::INVOKED");
        const response_after = change.after.asn_response;
        const response_before = change.before.asn_response;
        const status_after = change.after.status;
        const requestId = context.params.requestId;

        console.log("RequestId: " + requestId + "\nResponse before: " + response_before + " Response after: " + response_after);        
        
        //CASE 1
        if(status_after === "CONFIRMED" || response_before === response_after) {
            //exit if no changes to response or if request already confirmed
            console.log("No change to response || status is confirmed. Exiting method.");
            return 0;
        }
        
        if(response_before === "NIL") {
            //CASE 2
            if(response_after === "ACCEPTED") {
                console.log("Request accepted. Confirming request and notifying user");
                //TODO  update assistant object. update request status. notify user
                return change.ref.set({                    
                    status: "ASN"     //looping handled
                }, {merge: true});           
            }
            //CASE 3
            else if(response_after === "REJECTED") {
                console.log("Request rejected. Reroute request");
                //TODO
                return 0;
            }
        }
        //TODO make sure any other updates to the document are also handled accordingly
        return 0;
    });

/**
 * 
 * @param {string} address 
 * @param {string} service 
 * @param {string} time (in system millis) 
 * @param {array} exceptions (array of assistants to ommit from availability)
 * 
 * return assistant = {name, instanceId, assId}
 */
var getAvailableAssistant = function(address, service, time, exceptions) {
    console.log("::getAvailableAssistant::INVOKED");
    var dummy = {
        name: "Sushma",
        assId: "ADD_IN_BRO",
        instanceId: "ADD_IN_BRO"
    };
    return dummy;
}

/**
 * 
 * @param {string} rId (request ID)
 * @param {string} assId (assistant ID)
 * 
 * method checks whether assistant has responded to request or not after waiting for a period of time. 
 * -if not, restart request handling process
 */
var checkRequestStatus = function(rId, assId) {
    console.log("::checkRequestStatus::INVOKED");
    admin.firestore().collection('requests').doc(rId).get().then(doc => {        
        if(doc.assignee_id === assId && doc.asn_response === "NIL") {
            //the assigned assistant is still the same and the her response is still nil
            //Houston we have a problem
            console.log("Request hasnt been responded to by assistant. Required to be rerouted");
            //TODO      
        }
        return 1;
    })
    .catch(error => {
        console.log("Error in retrieving record");
        return 0;
    });
}

/*
exports.sendNotification = functions.database.ref('/notifications/messages/{pushId}')
    .onWrite(event => {
        const message = event.data.current.val();
        const senderUid = message.from;
        const receiverUid = message.to;
        const promises = [];

        if (senderUid == receiverUid) {
            //if sender is receiver, don't send notification
            promises.push(event.data.current.ref.remove());
            return Promise.all(promises);
        }

        const getInstanceIdPromise = admin.database().ref(`/users/${receiverUid}/instanceId`).once('value');
        const getSenderUidPromise = admin.auth().getUser(senderUid);

        return Promise.all([getInstanceIdPromise, getSenderUidPromise]).then(results => {
            const instanceId = results[0].val();
            const sender = results[1];
            console.log('notifying ' + receiverUid + ' about ' + message.body + ' from ' + senderUid);

            const payload = {
                notification: {
                    title: sender.displayName,
                    body: message.body,
                    icon: sender.photoURL
                }
            };

            admin.messaging().sendToDevice(instanceId, payload)
                .then(function (response) {
                    console.log("Successfully sent message:", response);
                })
                .catch(function (error) {
                    console.log("Error sending message:", error);
                });
        });
});*/

/*
//PROMISE SUCCESSON AND REJECTION

ref.child('blogposts').child(id).once('value').then(function(snapshot) {
  // The Promise was "fulfilled" (it succeeded).
  renderBlog(snapshot.val());
}, function(error) {
  // The Promise was rejected.
  console.error(error);
});
*/