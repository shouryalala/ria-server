const util = require('./utils');
const schedular =  require('./schedular');
const {db, fieldValue} = require('./admin');

/**
 * USERREQUESTHANDLER
 * -Triggered on Creation of new Request document
 * -Fetches fields 
 * -Gets available assistant
 * -sends her a request 
 */
//better to get address from the packet than another db fetch i guess.
exports.onCreateHandler =  async (snap, context) => {
    console.log("::userRequestHandler::INVOKED");    
    const requestObj = snap.data();

    //create a request path
    let requestPath = {
        _id: context.params.requestId,
        monthId: context.params.monthSubcollectionId,
        yearId: context.params.yearDocId
    }
    console.log("REQUEST: {YearId: ",requestPath.yearId,", MonthId: ",requestPath.monthId,", Request ID: ",requestPath._id,"}");    
    console.log("Request Params: ", requestObj);

    let flag;
    try{
        flag =  await requestAssistantService(requestPath, requestObj, requestObj['rejections'], null);
    }catch(e) {
        console.error("RequestAssistantService method failed",e);
        flag = util.ERROR_CODE;
    }    

    if(flag === util.ERROR_CODE || flag === util.NO_AVAILABLE_AST_CODE) {
        //provide closure to user's request
        await util.notifyUserRequestClosed(requestObj.user_id, flag);
    }
    return flag;
}        


/**
 * ASSISTANTRESPONSEHANDLER
 * - Triggered when assistant responds to request
 * - creates a visit object if request approved
 * - alerts user of confirmation and sends details
 * - restarts search for an assistant if refused by assigned assistant
 */
exports.onUpdateHandler = async (change, context) => {
    console.log("::assistantResponseHandler::INVOKED");
    const prev_data = change.before.data();
    const after_data = change.after.data();
    //create a request path
    let requestPath = {
        _id: context.params.requestId,
        monthId: context.params.monthSubcollectionId,
        yearId: context.params.yearDocId
    }    

    //explicity check each condition before creating visit obj
    if(prev_data.asn_response === util.AST_RESPONSE_NIL && prev_data.status === util.REQ_STATUS_UNASSIGNED &&
        after_data.asn_response === util.AST_RESPONSE_ACCEPT && after_data.status === util.REQ_STATUS_ASSIGNED) {
        console.log("Assistant accepted and assigned request. Creating visit obj");        
        //assumption: the visit and request objects are in the SAME YEAR AND MONTH. thus only saving requestID        
        let vis_st = util.getSlotMinTime(after_data.slotRef);
        let vis_en = util.getSlotMaxTime(after_data.slotRef);
        var visitObj = {
            req_id: requestPath._id,
            user_id: after_data.user_id.trim(),
            user_mobile: after_data.user_mobile.trim(),
            ass_id: after_data.asn_id.trim(),
            date: after_data.date,
            service: after_data.service,
            address: after_data.address,
            society_id: after_data.society_id.trim(),
            req_st_time: after_data.req_time,
            vis_st_time: vis_st.encode(),
            vis_en_time: vis_en.encode(),
            status: util.VISIT_STATUS_UPCOMING,
            timestamp: fieldValue.serverTimestamp()
        }
        console.log(visitObj);
        let visitObjRef = db.collection(util.COLN_VISITS).doc(requestPath.yearId).collection(requestPath.monthId).doc();
        let userActivityRef = db.collection(util.COLN_USERS).doc(after_data.user_id).collection(util.SUBCOLN_USER_ACTIVITY).doc(util.DOC_ACTIVITY_STATUS);
        
        let batch = db.batch();
        //set visit document        
        batch.set(visitObjRef, visitObj);
        console.log("Created initial Visit object: ", visitObj, " for requestID: " + requestPath._id);
        //set user activity            
        var userStatusObj = {
            visit_id: visitObjRef.path,
            visit_status: util.VISIT_STATUS_UPCOMING,
            modified_time: fieldValue.serverTimestamp()
        }
        //let activityPromise = await userActivityRef.set(userStatusObj);
        batch.set(userActivityRef, userStatusObj);
        try{
            console.log("Setting both documents in a batch commit");
            await batch.commit();
            //create payload to be sent to the user
            let payload = {
                notification: {
                    title: 'Assitant on their way',
                    body: after_data.asn_id + ' will reach soon!',                    
                },
                //Field keys should replicate client visit object keys
                data: {
                    visit_path: visitObjRef.path,
                    ass_id: after_data.asn_id,
                    date: String(after_data.date),
                    req_st_time: String(after_data.req_time),                    
                    vis_st_time: String(vis_st.encode()),
                    vis_en_time: String(vis_en.encode()),
                    service: after_data.service,
                    status: String(util.VISIT_STATUS_UPCOMING),
                    user_id: after_data.user_id,    //shouldnt be required
                }
            };
            let sendPayloadFlag = await util.sendUserPayload(after_data.user_id, payload, util.COMMAND_REQUEST_CONFIRMED);
            console.log("Batch commit succesful! SendPayloadFlag: ", sendPayloadFlag);
            return util.SUCCESS_CODE;
        }catch(e) {
            console.error("Batch write failed: ", e, new Error("Batch Write Failed: " + e.toString()));            
            return util.ERROR_CODE;
        }            
    
    }

    else if(prev_data.asn_response === util.AST_RESPONSE_NIL && prev_data.status === util.REQ_STATUS_UNASSIGNED &&
        after_data.asn_response === util.AST_RESPONSE_REJECT && after_data.status !== util.REQ_STATUS_ASSIGNED){        
        console.log("Assistant rejected response. Logging rejection and rerouting request.");        
        let a_id = after_data.asn_id;        
        /**
         * Current:OPTION 1:                                  OPTION 2:
         * - log rejection in assistant_rejections          - revert timetable object
         * - revert timetable object                        - create new request with added assistant exception
         * - revert request object fields
         * - reassign request
         */
        let rPayload = {
            rejections: fieldValue.arrayUnion(requestPath._id)
        };
      
        let docKey = `${requestPath.yearId}-${requestPath.monthId}-RJCT`;  //ex: 2019-OCT-RJCT
        let aRef = db.collection(util.COLN_ASSISTANTS).doc(a_id).collection(util.SUBCOLN_ASSISTANT_ANALYTICS).doc(docKey);
        let astAnalyticsBlock = {
            ref: aRef,
            payload: rPayload
        };

        let flag;
        try{
            flag = await rerouteRequest(requestPath, after_data, astAnalyticsBlock);   
        }catch(e) {
            console.error("RerouteRequest method failed",e);
            flag = util.ERROR_CODE;
        }    

        if(flag === util.ERROR_CODE || flag === util.NO_AVAILABLE_AST_CODE) {
            //provide closure to user's request
            await util.notifyUserRequestClosed(after_data.user_id, flag);
        }
        return flag;        
    }
    console.log("All okay. no assitant code block triggered")
    return util.SUCCESS_CODE;
}

/**
 * REQUESTASSISTANTSERVICE
 * @param {yearId, monthId, _id} requestPath 
 * @param {any} requestObj - complete request object
 * @param {array} exceptions - rejected assistant list
 * @param {string} forceAssistant - single assistant
 */
var requestAssistantService = async function(requestPath, requestObj, exceptions, forceAssistant) {    
    if(!util.isRequestValid(requestObj)) {
        console.error("Invalid Request Object: ", requestObj, 
            new Error("Invalid Request Object: " + JSON.stringify(requestObj)));
        return util.ERROR_CODE;
    }
    if(!util.isRequestDateValid(requestPath.yearId, requestPath.monthId, requestObj.date, requestPath._id)) {
        console.error("Request from an expired date: ", requestPath, 
            new Error("Expired request recevied " + JSON.stringify(requestPath)));        
        return util.ERROR_CODE;
    }    
    let st_time = parseInt(requestObj.req_time);
    let en_time = st_time + util.getServiceDuration(requestObj.service, null);
    let astSlotDetails;
    try{
        astSlotDetails = await schedular.getAvailableAssistant(requestObj.society_id, requestPath.monthId, requestObj.date, st_time, en_time, exceptions, forceAssistant);
    }catch(e) {
        console.error("Function getAvailableAssistant Failed.",e, new Error("getAvailableAssistant failed: " + e.toString()));
        return util.ERROR_CODE;
    }
    //ensure received result is not empty and not invalid TODO code neatness required
    if(astSlotDetails === null || astSlotDetails === util.ERROR_CODE || astSlotDetails === util.NO_AVAILABLE_AST_CODE || 
        astSlotDetails._id === undefined || astSlotDetails.freeSlotLib === undefined) {
        if(astSlotDetails === schedular.NO_AST_AVLBLE_CODE) {            
            console.log("No available maids at the moment.");        
            return util.NO_AVAILABLE_AST_CODE;
        }
        else{
            console.error("Function getAvailableAssistant Failed.");
            return util.ERROR_CODE;
        }
    }

    console.log("Assistant details:: Id:",astSlotDetails._id," Booking assitant schedule: ", astSlotDetails.freeSlotLib);
    let slotRef = util.sortSlotsByHour(astSlotDetails.freeSlotLib);
    let bookingFlag;
    try{
        bookingFlag = await schedular.bookAssistantSlot(util.ALPHA_ZONE_ID, requestPath.monthId, requestObj.date, slotRef, astSlotDetails._id);
    }catch(e) {
        console.error("Received error tag from :bookAssistantSlot: ", e, 
            new Error("BookAssistantSlot method failed: " + e.toString()));
        return util.ERROR_CODE;
    }    
    
    if(bookingFlag === 1) {
        const payload = {
            data: {
                rId: requestPath._id,
                service: requestObj.service,                            
                date: String(requestObj.date),                            
                time: String(astSlotDetails.freeSlotLib[0].encode()),      //cant send number
                address: requestObj.address,
                socId: requestObj.society_id,
                //Command: COMMAND_WORK_REQUEST
            }
        };

        try{
            let response = await util.sendAssistantPayload(astSlotDetails._id, payload, util.COMMAND_WORK_REQUEST);
            if(response === util.SUCCESS_CODE) {
                console.log("Updating the snapshot's assignee.");
                let pathRef = db.collection(util.COLN_REQUESTS).doc(requestPath.yearId).collection(requestPath.monthId).doc(requestPath._id);                            
                try{
                    await pathRef.set({
                        asn_id: astSlotDetails._id,
                        asn_response: util.AST_RESPONSE_NIL,     //Can be set by client
                        slotRef: slotRef
                    }, {merge: true});

                    setTimeout(() => {
                        console.log("Invoking routine Request status check for requestId: " + requestPath._id);
                        checkRequestStatus(requestPath, astSlotDetails._id);
                    }, util.REQUEST_STATUS_CHECK_TIMEOUT);      
                    return util.SUCCESS_CODE;
                }catch(e) {
                    console.error("Updating assistant snapshot to assigned: Failed", e);
                    return util.ERROR_CODE;
                }                
            }else{
                console.error("Failed to send request to assistant. redirect request and log problem");
                //TODO
                return util.ERROR_CODE;
            }
        }catch(e) {
            console.error("Sending Assistant Payload failed",e, 
                new Error("sendAssistantPayload method failed: " + e.toString()));
        }
    }
    else{
        console.error("Booking failed. Inform user to try again", slotRef);     
        return util.ERROR_CODE;
    }   
}

/**
 * CHECKREQUESTSTATUS
 * @param {yearId: string, monthId: string, _id: string} requestPath
 * @param {string} assId (assistant ID)
 * 
 * method checks whether assistant has responded to request or not after waiting for a period of time. 
 * -if not, restart request handling process
 */
var checkRequestStatus = async function(requestPath, assId) {
    console.log("::checkRequestStatus::INVOKED");
    let docSnapshot;
    try{
        docSnapshot = await db.collection(util.COLN_REQUESTS).doc(requestPath.yearId).collection(requestPath.monthId).doc(requestPath._id).get();
        const aDoc = docSnapshot.data();
        if(aDoc.asn_id === undefined && aDoc.asn_response === undefined) {
            console.log("Request has no assignee yet. Prolly no assistant was available");
            return util.SUCCESS_CODE;
        }
        if(aDoc.asn_id !== assId) {
            console.log("checkRequestStatus for RequestId: " + requestPath._id + ", AssistantId: " + assId + " outdated. Request reassigned since.");
            //nothing to be done here
            return util.SUCCESS_CODE;
        }
        else {
            if(aDoc.asn_response === util.AST_RESPONSE_ACCEPT){
                //TODO maybe verify if status is assigned yet or not. not reqd
                console.log("checkRequestStatus verified request: " + requestPath._id + " All in order.");
                return util.SUCCESS_CODE;
                
            }else if(aDoc.asn_response === util.AST_RESPONSE_REJECT){
                //should never happen. corner case when request is in process of being rerouted and gets caught by this method
                console.error("Request: " + requestPath._id + " has been rejected by Assistant: " + assId + " but hasnt been rerouted.", 
                    new Error("Found Request sitting in REJECTED state: " + JSON.stringify(requestPath) + " " + assId));
                return util.ERROR_CODE;
            }else if(aDoc.asn_response === util.AST_RESPONSE_NIL){
                //the assigned assistant is still the same and the her response is stil nil
                //log analytics
                console.log("Request: " + requestPath._id + " hasnt been responded to by assistant: " + assId + " Required to be rerouted");                
                let rPayload = {
                    noresponse: fieldValue.arrayUnion(requestPath._id)
                };
                let docKey = `${requestPath.yearId}-${requestPath.monthId}-NORES`;  //ex: 2020-JAN-NORES
                let aRef = db.collection(util.COLN_ASSISTANTS).doc(assId).collection(util.SUBCOLN_ASSISTANT_ANALYTICS).doc(docKey);
                let astAnalyticsBlk = {
                    ref: aRef,
                    payload: rPayload
                };

                let flag;
                try{
                    //rerouteRequest fail/success, + requestAssistantService fail/success captured here
                    flag = await rerouteRequest(requestPath, aDoc, astAnalyticsBlk);
                }catch(e) {
                    flag = util.ERROR_CODE;
                    console.error("RerouteRequest method failed: ",e, 
                        new Error("RerouteRequest method failed: " + e.toString()));                    
                }

                if(flag === util.ERROR_CODE || flag === util.NO_AVAILABLE_AST_CODE) {
                    await util.notifyUserRequestClosed(aDoc.user_id, flag);
                }
                return flag;
            }
        }
    }catch(e) {
        console.error("Error in retrieving record: ",e,
             new Error("Couldnt retrieve Request: " + JSON.stringify(requestPath)));
        return util.ERROR_CODE;
    }   
}

/**
 * REROUTEREQUEST
 * @param {yearId: string, monthId: string, _id: string} requestPath 
 * @param {Request Obj} requestObj 
 * @param {ref: string, payload: obj} astAnalyticsBlk, to be added to a batch command
 */
var rerouteRequest = async function(requestPath, requestObj, astAnalyticsBlk) {
    astAnalyticsBlk = astAnalyticsBlk || 0; //sets to 0 if not passed by calling function
    if(requestPath === undefined || requestObj === undefined || requestObj.asn_id === undefined || requestObj.slotRef === undefined) {
        console.error("Invalid parameters. Dropping rerouteRequest. Paramters: ",requestPath,requestObj);
        return util.ERROR_CODE;
    }
    let reqSlotRef = requestObj.slotRef;
    let a_id = requestObj.asn_id;
    let r_rejections = requestObj.rejections; 

    let batch = db.batch();
    if(astAnalyticsBlk !== 0) {
        batch.set(astAnalyticsBlk.ref, astAnalyticsBlk.payload, {merge: true});
    }   
    
    try{
        let unbookFlag = await schedular.unbookAssistantSlot(util.ALPHA_ZONE_ID, requestPath.monthId, requestObj.date, reqSlotRef, a_id);
        console.log("Unbooked Assistant Timetable: ", unbookFlag.toString());
        if(unbookFlag === 1) {
            //revert request fields
            //THIS will trigger request update again! BE CAREFUL
            let delRef = db.collection(util.COLN_REQUESTS).doc(requestPath.yearId).collection(requestPath.monthId).doc(requestPath._id);
            let delPayload = {
                asn_id: fieldValue.delete(),
                asn_response: util.AST_RESPONSE_NIL,
                slotRef: fieldValue.delete(),
                status: util.REQ_STATUS_UNASSIGNED,
                rejections: fieldValue.arrayUnion(a_id)
            } 
            batch.set(delRef, delPayload, {merge: true});

            try{
                await batch.commit();
                console.log("Batch command complete for deleting payload and updating analytics if any.");
                //request Assistant Service again but add the current rejected assistant in the exceptions list                    
                if(r_rejections === undefined || r_rejections === null || r_rejections.length === 0) {
                    r_rejections = [a_id];
                }else{
                    r_rejections.push(a_id);
                }                    
                return await requestAssistantService(requestPath, requestObj, r_rejections, null);
            }catch(e) {
                console.error("Batch commit failed: ", e,
                    new Error("RerouteRequest batch commit failed: " + e.toString()));
                return util.ERROR_CODE;
            }
        }else{
            console.error("Received error flag from unbookAssistantSlot.");
            return util.ERROR_CODE;
        }
    }catch(e) {
        console.error("Error unbooking slots: ",e, new Error("UnbookAssistantSlot method failed: " + e.toString()));
        return util.ERROR_CODE;
    }
}