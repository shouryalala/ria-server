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
const COLN_VISITS = "visits";
const COLN_TIMETABLE = "timetable";
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
//Service Durations
const SERVICE_CLEANING_DURATION = 1800;
const SERVICE_UTENSILS_DURATION = 900;
//Visit decodes
const VISIT_STATUS_FAILED = -1;
const VISIT_STATUS_CANCELLED = 0;
const VISIT_STATUS_COMPLETED = 1;
const VISIT_STATUS_ONGOING = 2;
const VISIT_STATUS_UPCOMING = 3;
//
const TOTAL_SLOTS = 6;
const BUFFER_TIME = 1200;
const dummy1 = 'bhenbhaibhenbhai';
const dummy2 = 'acxacxsexsexsex';
const dummy3 = 'alYssfTuB2Y1tTw5jEaQfVCxUhX2';

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
    const monthSubCollection = "MAR"; 
    var packet = {
        user_id: "9986643444",
        service: req.query.service,
        date: new Date().getDate(),
        address:req.query.address,
        society_id: "abx",
        asn_response: AST_RESPONSE_NIL,        
        status: REQ_STATUS_UNASSIGNED,
        req_time: parseInt(req.query.time),     //in secs since 12
        timestamp: Date.now()
    }

    return admin.firestore().collection(COL_REQUEST).doc(yearDoc).collection(monthSubCollection).add(packet).then(() => {
        console.log("Dummy request created!");
        return res.status(200).send("Created automagically!");
    })
    .catch((error) => {
        console.error("Error creating dummy request: " + error);
        return res.status(500).send("Error: " + error);
    });
});

exports.getTimetably = functions.https.onRequest((req, res) => {    
    return getAvailableAssistant2('abc','MAR',24,parseInt(req.query.stx),parseInt(req.query.enx),null,req.query.force).then(function(response){
        if(response === true) {
            console.log("Method ran succesfully");
            return res.status(200).send("SUCCESS");
        }else{
            console.log("Method failed");
            return res.status(500).send("BOOO");
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


class DecodedTime {    
    constructor(hour, min) {
        this.hour = hour;
        this.min = min;
    }

    getHours(){return this.hour;}

    getMins(){return this.min;}

    getSlot(){return this.min/10;}
}

/**
 * USERREQUESTHANDLER
 * -Triggered on Creation of new Request document
 * -Fetches fields 
 * -Gets available assistant
 * -sends her a request 
 */
//better to get address from the packet than another db fetch i guess.
exports.userRequestHandler = functions.firestore
    .document('requests/{yearDocId}/{monthSubcollectionId}/{requestId}')
    .onCreate((snap, context) => {
        console.log("::userRequestHandler::INVOKED");
        const requestObj = snap.data();
        const requestId = context.params.requestId;     //get request ID from wildcard
        const monthId = context.params.monthSubcollectionId;
        console.log("Request ID: " + requestId);
        
        let st_time = parseInt(requestObj.req_time);
        let en_time = st_time + getServiceDuration(requestObj.service, null);
        //TODOOOOOO
        return getAvailableAssistant(requestObj.address, monthId, 24, st_time, en_time, null,null)
            .then(function(assistant){                
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
                                asn_id: assistant.assId,
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
 * ASSISTANTRESPONSEHANDLER
 * - Triggered when assistant responds to request
 * - creates a visit object if request approved
 * - restarts search for an assistant if refused by assistant
 */
exports.assistantResponseHandler = functions.firestore
    .document('requests/{yearDoc}/{monthSubcollection}/{requestId}')
    .onUpdate((change, context) => {
        console.log("::assistantResponseHandler::INVOKED");
        const prev_data = change.before.data();
        const after_data = change.after.data();
        
        //explicity check each condition before creating visit obj
        if(prev_data.asn_response !== AST_RESPONSE_ACCEPT && prev_data.status === REQ_STATUS_UNASSIGNED &&
            after_data.asn_response === AST_RESPONSE_ACCEPT && after_data.status === REQ_STATUS_ASSIGNED) {
            console.log("assistant accepted and assigned request. Creating visit obj");
            //TODO const end_time = getServiceEndTime
            const yearDocId = context.params.yearDoc;
            const subCollectionId = context.params.monthSubcollection;
            const requestDocId = context.params.requestId;
            var visitObj = {
                user_id: after_data.user_id,
                ass_id: after_data.asn_id,
                date: after_data.date,
                service: after_data.service,
                address: after_data.address,
                society_id: after_data.society_id,
                req_st_time: after_data.req_time,                
                status: VISIT_STATUS_UPCOMING
            }
            return admin.firestore().collection(COLN_VISITS).doc(yearDocId).collection(subCollectionId).add(visitObj).then(() => {
                console.log("Created initial Visit object for requestID: " + requestDocId);                
                //TODO inform user that the request was successful
                return res.status(200).send("VISIT me in heaven!");
            })
            .catch((error) => {
                console.log("Error creating visit obj: " + error);
                return res.status(500).send("VISIT me in hell");
            });
        }

        else if(prev_data.asn_response === AST_RESPONSE_NIL && prev_data.status === REQ_STATUS_UNASSIGNED &&
            after_data.asn_response === AST_RESPONSE_REJECT && after.status !== REQ_STATUS_ASSIGNED){
            //Log/penalize rejection and reroute request
            console.log("Assistant rejected response. Logging rejection and reroute request");
            //TODO
            return res.status(200).send("Request rejected");
        }
        return res.status(200).send("All okay. no assitant code block triggered");
    });

/**
 * SENDASSISTANTRESPONSE
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
            Time: String(request.req_time),      //cant send number
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

/** 
 * @param {string} address 
 * @param {string} monthId 
 * @param {number} date 
 * @param {number} st_time 
 * @param {number} en_time 
 * @param {list} exceptions 
 * @param {string} forceAssistant 
 * 
 * - decode time to slots
 * - fetch the timetable
 * - use a sliding window to obtain optimal free slot
 * 
 * return Obj = {assistant ID, assistant client token, [DecodedTime]free slots array}
 */
var getAvailableAssistant = function(address, monthId, date, st_time, en_time, exceptions, forceAssistant) {
    console.log("::getAvailableAssistant::INVOKED");    
    const docId = '2019_z23';
    //const buffer_secs = 1200;
    /**
     * Time management:
     * - req_st_time -> (should be greater than current time, should consider travelling distance)
     * - req_en_time -> (bleh)
     * - req_time_buffer -> (shoud be greater than current time)
     * 
     */
    var today = new Date();
    console.log("Debug:: Today: " + today.getDate());
    if(date < today.getDate()){
        console.error("Received a request for a date in the past.");
        //TODO return 0;
    }
    var st_time_obj = decodeHourMinFromTime(st_time);   //p
    var en_time_obj = decodeHourMinFromTime(en_time);     

    var st_time_buffer_obj = decodeHourMinFromTime(st_time - BUFFER_TIME);
    var en_time_buffer_obj = decodeHourMinFromTime(en_time + BUFFER_TIME);
    //var slots = getSlotCount(st_hour, en_hour, st_min, en_min);

    //make sure start times are not before current time
    if(date === today.getDate()) {
        console.log("Verifying time slots")
        st_time_obj = verifyTime(st_time_obj,today.getHours(), today.getMinutes());
        st_time_buffer_obj = verifyTime(st_time_buffer_obj,today.getHours(), today.getMinutes());
    }
    //var timetableNslots = getTimetable
    return getTimetable(docId, monthId, date, st_time_buffer_obj, en_time_buffer_obj, exceptions, forceAssistant).then(res => {
        if(res === 0) {
            console.error("Received an error from getTimetable. Exiting method");
            return 0;
        }
        const num_slots = (en_time_obj.getHours() - st_time_obj.getHours())*TOTAL_SLOTS + (en_time_obj.getSlot() - st_time_obj.getSlot());
        var p = (st_time_obj.getHours() - st_time_buffer_obj.getHours())*TOTAL_SLOTS + (st_time_obj.getSlot() - st_time_buffer_obj.getSlot());
        console.log("Num_slots required: " + num_slots + ", P: " + p);
        let k_right = p;
        let k_left = p-1;
        //let multiplier = -1;
        let flag = false;
        while((k_right+num_slots) <= res.slotLib.length || (k_left >= 0)) {
            let tAssistantId;
            if((k_right + num_slots) <= res.slotLib.length) {
                tAssistantId = getFreeAssistantFromWindow(res.timetable,res.assistantLib,k_right,num_slots);
                if(tAssistantId !== null) {                    
                    console.log("Found free assistant: " + tAssistantId + " in window: " + k_right);
                    console.log("Slot: " + k_right + ", Decoded:: (" + res.slotLib[k_right].getHours() + "," +  res.slotLib[k_right].getMins() + ")");
                    console.log("Assistant: " + tAssistantId + ", Client token: " + res.assistant_token[tAssistantId]);
                    flag = true;
                    //put all slots in a block to return
                    let slotBlock = [];
                    for(let i=k_right; i<k_right+num_slots; k++) {
                        slotBlock.push(res.slotLib[i]); 
                    }
                    let rObj = {
                        assistantId: tAssistantId
                    }
                    break;
                }
                //move k forward
                k_right++;
            }
            if(k_left >= 0) {
                tAssistantId = getFreeAssistantFromWindow(res.timetable,res.assistantLib,k_left,num_slots);
                if(tAssistantId !== null) {                    
                    console.log("Found free assistant: " + tAssistantId + " in window: " + k_left);
                    console.log("Slot: " + k_left + ", Decoded:: (" + res.slotLib[k_left].getHours() + "," +  res.slotLib[k_left].getMins() + ")");
                    console.log("Assistant: " + tAssistantId + ", Client token: " + res.assistant_token[tAssistantId]);
                    flag = true;
                    break;
                }
                //move k backward
                k_left--;
            }
        }
        return flag;
    });
}

/**
 * @param {string} docId 
 * @param {enum month} monthId 
 * @param {number} date 
 * @param {DecodedTime} st_time_dec 
 * @param {DecodedTime} en_time_dec 
 * @param {list} exceptions 
 * @param {string} forceAssistant 
 * GETTIMETABLE
 * Generates a 2d map => asMap[SLOT][ASSISTANT] after fetching assistant scehdule from db.
 * 
 * return Obj = {assistantLib: assistants, slotLib: slots, timetable: asMap, assistant_token: assistant_list}
 */
var getTimetable = function(docId, monthId, date, st_time_dec, en_time_dec, exceptions, forceAssistant) {
    console.log("::getTimetable::INVOKED");
    console.log("Params: {date:" + date + " ,st_time:" + st_time_dec + ",en_time:" + en_time_dec + "}");
    
    var min_doc_id = st_time_dec.getHours();
    var max_doc_id = en_time_dec.getHours();

    //var min_slot_id = minToSlotId(st_time_dec.min);   //10 -> 1, 20 -> 2
    //var max_slot_id = minToSlotId(en_time_dec.min);
    var min_slot_id = st_time_dec.getSlot();
    var max_slot_id = en_time_dec.getSlot();

    console.log("Generated Details: \nMin Doc ID: " + min_doc_id + "\nMax Doc ID: " + max_doc_id 
    + "\nMin Slot ID: " + min_slot_id + "\nMax Slot ID: " + max_slot_id);    

    return admin.firestore().collection(COLN_TIMETABLE).doc(docId).get().then(docSnapshot => {
        var assistant_list = docSnapshot.data();
        var assistants = [];
        for(const key in assistant_list) {
            console.log("ID: " + key + " -> " + assistant_list[key]);
            assistants.push(key);
        }
        if(forceAssistant !== null) {
            console.log("Search details for only this assistant: " + forceAssistant);
            //TODO
            if(assistants.includes(forceAssistant)) {
                assistants = [];
                assistants.push(forceAssistant)
            }
        }else if(exceptions !== null) {
            while((rAssistant=exceptions.pop()) !== null) {
                console.log("Exceptions list item: " + rAssistant);
                for(let i=0; i<assistants.length; i++) {
                    if(assistants[i] === rAssistant){
                        console.log(assistant[i] + " removed from list");
                        assistants.splice(i,1);
                    }
                }
            }
        }
        var query = admin.firestore().collection(COLN_TIMETABLE).doc(docId).collection(monthId);
        //var query = ttRef;
        if(st_time_dec.getHours() === en_time_dec.getHours()) {
            console.log("Querying through one doc: " + st_time_dec.getHours());            
            query = query.where("date", "==", date).where("hour", "==", st_time_dec.getHours());    
        }else{
            console.log("Querying through multiple docs");
            query = query.where("date", "==", date).where("hour", ">=", st_time_dec.getHours()).where("hour", "<=", en_time_dec.getHours());
        }
        
        return query.get().then(querySnapshot => {
            var asMap = [];            
            var slots = [];
            var i,j,k;
            k = 0;
            querySnapshot.forEach(doc => {
                console.log("Received docId: " + doc.id);
                const docDetails = doc.data();

                if(min_doc_id === max_doc_id) {  //only one document fetched
                    for(j=min_slot_id; j<=max_slot_id; j++) {
                        let asRow = [];
                        slots[k] = new DecodedTime(min_doc_id, j*10);   //j is slot
                        let busyAssistants = docDetails[getTTFieldName(j)];
                        console.log("Hour: " + max_doc_id + " ,Time Slot: " + j + " BAssistants: " + busyAssistants);
                        for(i=0; i<assistants.length; i++) {
                            console.log("Decoding slot: j:" + j + ",i: " + i + ",k: " + k);
                            //create row
                            if(typeof busyAssistants !== 'undefined'){
                                asRow[i] = !busyAssistants.includes(assistants[i]);
                            }else{
                                asRow[i] = true;
                            }
                        }
                        asMap[k] = asRow;
                        k++;
                    }
                }else{
                    if(docDetails.hour === min_doc_id) {
                        for(j=min_slot_id; j<TOTAL_SLOTS; j++) {
                            let asRow = [];
                            slots[k] = new DecodedTime(min_doc_id, j*10);   //j is slot
                            let busyAssistants = docDetails[getTTFieldName(j)];
                            console.log("Hour: " + min_doc_id + " ,Time Slot: " + j + " BAssistants: " + busyAssistants);
                            for(i=0; i<assistants.length; i++) {
                                console.log("Decoding slot: j:" + j + ",i: " + i + ",k: " + k);
                                //create row
                                if(typeof busyAssistants !== 'undefined'){
                                    asRow[i] = !busyAssistants.includes(assistants[i]);
                                }else{
                                    asRow[i] = true;
                                }
                            }
                            asMap[k] = asRow;
                            k++;
                        }
                    }                    
                    if(docDetails.hour === max_doc_id) {
                        for(j=0; j<=max_slot_id; j++){                            
                            let asRow = [];
                            slots[k] = new DecodedTime(max_doc_id, j*10);   //j is slot
                            let busyAssistants = docDetails[getTTFieldName(j)];
                            console.log("Hour: " + max_doc_id + " ,Time Slot: " + j + " BAssistants: " + busyAssistants);
                            for(i=0; i<assistants.length; i++) {
                                console.log("Decoding slot: j:" + j + ",i: " + i + ",k: " + k);
                                //create row
                                if(typeof busyAssistants !== 'undefined'){
                                    asRow[i] = !busyAssistants.includes(assistants[i]);
                                }else{
                                    asRow[i] = true;
                                }
                            }
                            asMap[k] = asRow;
                            k++;
                        }
                    }
                }
                // console.log("Generated table: ");
                // for(i=0; i<assistants.length; i++) {
                //     var x = "";
                //     for(j=0; j<slots.length; j++) {
                //         x = x.concat(asMap[j][i] + "\t");
                //     }
                //     console.log(x);
                // }
            });
            console.log("Generated table map: ");
            for(i=0; i<assistants.length; i++) {
                var x = "";
                for(j=0; j<slots.length; j++) {
                    x = x.concat(asMap[j][i] + "\t");
                }
                console.log(x);
            }
            const sObj = {
                assistantLib: assistants,
                slotLib: slots,
                timetable: asMap,
                assistant_token: assistant_list
            }            
            return sObj;
        }).catch(error => {
            console.error("Failed to generate table: " + error);
            return 0;
        });
    }).catch(error => {
        console.error("Failed to fetch assitant details: " + error);
        return 0;
    });   
}

var getFreeAssistantFromWindow = function(timetable, assistants, index, slots) {
    console.log("GETASSISTANTFROMWINDOW: Testing index: " + index + ", slots: " + slots);
    let i,j;    
    for(i=0; i<assistants.length; i++) {
        let flag = true;
        for(j=index; j<index+slots; j++) {
            if(!timetable[j][i]) {
                //slot is not free, window fails.
                flag = false;
            }
        }
        if(flag === true) {
            console.log("GETASSISTANTFROMWINDOW: Found Free Assistant:" + i + "!");
            return assistants[i];
        }
    }
    console.log("GETASSISTANTFROMWINDOW: Didnt find a free Assistant in this window.");
    return null;
}

/**
 * @param {number} time 
 * DECODEHOURMINFROMTIME
 * - divides number in hours and minutes
 * - rounds minutes
 * - generates DecodedTime object
 * - Min possible values = {0, 10, 20, 30, 40, 50}
 */
var decodeHourMinFromTime = function(time) {
    if(isNaN(time)){   
        console.error("Received time is not a number");
        time = parseInt(time, 10);
    }
    var hr =  Math.trunc(time/3600);
    var prod = time/60;
    var min_raw = prod%60;
    console.log("Decoded raw time for " + time + ": Hour: " + hr + ", Min: " + min_raw);
    //round minutes to nearest 10 if not done already
    var min_trunc = Math.round(min_raw/10);    
    var mn = min_trunc*10;
    if(min_trunc === 60) {
        hr += 1;
        mn = 0;    
    }
    console.log("Time after rounding: Hour: " + hr + ", Min: " + mn);
    //TODO Can hour ever be 24?
    //var time_decoded = {hour:hr,min:mn};
    return new DecodedTime(hr, mn);
}

 var verifyTime = function(vTime, hrs, mins) {
    //TODO
    return vTime;
 }

var getTTFieldName = function(n){
    switch(n) {
        case 0: return 't00';
        case 1: return 't10';
        case 2: return 't20';
        case 3: return 't30';
        case 4: return 't40';
        case 5: return 't50';
        default: return 't00';
    }
}

/** 
 * @param {enum} service 
 * @param {number} bhk 
 * return Duration in secs
 */ 
var getServiceDuration = function(service, bhk) {
    //TODO
    switch(service) {
        case SERVICE_CLEANING: return SERVICE_CLEANING_DURATION;
        case SERVICE_UTENSILS: return SERVICE_UTENSILS_DURATION;
        default: return SERVICE_CLEANING_DURATION;
    }
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
        if(aDoc.asn_id === null && aDoc.asn_response === null) {
            console.error("Request has no assignee yet!");
            return 0;
        }
        if(aDoc.asn_id === assId) {
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