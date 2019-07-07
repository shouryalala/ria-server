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
    const requestId = context.params.requestId;     //get request ID from wildcard
    const monthId = context.params.monthSubcollectionId;
    console.log("Request ID: " + requestId);
    
    let st_time = parseInt(requestObj.req_time);
    let en_time = st_time + util.getServiceDuration(requestObj.service, null);
    
    return schedular.getAvailableAssistant(requestObj.address, monthId, requestObj.date, st_time, en_time, null,null)
        .then(function(assistant){                
            if(assistant === null) {
                console.log("No available maids at the moment.");
                //TODO
                return 0;
            }
            
            console.log("Assistant details obtained: " + assistant._id + "\nSending assitant request..");            

            return util.sendAssitantRequest(requestId, requestObj, assistant)
                .then(function(response){
                    if(response === 1) {
                        console.log("Updating the snapshot's assignee.");
                        return snap.ref.set({
                            asn_id: assistant._id,
                            asn_response: util.AST_RESPONSE_NIL     //Can be set by client
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
                        Date: after_data.date,
                        Start_Time: after_data.req_time,        //TODO add end time?
                        Command: COMMAND_REQUEST_CONFIRMED
                    }
                };
                return util.sendDataPayload(clientToken, payload).then(flag => {
                    if(flag === 0) {
                        //TODO payload not sent
                    }
                });                
            })
            .catch(error => {
                console.error("Error fetching user details: " + error);
                return res.status(500).send("VISIT me in hell");
            });
        })
        .catch((error) => {
            console.error("Error creating visit obj: " + error);
            return res.status(500).send("VISIT me in hell");
        });
    }

    else if(prev_data.asn_response === util.AST_RESPONSE_NIL && prev_data.status === util.REQ_STATUS_UNASSIGNED &&
        after_data.asn_response === util.AST_RESPONSE_REJECT && after.status !== util.REQ_STATUS_ASSIGNED){
        //Log/penalize rejection and reroute request
        console.log("Assistant rejected response. Logging rejection and reroute request");
        //TODO
        return res.status(200).send("Request rejected");
    }
    return res.status(200).send("All okay. no assitant code block triggered");
}