const util = require('./utils');
const schedular =  require('./schedular');
const {db} = require('./admin');

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
    //const requestId = context.params.requestId;     //get request ID from wildcard
    //const yearId = context.params.yearDocId;
    //const monthId = context.params.monthSubcollectionId;

    //create a request path
    let requestPath = {
        _id: context.params.requestId,
        monthId: context.params.monthSubcollectionId,
        yearId: context.params.yearDocId
    }
    console.log("REQUEST: {YearId: " + requestPath.yearId + ", MonthId: " + requestPath.monthId + ", Request ID: " + requestPath._id + "}");
    
    let st_time = parseInt(requestObj.req_time);
    let en_time = st_time + util.getServiceDuration(requestObj.service, null);
    
    return schedular.getAvailableAssistant(requestObj.address, requestPath.monthId, requestObj.date, st_time, en_time, null,null)
        .then(assistant => {
            if(assistant._id === undefined || assistant.freeSlotLib === undefined) {
                console.log("No available maids at the moment.");
                //TODO
                return 0;
            }
            console.log("Assistant details:: Id:",assistant._id," Booking assitant schedule: ", assistant.freeSlotLib);
            const slotRef = util.sortSlotsByHour(assistant.freeSlotLib);
            return schedular.bookAssistantSlot(util.ALPHA_ZONE_ID, requestPath.monthId, requestObj.date, slotRef, assistant._id).then(flag => {
                if(flag === 1) {
                    return util.sendAssitantRequest(requestPath, requestObj, assistant).then(response => {
                        if(response === 1) {
                            console.log("Updating the snapshot's assignee.");
                            return snap.ref.set({
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


/**
 * ASSISTANTRESPONSEHANDLER
 * - Triggered when assistant responds to request
 * - creates a visit object if request approved
 * - restarts search for an assistant if refused by assistant
 */
exports.onUpdateHandler = (change, context) => {
    console.log("::assistantResponseHandler::INVOKED");
    const prev_data = change.before.data();
    const after_data = change.after.data();
    
    //explicity check each condition before creating visit obj
    if(prev_data.asn_response !== util.AST_RESPONSE_ACCEPT && prev_data.status === util.REQ_STATUS_UNASSIGNED &&
        after_data.asn_response === util.AST_RESPONSE_ACCEPT && after_data.status === util.REQ_STATUS_ASSIGNED) {
        console.log("Assistant accepted and assigned request. Creating visit obj");
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
            status: util.VISIT_STATUS_UPCOMING
        }
        return db.collection(util.COLN_VISITS).doc(yearDocId).collection(subCollectionId).add(visitObj).then(() => {
            console.log("Created initial Visit object for requestID: " + requestDocId);
            //Now fetch assistant details and send them to user along with request confirmation
            return db.collection(util.COLN_USERS).doc(after_data.user_id).get().then(docSnapshot => {
                let user = docSnapshot.data();
                let clientToken = user.mClientToken;
                let payload = {
                    data: {
                        ID: after_data.asn_id,                                                
                        Date: String(after_data.date),
                        Start_Time: String(after_data.req_time),        //TODO add end time?
                        Command: util.COMMAND_REQUEST_CONFIRMED
                    }
                };
                return util.sendDataPayload(clientToken, payload);
            })
            .catch(error => {
                console.error("Error fetching user details: " + error);
                return 0;
            });
        })
        .catch((error) => {
            console.error("Error creating visit obj: " + error);
            return 0;
        });
    }

    else if(prev_data.asn_response === util.AST_RESPONSE_NIL && prev_data.status === util.REQ_STATUS_UNASSIGNED &&
        after_data.asn_response === util.AST_RESPONSE_REJECT && after_data.status !== util.REQ_STATUS_ASSIGNED){
        //Log/penalize rejection and reroute request
        console.log("Assistant rejected response. Logging rejection and reroute request");
        //TODO
        return 1;
    }
    console.log("All okay. no assitant code block triggered")
    return 1;
}