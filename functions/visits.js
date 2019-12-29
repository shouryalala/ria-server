const util = require('./utils');
const {db, fieldValue} = require('./admin');

exports.onUpdateHandler = async(change, context) => {
    console.log("::visitUpdateHandler:: INVOKED");
    const prev_data = change.before.data();
    const after_data = change.after.data();
    //create a visit path
    let visitPath = {
        _id: context.params.visitId,
        monthId: context.params.monthSubcollectionId,
        yearId: context.params.yearDocId
    }
    if(!util.isValidRequest(visitPath.yearId, visitPath.monthId, after_data.date, visitPath._id)) {
        console.error("Received visit update for invalid date range. Skipping request:", visitPath);
        return;
    }
    
    //TODO is null check required?
    if(prev_data.status === util.VISIT_STATUS_UPCOMING && after_data.status === util.VISIT_STATUS_ONGOING) {
        console.log(":VISIT UPDATE: ONGOING");
        if(after_data.user_id === undefined || after_data.ass_id === undefined){
            log.error("Invalid user/ass id");
            return;
        }        
        let anPromise;
        if(after_data.act_st_time !== undefined && after_data.vis_st_time !== undefined) {
            //Add assistant anayltics
            let diff = after_data.vis_st_time - after_data.act_st_time;
            let docKey = `${visitPath.yearId}-${visitPath.monthId}-VDIFF`;  //ex: 2019-OCT-VDIFF
            let anObj = {};
            anObj[visitPath._id] = {};            
            anObj[visitPath._id]['in_diff'] = diff;
            //no need to batch. visit should be updated regardless of whether this goes through.. USE SET FOR CREATING MAP AND UPDATE FOR UPDATING IT
            anPromise = await db.collection(util.COLN_ASSISTANTS).doc(after_data.ass_id).collection(util.SUBCOLN_ASSISTANT_ANALYTICS).doc(docKey).set(anObj, {merge:true});
        }
        let visitPathStr = `${util.COLN_VISITS}/${visitPath.yearId}/${visitPath.monthId}/${visitPath._id}`;
        let userStatusObj = {
            visit_id: visitPathStr,
            visit_status: util.VISIT_STATUS_ONGOING,
            modified_time: fieldValue.serverTimestamp()
        }
        let userActivityPromise = await db.collection(util.COLN_USERS).doc(after_data.user_id).collection(util.SUBCOLN_USER_ACTIVITY).doc(util.DOC_ACTIVITY_STATUS).set(userStatusObj);
            //create payload to be sent to the user
            let payload = {
                notification: {
                    title: 'Work in progress!',
                    body: after_data.ass_id + ' has started!',
                },
                //Field keys should replicate client visit object keys
                data: {
                    visit_path: visitPathStr,
                    ass_id: after_data.ass_id,                    
                    status: String(util.VISIT_STATUS_ONGOING),
                    user_id: after_data.user_id,    //shouldnt be required
                }
            };
        let sendPayloadFlag = await util.sendUserPayload(after_data.user_id, payload, util.COMMAND_VISIT_ONGOING);
        console.log("Assitant analytics updated: ", anPromise, " User Activity updated: ", userActivityPromise, " Payload sent to user: ", sendPayloadFlag);
    }
    else if(prev_data.status === util.VISIT_STATUS_ONGOING && after_data.status === util.VISIT_STATUS_COMPLETED){
        console.log(":VISIT UPDATE: COMPLETED");
        if(after_data.user_id === undefined || after_data.ass_id === undefined){
            log.error("Invalid user/ass id");
            return;
        }        
        let anPromise;
        if(after_data.act_en_time !== undefined && after_data.vis_en_time !== undefined && after_data.act_st_time !== undefined) {
            //Add assistant anayltics
            let diff = after_data.vis_en_time - after_data.act_en_time;
            let docKey = `${visitPath.yearId}-${visitPath.monthId}-VDIFF`;  //ex: 2019-OCT-VDIFF
            let anObj = {};
            anObj[`${visitPath._id}.out_diff`] = diff;
            anObj[`${visitPath._id}.total`] = after_data.act_en_time - after_data.act_st_time;
            //no need to batch. visit should be updated regardless of whether this goes through
            anPromise = await db.collection(util.COLN_ASSISTANTS).doc(after_data.ass_id).collection(util.SUBCOLN_ASSISTANT_ANALYTICS).doc(docKey).update(anObj);
        }
        let visitPathStr = `${util.COLN_VISITS}/${visitPath.yearId}/${visitPath.monthId}/${visitPath._id}`;
        let userStatusObj = {
            visit_id: visitPathStr,
            visit_status: util.VISIT_STATUS_COMPLETED,
            modified_time: fieldValue.serverTimestamp()
        }
        let userActivityPromise = await db.collection(util.COLN_USERS).doc(after_data.user_id).collection(util.SUBCOLN_USER_ACTIVITY).doc(util.DOC_ACTIVITY_STATUS).set(userStatusObj);
            //create payload to be sent to the user
            let payload = {
                notification: {
                    title: 'All done!',
                    body: 'Please rate your experience',
                },
                //Field keys should replicate client visit object keys
                data: {
                    visit_path: visitPathStr,
                    ass_id: after_data.ass_id,  
                    status: String(util.VISIT_STATUS_COMPLETED),
                    user_id: after_data.user_id,    //shouldnt be required
                }
            };
        let sendPayloadFlag = await util.sendUserPayload(after_data.user_id, payload, util.COMMAND_VISIT_ONGOING);
        console.log("Assitant analytics updated: ", anPromise, " User Activity updated: ", userActivityPromise, " Payload sent to user: ", sendPayloadFlag);

    }
    else if(prev_data.status === util.VISIT_STATUS_UPCOMING && after_data.status === util.VISIT_STATUS_CANCELLED) {
        console.log(":VISIT UPDATE: CANCELLED");
        let visitPathStr = `${util.COLN_VISITS}/${visitPath.yearId}/${visitPath.monthId}/${visitPath._id}`;
        let visitAst = after_data.ass_id;
        let visitUser = after_data.user_id;
        if(visitAst === undefined || visitUser === undefined) {
            console.error('Visit Cancel:: Invalid user_id/ast_id. Trashing request');
            return;
        }
        if(after_data[util.FLD_CANCLD_BY_USER] !== undefined && !after_data[util.FLD_CANCLD_BY_USER]) {
            console.log('Assistant cancelled visit. Logging cancellation and informing user.');
            let docKey = `${visitPath.yearId}-${visitPath.monthId}-CNCLD`;  //ex: 2019-DEC-CNCLD   
            let batch = db.batch();
            let astCancRef = db.collection(util.COLN_ASSISTANTS).doc(visitAst).collection(util.SUBCOLN_ASSISTANT_ANALYTICS).doc(docKey); //.set(vPayload,{merge:true});
            let userActivityRef = db.collection(util.COLN_USERS).doc(after_data.user_id).collection(util.SUBCOLN_USER_ACTIVITY).doc(util.DOC_ACTIVITY_STATUS);//.set(userStatusObj);
            let vPayload = {
                cancels: fieldValue.arrayUnion(visitPath._id)
            };                     
            batch.set(astCancRef, vPayload, {merge: true});
            //console.log("Added assistant analytics for cancellation", astCancPromise);
            //TODO add timestamp
            let userStatusObj = {
                visit_id: visitPathStr,
                visit_status: util.VISIT_STATUS_CANCELLED,
                modified_time: fieldValue.serverTimestamp()
            };                        
            batch.set(userActivityRef, userStatusObj);

            try{
                console.log("Setting both documents in a batch commit");
                await batch.commit();
                //create payload to be sent to the user
                let payload = {
                    notification: {
                        title: 'Assistant has cancelled :(',
                        body: 'Shall we book again?'
                    },
                    data: {
                        visit_path: visitPathStr,
                        ass_id: after_data.ass_id,  
                        status: String(util.VISIT_STATUS_CANCELLED),
                        user_id: after_data.user_id,    //shouldnt be required
                    }
                };
                let sendPayloadFlag = await util.sendUserPayload(after_data.user_id, payload, util.COMMAND_VISIT_CANCELLED);
                console.log("Batch commit succesful! SendPayloadFlag: ", sendPayloadFlag);
                return;
            }catch(e) {
                console.error("Batch write failed: ", e);
                return;
            }              
        }
        else if(after_data[util.FLD_CANCLD_BY_USER] !== undefined && after_data[util.FLD_CANCLD_BY_USER])  {
            console.log('User cancelled the visit. Logging cancellation');
            let batch = db.batch();
            let docKey = `${visitPath.yearId}-${visitPath.monthId}-CNCLD`;  //ex: 2019-DEC-CNCLD   
            let userCancRef = db.collection(util.COLN_USERS).doc(visitAst).collection(util.SUBCOLN_ASSISTANT_ANALYTICS).doc(docKey); //.set(vPayload,{merge:true});
            let userActivityRef = db.collection(util.COLN_USERS).doc(after_data.user_id).collection(util.SUBCOLN_USER_ACTIVITY).doc(util.DOC_ACTIVITY_STATUS);            
            let vPayload = {
                cancels: fieldValue.arrayUnion(visitPath._id)
            };
            batch.set(userCancRef, vPayload, {merge:true});
            let uPayload = {
                visit_status: util.VISIT_STATUS_NONE,
                modified_time: fieldValue.serverTimestamp()
            };
            batch.set(userActivityRef, uPayload);
            try{
                //let userCancPromise = await userCancRef.set(vPayload, {merge:true});
                await batch.commit();
                console.log('Batch cancellation commit: ');
            }catch(e) {
                console.error('user cancellation analytics logging failed:', e);
            }
        }
        else{
            console.error('Visit cancelled but no idea who did it!');
        }

    }
    else{
        console.log("No block triggered. Skipping.");
    }

}

exports.onRebookHandler = async(change, context) => {
    console.log('ONREBOOKHANDLER:: TRIGGERED');
    console.log(change.before, change.after);
    console.log(context);
    const prev_data = change.before.data();
    const after_data = change.after.data();
    /**
     * trigger when user adds a rebook document specifying which visit to rebook
     * cross verify with user activity to ensure this is valid?
     * 
     * NAAH fuck this lets just use the visit object to make the rebook handler
     */
    
    //if(prev_data !== undefined && )
}

















