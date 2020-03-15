const { db, messaging, fieldValue } = require('./admin');
/**
 * @ALWAYS UPDATE EXPORTS AFTER ADDING/DELETING OBJECTS!
 */

//Firebase collections
const COLN_USERS = "users";
const COLN_ASSISTANTS = "assistants";
const COLN_REQUESTS = "requests";
const COLN_VISITS = "visits";
const COLN_TIMETABLE = "timetable";
const COLN_ASSISTANT_ANALYTICS = "ast_analytics";
const COLN_SOCIETIES = "societies";
//Assistant Sub Collection
const SUBCOLN_ASSISTANT_ANALYTICS = "analytics";
const SUBCOLN_ASSISTANT_FCM = "fcm";
const SUBCOLN_ASSITANT_FEEDBK = "feedback";
const SUBCOLN_ASSISTANT_FINANCE = "finance";
const DOC_ASSISTANT_FCM_TOKEN = "client_token";
//society subcoln
const SUBCOLN_SOC_ASTS = "assistants";
const DOC_SOC_AST_SERVICING = "servicing";
//doc name stored in assistants collections
const DOC_ONLINE_ASTS = "ONLINE_AST";
//array used in society and online assistants
const ARRAY_AST = "astArray";
//User Subcollections and static Docs
const SUBCOLN_USER_FCM = "fcm";
const SUBCOLN_USER_ACTIVITY = "activity";
const DOC_USER_FCM_TOKEN = "client_token";
const DOC_ACTIVITY_STATUS = "status";
const DOC_USER_STATS = "statistics";
//Firebase db fields
const AST_TOKEN = "client_token";
const AST_TOKEN_TIMESTAMP = "ct_update_tmstmp";
const REQ_STATUS_ASSIGNED = "ASN";
const REQ_STATUS_UNASSIGNED = "UNA";
const AST_RESPONSE_NIL = "NIL";
const AST_RESPONSE_ACCEPT = "ACCEPT";
const AST_RESPONSE_REJECT = "REJECT";
//Payload commands
const COMMAND_WORK_REQUEST = "WRDP";
const COMMAND_REQUEST_CONFIRMED = "RQDP";
const COMMAND_VISIT_ONGOING = "VISON";
const COMMAND_VISIT_COMPLETED = "VISCOM";
const COMMAND_VISIT_CANCELLED = "VISCAN";
const COMMAND_MISC_MESSAGE = "MISC";    //miscellaneous
//Miscellaneous messages type -- condes sent to userClient alongwith command
const NO_AVAILABLE_AST_MSG = "NoAvailableAst";
const ERROR_ENCOUNTERED_MSG = "ErrorMsg";


//Service decodes
const SERVICE_CLEANING = "Cx";
const SERVICE_DUSTING = "Dx";
const SERVICE_UTENSILS = "Ux";
const SERVICE_CLEANING_DUSTING = "CDx";
const SERVICE_CLEANING_UTENSILS = "CUx";
const SERVICE_DUSTING_UTENSILS = "DUx";
const SERVICE_CLEANING_DUSTING_UTENSILS = "CDUx";
const SERVICE_CHORE = "Chx";
//Service Durations
const SERVICE_CLEANING_DURATION = 1800;
const SERVICE_UTENSILS_DURATION = 900;
//Visit decodes
const VISIT_STATUS_FAILED = -1;
const VISIT_STATUS_CANCELLED = 0;
const VISIT_STATUS_COMPLETED = 1;
const VISIT_STATUS_ONGOING = 2;
const VISIT_STATUS_UPCOMING = 3;
const VISIT_STATUS_NONE = 4;    //no service booked
const VISIT_STATUS_SEARCHING = 5;
//
//Return Codes:
const NO_AVAILABLE_AST_CODE = 2;
const ERROR_CODE = 0;
const SUCCESS_CODE = 1;
//
const FLD_CANCLD_BY_USER = "cncld_by_user";
const FLD_CANCLD_BY_AST = "cncld_by_ast";
const TOTAL_SLOTS = 6;
const BUFFER_TIME = 1800;
const ALPHA_ZONE_ID = 'z23';
const REQUEST_STATUS_CHECK_TIMEOUT = 90000  //90 seconds
const dummy1 = 'bhenbhaibhenbhai';
const dummy2 = 'acxacxsexsexsex';
const dummy3 = 'alYssfTuB2Y1tTw5jEaQfVCxUhX2';
const yrCodes = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

const MIN_RATING = 3;
const QUANT_FACTOR = 10;

class DecodedTime {    
    constructor(hour, min) {
        this.hour = hour;
        this.min = min;
    }

    getHours(){return this.hour;}

    getMins(){return this.min;}

    getSlot(){return this.min/10;}

    encode(){return this.hour*3600 + this.min*60;}

    toString(){return "(Hour: " + this.hour + ", Min: " + this.min + ")";}
}
/** 
 * @param {enum} service  
 * @param {number} bhk 
 * 
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
 * SORTSLOTSBYHOUR
 * @param {DecodedTime} slots 
 * slots= {(5,40),(5,50),(6,0),(6,10)}
 * To be returned: sortSlots: {(5:[4,5]),(6:0,1)}
 */
var sortSlotsByHour = function(slots){
    //console.log(slots);
    var sRef = {};
    for(s in slots) {
        //console.log("Slot: " + slots[s].toString());
        let slot = slots[s];
        if(sRef[slot.getHours()] === undefined) {
            sRef[slot.getHours()] = [slot.getSlot()];
        }
        else if(!sRef[slot.getHours()].includes(slot.getSlot())){
            sRef[slot.getHours()].push(slot.getSlot());
        }
    }
    console.log("After sortSlotsByHour:", sRef);    
    return sRef;
}

/**
 * @param {sortSlots} slotRef sortSlots: {(5:[4,5]),(6:0,1)}
 * 
 * returns: DecodedTime: [hr:5 , min:40]
 */
var getSlotMinTime = function(slotRef){
    let minHr = 99;     //99 is random. just has to be > 60
    let minMin = 99;
    if(slotRef !== null) {
        for(hour in slotRef) {
            minHr = (minHr < hour)?minHr:hour;
            let slots = slotRef[hour];
            if(slots !== undefined) {
                for(s in slots) {
                    minMin = (minMin < slots[s])?minMin:slots[s];
                }
            }
        }
        //minMin is actually the slot
        minMin *= 10;
        return new DecodedTime(minHr, minMin);
    }
    return null;    
}


/**
 * @param {sortSlots} slotRef sortSlots: {(5:[4,5]),(6:0,1)}
 * 
 * returns: DecodedTime: [hr:6 , min:10]
 */
var getSlotMaxTime = function(slotRef){
    let maxHr = -1;
    let maxMin = -1;
    if(slotRef !== null) {
        for(hour in slotRef) {
            maxHr = (maxHr > hour)?maxHr:hour;
            let slots = slotRef[hour];
            if(slots !== undefined) {
                for(s in slots) {
                    maxMin = (maxMin > slots[s])?maxMin:slots[s];
                }
            }
        }
        //maxMin is actually the slot
        maxMin *= 10;
        return new DecodedTime(maxHr, maxMin);
    }
    return null;    
}


/**
 * SENDASSISTANTREQUEST
 * @param {yearId: string, monthId: string, _id: string} requestPath
 * @param {service, address, time} request (contains entire request Obj)
 * @param {_id: string, clientToken: string, freeSlotLib: DecodedTime[]} assistant 
 */
// var sendAssitantRequest = function(requestPath, request, assistant) {
//     console.log("::sendAssitantRequest::INVOKED");        
//     console.log("Encoded time: " + assistant.freeSlotLib[0].encode());
//     const payload = {
//         data: {
//             RID: requestPath._id,
//             Service: request.service,
//             Address: request.address,
//             Time: String(assistant.freeSlotLib[0].encode()),      //cant send number
//             Command: COMMAND_WORK_REQUEST
//         }
//     };

//     console.log("Attempting to send the request to assistant. Request ID: " + requestPath._id + "to Assistant: " + assistant._id);
//     //send payload to assistant        
//     return messaging.sendToDevice(assistant.clientToken, payload)
//             .then(response => {
//                 console.log("Request sent succesfully! Request ID: " + requestPath._id);
//                 setTimeout(() => {
//                     console.log("Invoking routine Request status check for requestId: " + requestId);
//                     checkRequestStatus(requestPath, assistant._id);
//                 }, REQUEST_STATUS_CHECK_TIMEOUT);
//                 return 1;
//             })
//             .catch(error => {
//                 console.error("Request couldnt be sent: Request ID: " + requestPath._id + "\nError: " + error);
//                 //TODO
//                 return 0;
//             });
// }

var sendDataPayload = function(clientToken, payload) {
    console.log("::sendDataPayload::INVOKED");
    console.log(payload);
    console.log("Sending Payload: " + payload + "\nto clientToken: " + clientToken);

    return messaging.sendToDevice(clientToken, payload)
            .then(response => {
                console.log("Payload sent succesfully!");                
                return 1;
            })
            .catch(error => {
                console.error("Payload failed to be sent:" + error);
                return 0;
            });
}

/**
 * SENDUSERPAYLOAD 
 * @param {String} userID 
 * @param {Obj} payload 
 * @param {String} command 
 * returns boolean to indicate success
 */
var sendUserPayload = async function(userID, payload, command) {    
    console.log("::sendUserPayload::INVOKED");
    console.log("Parameters:: UserID: ", userID, " ,Command: ", command, " ,Payload: ", payload);
    if(userID === undefined || payload === undefined || command === undefined)return false; 
    try{
        /* eslint-disable require-atomic-updates */    
        let userToken = await db.collection(COLN_USERS).doc(userID).collection(SUBCOLN_USER_FCM).doc(DOC_USER_FCM_TOKEN).get();
        if(userToken !== undefined && userToken !== undefined && userToken.data() !== null) {
            //token now available:: tokenData: {token:.. , timestamp: ..}
            let tokenData = userToken.data();
            console.log("Token Data: ", tokenData);
            //add click action and command to data bracket and notification bracket            
            if(payload['notification'] !== undefined){
                payload.notification['click_action'] = 'FLUTTER_NOTIFICATION_CLICK';
            }
            if(payload['data'] !== undefined){        
                payload.data['command'] = command;
            }
            console.log("Payload being delivered: ", payload);
            try{                
                let fcmResponse = await messaging.sendToDevice(tokenData.token, payload);
                console.log("Payload sent successully:: Token:", tokenData.token, " Payload:", payload, fcmResponse);
                return true;
            }catch(error) {
                console.error("Payload failed to be sent: ", error);
                return false;
            }
        }
        return false;
        /* eslint-disable require-atomic-updates */    
    }catch(error) {
        console.error("Error fetching client_token: ", error);
        return false;
    }
}


/**
 * SENDASSISTANTPAYLOAD 
 * @param {String} userID 
 * @param {Obj} payload 
 * @param {String} command 
 * returns success/error code to indicate success
 */
var sendAssistantPayload = async function(assistantID, payload, command) {    
    console.log("::sendUserPayload::INVOKED");
    console.log("Parameters:: AssistantID: ", assistantID, " ,Command: ", command, " ,Payload: ", payload);
    if(assistantID === undefined || payload === undefined || command === undefined)return false; 
    try{
        /* eslint-disable require-atomic-updates */    
        let assistantTokenRef = db.collection(COLN_ASSISTANTS).doc(assistantID.trim()).collection(SUBCOLN_ASSISTANT_FCM).doc(DOC_ASSISTANT_FCM_TOKEN);
        console.log("AssistantTokenRef: ", assistantTokenRef.path);
        let assistantToken = await assistantTokenRef.get();
        if(assistantToken !== undefined && assistantToken !== undefined && assistantToken.data() !== undefined) {
            //token now available:: tokenData: {token:.. , timestamp: ..}
            let tokenData = assistantToken.data();
            console.log("Token Data: ", tokenData);            
            if(payload['data'] !== undefined){        
                payload.data['Command'] = command;  //TODO change assistant payload case to lower            
            }
            console.log("Payload being sent: ", payload);
            try{                
                let fcmResponse = await messaging.sendToDevice(tokenData.token, payload);
                console.log("Payload sent successully:: Token:", tokenData.token, " Payload:", payload, fcmResponse);
                return SUCCESS_CODE;
            }catch(error) {
                console.error("Payload failed to be sent: ", error, new Error("Assistant payload failed to be sent: " + error.toString()));
                return ERROR_CODE;
            }
        }
        return ERROR_CODE;
        /* eslint-disable require-atomic-updates */    
    }catch(error) {
        console.error("Error fetching client_token: ", error, new Error("Failed to fetch Assistant Client Token: " + error.toString()));
        return ERROR_CODE;
    }
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
   // console.log("Decoded raw time for " + time + ": Hour: " + hr + ", Min: " + min_raw);
    //round minutes to nearest 10 if not done already
    var min_trunc = Math.round(min_raw/10);    
    var mn = min_trunc*10;
    //console.log(hr," ", prod, " ", min_raw, " ", min_trunc, " ", mn);
    if(mn === 60) {
        hr += 1;
        mn = 0;    
    }
   // console.log(hr," ", prod, " ", min_raw, " ", min_trunc, " ", mn);
   //console.log("Time after rounding: Hour: " + hr + ", Min: " + mn);
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

var getTTPathName = function(yearId, monthId, date, hour) {
    console.log("TTPathName: " + yearId+monthId+String(date)+"_"+String(hour));
    return yearId+monthId+String(date)+"_"+String(hour);
}


/**
 * ISVALIDREQUEST 
 * checks if request/visit in case is from this month and year
 * @param {String} yearId 
 * @param {String} monthId 
 * @param {Integer} date
 * @param {String} pId 
 * returns boolean
 */
var isRequestDateValid = function(yearId, monthId, date, pId) {
    if(yearId === undefined || monthId === undefined || date === undefined || pId === undefined){
        console.error("Undefined Parameters:: yr:",yearId,",month:",monthId,"date:",date,"rId:",pId);
        return false;
    }
    var tDate = new Date();
    return (tDate.getFullYear().toString() === yearId.trim() && yrCodes[tDate.getMonth()] === monthId.trim() && tDate.getDate() === date);
}

/**
 * ISREQUESTVALID
 * @param {Request} requestObj 
 * 
 * check request core fields availability
 */
var isRequestValid = function(requestObj) {
    console.log("ISREQUESTVALID::INVOKED");
    if (requestObj.service === undefined 
        || requestObj.date === undefined 
        || requestObj.user_id === undefined 
        || requestObj.society_id === undefined
        || requestObj.req_time === undefined) {
            console.error("Undefined essential Request fields: ", requestObj, " skipping request");
            return false;
        }
        return true;    
}

/**
 * CLOSEUSERREQUEST
 * @param {String} userId 
 * @param {flag} code 
 * 
 * Defaults visit status if in 'Searching' or 'Cancelled'
 * - Open transaction -- check if status in searching.cancelled
 * - if yes, change to default
 * - notify user
 */
var closeUserRequest = async function(userId, code) {
    console.log("CLOSEUSERREQUEST::INVOKED");
    if(userId === undefined || code === undefined) {
        console.error('Parameted undefined..skipping');
        return;
    }
    let userStatusRef = db.collection(COLN_USERS).doc(userId).collection(SUBCOLN_USER_ACTIVITY).doc(DOC_ACTIVITY_STATUS);
    db.runTransaction(async transaction => {
        let statusFlag = false;
        try{
            let userStatusSnapshot = await transaction.get(userStatusRef);
            if(userStatusSnapshot !== undefined && userStatusSnapshot.exists) {
                let statusData = userStatusSnapshot.data();
                if(statusData['visit_status'] !== undefined 
                && (statusData['visit_status'] === VISIT_STATUS_SEARCHING || statusData['visit_status'] === VISIT_STATUS_CANCELLED)) {
                    console.log('Visit status currently in seraching/cancelled. Requires update');
                    statusFlag = true;
                }
            }
        }catch(error) {
            console.error('User status fetch: Transaction read failed', error.toString());
        }
        if(!statusFlag) {
            return Promise.reject(new Error('Request was not in Searching/cancelled'));
        }
        //statusFlag = true. Update status
        let uPayload = {
            visit_status: VISIT_STATUS_NONE,
            modified_time: fieldValue.serverTimestamp()
        };
        console.log('Transaction write: Setting user status to Default');
        await transaction.set(userStatusRef, uPayload, {merge: false});
        return Promise.resolve('User status updated successfully');
    }).then(result => {
        console.log("Transaction success: ", result);
        let payload = {};
        if(code === NO_AVAILABLE_AST_CODE) {
            payload = {
                notification: {
                    title: 'No assistant available',
                    body: 'Please try again in a while'
                },
                data: {
                    status: String(VISIT_STATUS_NONE),
                    msg_type: NO_AVAILABLE_AST_MSG,
                }
            };            
        }else{  //ERROR_CODE or any other
            payload = {
                notification: {
                    title: 'An Error Occured',
                    body: 'Please try again in a while'
                },
                data: {
                    status: String(VISIT_STATUS_NONE),
                    msg_type: ERROR_ENCOUNTERED_MSG,
                }
            }
        }        
        let sendPayloadFlag = await sendUserPayload(userId, payload, COMMAND_MISC_MESSAGE);
        console.log('Sending Payload to User: ', payload, sendPayloadFlag);
        return 1;
    }).catch(error => {
        console.error("Transaction error: ", error, 'User status not updated and user not notified');
        return 0;
    });

    
}

/**
 * UPDATEASSISTANTRATING
 * @param {String} astId required
 * @param {number} oldRating if an earlier visit is being updated, else undefined
 * @param {number} newRating required
 * 
 * return boolean to confirm operation
 */
var updateAssistantRating = async function(astId, oldRating, newRating) {
    console.log("UPDATEASSISTANTRATING::INVOKED");
    if(newRating === undefined || astId === undefined) {
        console.error("Undefined new rating/astId. Cancelling updation");
        return false;
    }
    try{        
        let astDoc = await db.collection(COLN_ASSISTANTS).doc(astId).get();
        let ast = astDoc.data();
        let finRating = getRatingAverage(ast.rating, ast.comp_visits, newRating, oldRating);
        console.log(`CurRating: ${ast.rating}, CurCompVisits: ${ast.comp_visits}, NewAverageRating:${finRating}`);
        let updateObj = {};
        updateObj['rating'] = Number(finRating);            //TODO save as number        
        if(oldRating === undefined) {
            updateObj['comp_visits'] = Number(ast.comp_visits + 1); //new visit rated
        }
        try{
            await db.collection(COLN_ASSISTANTS).doc(astId).set(updateObj, {merge: true});
            return true;
        }catch(e) {
            console.error("Error setting new assistant rating",e, new Error("Failed to set assistant doc"));
            return false;
        }
    }catch(e) {
        console.error("Error fetching assistant doc: ",e, new Error("Failed to fetch assistant doc"));
        return false;
    }
}

/**
 * 
 * @param {number} cur_avg  upto 4 decimals. current rating
 * @param {number} cur_total completed visits
 * @param {number} cur_rating  current visit rating
 * @param {number} old_rating  if an earlier visit is being updated
 * 
 * return {number} new average rating
 */
var getRatingAverage = function(cur_avg, cur_total, cur_rating, old_rating) {
    try{	
        if(cur_rating === undefined)return MIN_RATING;
        if(cur_avg === undefined)cur_avg = MIN_RATING;
        if(old_rating === cur_rating) return cur_avg;        
        let cur_qt,cur_ql,fresh_qt,fresh_ql;

        if(cur_total === undefined || cur_total === 0){
            //first visit
            cur_qt = getQuantityDatum(1);
            cur_ql = cur_rating/5;
            fresh_qt = cur_qt;
            fresh_ql = cur_ql;
        }else{
            cur_qt = getQuantityDatum(cur_total);    
            cur_ql = Math.max(cur_avg - MIN_RATING - cur_qt,0);    
            if(old_rating === undefined){
                cur_total++;
                fresh_qt = getQuantityDatum(cur_total);
                fresh_ql = ((5*cur_ql*(cur_total-1) + cur_rating)/(5*cur_total)).toPrecision(4); //simple average                
            }else{
                fresh_qt = cur_qt;
                fresh_ql = (((5*cur_ql*cur_total)-old_rating+cur_rating)/(5*cur_total)).toPrecision(4);
            }
        }        
        let finRating = (Number(MIN_RATING) + Number(fresh_ql) + Number(fresh_qt)).toPrecision(4);         
        console.log(`Rating Calculation: CurQt = ${cur_qt}, CurQl = ${cur_ql}, CurTotal = ${cur_total}, FreshQt = ${fresh_qt}, FreshQl = ${fresh_ql}, Final Rating = ${finRating}`);
        if(finRating < MIN_RATING) {
            console.error(new Error("Rating calc output incorrect"));
            finRating = MIN_RATING;
        }
        if(finRating > 5) {
            console.error(new Error("Rating calc output incorrect"));
            finRating = cur_avg;
        }
        return finRating;
    }catch(e) {
        console.error("Calculation failed: " ,e, new Error('Calculation failed' + e.toString()));
        return cur_avg;
    }
}

var getQuantityDatum = function(qty) {
    let QUANT_FACTOR = 10;
    try{
        if(!qty.isNaN) {
            let fraction = (-1*qty)/QUANT_FACTOR;
            return (1-Math.exp(fraction)).toPrecision(4);
        }
    }catch(e){
        console.error("GetQuantityDatum Failed", qty);
        return 0;
    }
    return 0;
}

module.exports = {
    COLN_USERS,COLN_ASSISTANTS,COLN_REQUESTS,COLN_VISITS,COLN_TIMETABLE,COLN_SOCIETIES,COLN_ASSISTANT_ANALYTICS,SUBCOLN_ASSISTANT_ANALYTICS,SUBCOLN_ASSISTANT_FCM,
    SUBCOLN_ASSITANT_FEEDBK,DOC_ASSISTANT_FCM_TOKEN,SUBCOLN_SOC_ASTS,DOC_SOC_AST_SERVICING,SUBCOLN_USER_FCM,SUBCOLN_USER_ACTIVITY,SUBCOLN_ASSISTANT_FINANCE,DOC_USER_FCM_TOKEN,DOC_ACTIVITY_STATUS,DOC_USER_STATS,
    AST_TOKEN,AST_TOKEN_TIMESTAMP,ARRAY_AST,DOC_ONLINE_ASTS,REQ_STATUS_ASSIGNED,REQ_STATUS_UNASSIGNED,AST_RESPONSE_NIL,AST_RESPONSE_ACCEPT,AST_RESPONSE_REJECT,COMMAND_WORK_REQUEST,
    COMMAND_REQUEST_CONFIRMED,COMMAND_VISIT_ONGOING,COMMAND_VISIT_COMPLETED,COMMAND_VISIT_CANCELLED,SERVICE_CLEANING,SERVICE_DUSTING,SERVICE_UTENSILS,SERVICE_CHORE,
    SERVICE_CLEANING_UTENSILS,SERVICE_CLEANING_DUSTING,SERVICE_DUSTING_UTENSILS,SERVICE_CLEANING_DUSTING_UTENSILS,VISIT_STATUS_FAILED,FLD_CANCLD_BY_USER,FLD_CANCLD_BY_AST,
    VISIT_STATUS_NONE,VISIT_STATUS_CANCELLED,VISIT_STATUS_COMPLETED,VISIT_STATUS_ONGOING,VISIT_STATUS_UPCOMING,TOTAL_SLOTS,BUFFER_TIME,ALPHA_ZONE_ID,REQUEST_STATUS_CHECK_TIMEOUT,
    dummy1,dummy2,dummy3,sortSlotsByHour,DecodedTime,getServiceDuration,sendDataPayload,sendUserPayload,sendAssistantPayload,decodeHourMinFromTime,getSlotMinTime,getSlotMaxTime,
    verifyTime,getTTFieldName,getTTPathName,isRequestDateValid,isRequestValid,NO_AVAILABLE_AST_CODE,ERROR_CODE,SUCCESS_CODE,closeUserRequest,updateAssistantRating    
}