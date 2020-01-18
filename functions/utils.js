const { db, messaging } = require('./admin');
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
const COMMAND_VISIT_CANCELLED = "VISCAN";
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
const VISIT_STATUS_NONE = 4;    //no service booked
//
//Return Codes:
const NO_AVAILABLE_AST_CODE = 2;
const ERROR_CODE = 0;
const SUCCESS_CODE = 1;
//
const FLD_CANCLD_BY_USER = "cncld_by_user";
const TOTAL_SLOTS = 6;
const BUFFER_TIME = 1200;
const ALPHA_ZONE_ID = 'z23';
const REQUEST_STATUS_CHECK_TIMEOUT = 90000  //90 seconds
const dummy1 = 'bhenbhaibhenbhai';
const dummy2 = 'acxacxsexsexsex';
const dummy3 = 'alYssfTuB2Y1tTw5jEaQfVCxUhX2';
const yrCodes = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

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

var isRequestValid = function(requestObj) {
    console.log("ISREQUESTVALID::INVOKED");
    return true;
}

var notifyUserRequestClosed = async function(userId, code) {
    console.log("NOTIFYUSERREQUESTCLOSED::INVOKED");
}

module.exports = {
    COLN_USERS,COLN_ASSISTANTS,COLN_REQUESTS,COLN_VISITS,COLN_TIMETABLE,COLN_SOCIETIES,COLN_ASSISTANT_ANALYTICS,SUBCOLN_ASSISTANT_ANALYTICS,SUBCOLN_ASSISTANT_FCM,
    SUBCOLN_ASSITANT_FEEDBK,DOC_ASSISTANT_FCM_TOKEN,SUBCOLN_SOC_ASTS,DOC_SOC_AST_SERVICING,SUBCOLN_USER_FCM,SUBCOLN_USER_ACTIVITY,DOC_USER_FCM_TOKEN,DOC_ACTIVITY_STATUS,
    AST_TOKEN,AST_TOKEN_TIMESTAMP,ARRAY_AST,DOC_ONLINE_ASTS,REQ_STATUS_ASSIGNED,REQ_STATUS_UNASSIGNED,AST_RESPONSE_NIL,AST_RESPONSE_ACCEPT,AST_RESPONSE_REJECT,COMMAND_WORK_REQUEST,
    COMMAND_REQUEST_CONFIRMED,COMMAND_VISIT_ONGOING,COMMAND_VISIT_CANCELLED,SERVICE_CLEANING,SERVICE_DUSTING,SERVICE_UTENSILS,SERVICE_CHORE,SERVICE_CLEANING_UTENSILS,VISIT_STATUS_FAILED,FLD_CANCLD_BY_USER,
    VISIT_STATUS_NONE,VISIT_STATUS_CANCELLED,VISIT_STATUS_COMPLETED,VISIT_STATUS_ONGOING,VISIT_STATUS_UPCOMING,TOTAL_SLOTS,BUFFER_TIME,ALPHA_ZONE_ID,REQUEST_STATUS_CHECK_TIMEOUT,
    dummy1,dummy2,dummy3,sortSlotsByHour,DecodedTime,getServiceDuration,sendDataPayload,sendUserPayload,sendAssistantPayload,decodeHourMinFromTime,getSlotMinTime,
    getSlotMaxTime,verifyTime,getTTFieldName,getTTPathName,isRequestDateValid,isRequestValid,NO_AVAILABLE_AST_CODE,ERROR_CODE,SUCCESS_CODE,notifyUserRequestClosed    
}