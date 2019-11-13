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
exports.onCreateHandler =  (snap, context) => {
    console.log("::userRequestHandler::INVOKED");    
    const requestObj = snap.data();

    //create a request path
    let requestPath = {
        _id: context.params.requestId,
        monthId: context.params.monthSubcollectionId,
        yearId: context.params.yearDocId
    }
    console.log("REQUEST: {YearId: ",requestPath.yearId,", MonthId: ",requestPath.monthId,", Request ID: ",requestPath._id,"}");
    
    console.log(requestObj);
    console.log(requestObj.exceptions);
    return requestAssistantService(requestPath, requestObj);
}        


/**
 * ASSISTANTRESPONSEHANDLER
 * - Triggered when assistant responds to request
 * - creates a visit object if request approved
 * - alerts user of confirmation adn sends details
 * - restarts search for an assistant if refused by assistant
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
        let requestId = context.params.requestId;   
        let vis_st = util.getSlotMinTime(after_data.slotRef);
        let vis_en = util.getSlotMaxTime(after_data.slotRef);
        var visitObj = {
            req_id: requestId,
            user_id: after_data.user_id,
            user_mobile: after_data.user_mobile,
            ass_id: after_data.asn_id,
            date: after_data.date,
            service: after_data.service,
            address: after_data.address,
            society_id: after_data.society_id,
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
        //let visPromise = await visitObjRef.set(visitObj);
        batch.set(visitObjRef, visitObj);
        console.log("Created initial Visit object: ", visitObj, " for requestID: " + requestPath._id);
        //set user activity            
        var userStatusObj = {
            visit_id: visitObjRef.path,
            visit_status: util.VISIT_STATUS_UPCOMING
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
                    body: after_data.asn_id + 'will reach soon!',                    
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
            return 1;
        }catch(e) {
            console.error("Batch write failed: ", e);
            return 0;
        }            
    
    }

    else if(prev_data.asn_response === util.AST_RESPONSE_NIL && prev_data.status === util.REQ_STATUS_UNASSIGNED &&
        after_data.asn_response === util.AST_RESPONSE_REJECT && after_data.status !== util.REQ_STATUS_ASSIGNED){        
        console.log("Assistant rejected response. Logging rejection and rerouting request.");
        let reqSlotRef = after_data.slotRef;
        let a_id = after_data.asn_id;
        let r_rejections = after_data.rejections; 
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

        // try{
        //     let rejectionPromise = await db.collection(util.COLN_ASSISTANT_ANALYTICS).doc(requestPath.yearId).collection(requestPath.monthId).doc(a_id).set(rPayload,{merge: true});
        //     console.log("Rejection Promise: ", rejectionPromise);
        // }catch(error){
        //     console.error("Error adding new document to assistant_rejections ", error);
        // }        

        try{
            let docKey = requestPath.monthId + requestPath.yearId;  //ex: OCT2019
            let rejectionPromise = await db.collection(util.COLN_ASSISTANTS).doc(a_id).collection(util.SUBCOLN_ASSISTANT_ANALYTICS).doc(docKey).set(rPayload,{merge: true});
            console.log("Rejection Promise: ", rejectionPromise);
        }catch(error){
            console.error("Error adding new document to assistant_rejections ", error);
        }        


        let delPayload = {
            asn_id: fieldValue.delete(),
            asn_response: util.AST_RESPONSE_NIL,
            slotRef: fieldValue.delete(),
            status: util.REQ_STATUS_UNASSIGNED,
            rejections: fieldValue.arrayUnion(a_id)
        }  

        // let createPayload = {
        //     address: after_data.address,
        //     asn_response: util.AST_RESPONSE_NIL,
        //     date: after_data.date,            
        //     req_time: after_data.req_time,
        //     service: after_data.service,
        //     society_id: after_data.society_id,
        //     status: util.REQ_STATUS_UNASSIGNED,
        //     user_id: after_data.user_id,
        //     timestamp: Date.now()
        // }

        if(reqSlotRef !== undefined) {
            return schedular.unbookAssistantSlot(util.ALPHA_ZONE_ID, requestPath.monthId, after_data.date, reqSlotRef, a_id).then(async flag => {
                if(flag === 1) {
                    try{
                        //revert request fields
                        //THIS will trigger this method again!
                        let reqDelPromise = await db.collection(util.COL_REQUEST).doc(requestPath.yearId).collection(requestPath.monthId).doc(requestPath._id).set(delPayload,{merge: true});
                        console.log("Reverted request to accept new assignee: ", requestPath._id, reqDelPromise);
                    }catch(error) {
                        console.error("Error reverting request fields: ", delPayload, error);
                        return 0;
                    }
                    //request Assistant Service again but add the current rejected assistant in the exceptions list                    
                    if(r_rejections === undefined || r_rejections.length === 0) {
                        r_rejections = [a_id];
                    }else{
                        r_rejections.push(a_id);
                    }                    
                    return requestAssistantService(requestPath, after_data, r_rejections, null);
                }else{
                    console.error("Received error flag from unbookAssistantSlot.");
                    return 0;
                }
            }).catch(error => {
                console.error("Error unbooking slot: " + error);
                return 0;
            });
        }
        //TODO
        return 1;
    }
    console.log("All okay. no assitant code block triggered")
    return 1;
}

/**
 * REQUESTASSISTANTSERVICE
 * @param {yearId, monthId, _id} requestPath 
 * @param {any} requestObj - complete request object
 * @param {array} exceptions - rejected assistant list
 * @param {string} forceAssistant - single assistant
 */
var requestAssistantService = function(requestPath, requestObj, exceptions, forceAssistant) {
    let st_time = parseInt(requestObj.req_time);
    let en_time = st_time + util.getServiceDuration(requestObj.service, null);

    return schedular.getAvailableAssistant(requestObj.address, requestPath.monthId, requestObj.date, st_time, en_time, exceptions, forceAssistant)
        .then(assistant => {
            if(assistant._id === undefined || assistant.freeSlotLib === undefined) {
                console.log("No available maids at the moment.");
                //TODO
                return 0;
            }
            console.log("Assistant details:: Id:",assistant._id," Booking assitant schedule: ", assistant.freeSlotLib);
            let slotRef = util.sortSlotsByHour(assistant.freeSlotLib);
            return schedular.bookAssistantSlot(util.ALPHA_ZONE_ID, requestPath.monthId, requestObj.date, slotRef, assistant._id).then(flag => {
                if(flag === 1) {
                    const payload = {
                        data: {
                            RID: requestPath._id,
                            Service: requestObj.service,                            
                            Date: String(requestObj.date),                            
                            Time: String(assistant.freeSlotLib[0].encode()),      //cant send number
                            Address: requestObj.address,
                            SocID: requestObj.society_id,
                            //Command: COMMAND_WORK_REQUEST
                        }
                    };
                    //return util.sendAssitantRequest(requestPath, requestObj, assistant).then(response => {
                    return util.sendAssistantPayload(assistant._id, payload, util.COMMAND_WORK_REQUEST).then(response => {
                        if(response === true) {
                            console.log("Updating the snapshot's assignee.");
                            let pathRef = db.collection(util.COL_REQUEST).doc(requestPath.yearId).collection(requestPath.monthId).doc(requestPath._id);
                            //snap.ref.set({
                            return pathRef.set({
                                asn_id: assistant._id,
                                asn_response: util.AST_RESPONSE_NIL,     //Can be set by client
                                slotRef: slotRef
                            }, {merge: true});                            
                        }else{
                            console.error("Failed to send request to assistant. redirect request and log problem");
                            //TODO
                            return 0;
                        }
                    }, error => {
                        console.error("Recevied error tag from :sendAssistantRequest: ", error);
                        return 0;
                    });
                }
                else{
                    console.error("Booking failed. Inform user to try again", slotRef);
                    //TODO
                    return 0;
                }
            }, error => {
                console.error("Received error tag from :bookAssistantSlot: ", error);
                return 0;
            });
        });       
}