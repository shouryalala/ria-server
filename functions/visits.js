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
    if(!util.isRequestDateValid(visitPath.yearId, visitPath.monthId, after_data.date, visitPath._id)) {
        console.error("Received visit update for invalid date range. Skipping request:", visitPath);
        return;
    }
    
    if(prev_data.status !== undefined && after_data.status !== undefined && prev_data.status !== after_data.status){
        console.log(`Visit Update:: Change in status:: Prev: ${prev_data.status}, After: ${after_data.status}`);
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
            await onVisitCompleted(after_data, visitPath);            
            
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
            if(prev_data[util.FLD_CANCLD_BY_AST] === undefined && after_data[util.FLD_CANCLD_BY_AST] !== undefined
                 && after_data[util.FLD_CANCLD_BY_AST]) {
                console.log('Assistant cancelled visit. Logging cancellation and informing user.');
                let docKey = `${visitPath.yearId}-${visitPath.monthId}-CNCLD`;  //ex: 2019-DEC-CNCLD   
                let batch = db.batch();
                let astCancRef = db.collection(util.COLN_ASSISTANTS).doc(visitAst).collection(util.SUBCOLN_ASSISTANT_ANALYTICS).doc(docKey); //.set(vPayload,{merge:true});
                let userActivityRef = db.collection(util.COLN_USERS).doc(visitUser).collection(util.SUBCOLN_USER_ACTIVITY).doc(util.DOC_ACTIVITY_STATUS);//.set(userStatusObj);
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
            else if(prev_data[util.FLD_CANCLD_BY_USER] === undefined && after_data[util.FLD_CANCLD_BY_USER] !== undefined
                 && after_data[util.FLD_CANCLD_BY_USER])  {
                console.log('User cancelled the visit. Logging cancellation');
                let batch = db.batch();
                let docKey = `${visitPath.yearId}-${visitPath.monthId}-CNCLD`;  //ex: 2019-DEC-CNCLD   
                let userCancRef = db.collection(util.COLN_USERS).doc(visitUser).collection(util.SUBCOLN_ASSISTANT_ANALYTICS).doc(docKey); //.set(vPayload,{merge:true});
                let userActivityRef = db.collection(util.COLN_USERS).doc(visitUser).collection(util.SUBCOLN_USER_ACTIVITY).doc(util.DOC_ACTIVITY_STATUS);            
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
                    console.error('user cancellation analytics+status logging failed:', e, 
                        new Error('user cancellation failed' + e.toString()));
                    util.notifyUserRequestClosed(after_data.user_id, util.ERROR_CODE);
                }
            }
            else{
                console.error('Visit cancelled but no idea who did it!');
            }

        }
    }else if(after_data.rating !== undefined && prev_data.rating !== after_data.rating) {   //can be new rating entry or update of prev rating
        console.log(`Visit rating updated: ${after_data.rating}`);
        //refresh assistant average rating
        await util.updateAssistantRating(after_data.ass_id, prev_data.rating, after_data.rating);
        return;
    }    
    else{
        console.log(`No visit logic triggered.`);
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

/**
 * ONVISITCOMPLETED
 * @param {*} visitObj 
 * @param {yearId, monthId, _id} visitPath  
 * 1. Add analytics- difference in actual and visit start/end time
 * 2. Add total visit mins used by user - to be shown in UI tile
 * 3. Calculate cost and current weekly estimate earned by assistant
 * 4. Update User Status to Visit Completed
 * 5. Notify user of changes
 */
var onVisitCompleted = async function(visitObj, visitPath){
    console.log(":VISIT UPDATE: COMPLETED");
    if(visitObj.user_id === undefined || visitObj.ass_id === undefined || visitPath === undefined){
        log.error("Invalid user/ast id");
        return;
    }    
    let anPromise;
    let batch = db.batch();
    let visitPathStr = `${util.COLN_VISITS}/${visitPath.yearId}/${visitPath.monthId}/${visitPath._id}`;
    let userLifetimeMins = null;
    let userCompletedVisits = null;
    //1. ANALYTICS AND BATCH
    if(visitObj.act_en_time !== undefined && visitObj.vis_en_time !== undefined
         && visitObj.act_st_time !== undefined) {
        //Add assistant anayltics
        let diff = visitObj.vis_en_time - visitObj.act_en_time;
        let docKey = `${visitPath.yearId}-${visitPath.monthId}-VDIFF`;  //ex: 2019-OCT-VDIFF
        let anObj = {};
        anObj[`${visitPath._id}.out_diff`] = diff;
        anObj[`${visitPath._id}.total`] = visitObj.act_en_time - visitObj.act_st_time;
        let anRef = db.collection(util.COLN_ASSISTANTS).doc(visitObj.ass_id).collection(util.SUBCOLN_ASSISTANT_ANALYTICS).doc(docKey);
        //add to batch -- TODO possibility of failing if the doc doesnt currently exist
        console.log('Adding Visit Completion Ast Analytics: ', anObj);
        batch.update(anRef, anObj);
        //anPromise = await db.collection(util.COLN_ASSISTANTS).doc(visitObj.ass_id).collection(util.SUBCOLN_ASSISTANT_ANALYTICS).doc(docKey).update(anObj);
    }    

    //2. ADD TOTAL MINS UP AND ADD TO BATCH
    if(visitObj.act_st_time !== undefined && visitObj.act_en_time !== undefined) {
        let totalVisitTime = visitObj.act_en_time - visitObj.act_st_time;        
        let userStatsRef = db.collection(util.COLN_USERS).doc(visitObj.user_id).collection(util.SUBCOLN_USER_ACTIVITY).doc(util.DOC_USER_STATS);        
        try{
            let currUserStatsSnapShot = await userStatsRef.get();
            if(currUserStatsSnapShot === undefined || !currUserStatsSnapShot.exists) {
                userLifetimeMins = totalVisitTime;
                userCompletedVisits = 1;    
            }else{
                let currUserStats = currUserStatsSnapShot.data();
                userLifetimeMins = (currUserStats.total_mins === undefined)?totalVisitTime:currUserStats.totalMins+totalVisitTime;
                userCompletedVisits = (currUserStats.comp_visits === undefined)?1:currUserStats.comp_visits+1;
            }            
            console.log('Current visit total time: ', totalVisitTime, 'Recevied snapshot: ', currUserStatsSnapShot, 
                    ', UserLifetime mins & comp visits: ', userLifetimeMins, userCompletedVisits);
        }catch(e){
            console.error('Error while fetching user stats: ', e.toString(), new Error('UserStatistics doc read failed: ' + e.toString()));
        }
        if(userLifetimeMins !== null && userCompletedVisits !== null) {
            let newStats = {
                total_mins: userLifetimeMins,
                comp_visits: userCompletedVisits
            }
            console.log('Adding User Statistics: ', newStats);
            batch.set(userStatsRef, newStats, {merge: true});
        }
    }
    //3. CALCULATE TOTAL COST AND UPDATE AST FINANCES
    if(visitObj.cost === undefined) {
        console.error('Visit Object didnt have cost included!',visitPath, new Error('Visit object missing cost: ', visitPath));
    }else{
        let timestamp = Date.now()  // not using firestore timestamp in this case
        console.log(`Timestamp for finance addition: ${timestamp}`);
        let financeDocRef = db.collection(util.COLN_ASSISTANTS).doc(visitObj.ass_id)
            .collection(util.SUBCOLN_ASSISTANT_FINANCE).doc(`${visitPath.yearId}-${visitPath.monthId}`);
        let costObj = {};
        costObj[timestamp.toString()] = {
            cost: visitObj.cost,
            visit_path: visitPathStr
        }
        console.log('Adding Assistant Finances: ', costObj);
        batch.set(financeDocRef, costObj, {merge:true});
    }

    //4. UPDATE USER ACTIVITY STATUS
    let userActivityStatusRef = db.collection(util.COLN_USERS).doc(visitObj.user_id).collection(util.SUBCOLN_USER_ACTIVITY).doc(util.DOC_ACTIVITY_STATUS);
    let userStatusObj = {
        visit_id: visitPathStr,
        visit_status: util.VISIT_STATUS_COMPLETED,
        modified_time: fieldValue.serverTimestamp(),
    }   
    console.log('Updating User Activty Status: ', userStatusObj);
    batch.set(userActivityStatusRef, userStatusObj);    //no need to merge

    //let userActivityPromise = await db.collection(util.COLN_USERS).doc(visitObj.user_id).collection(util.SUBCOLN_USER_ACTIVITY).doc(util.DOC_ACTIVITY_STATUS).set(userStatusObj);
    try{
        await batch.commit();
        console.log('Visit Completion Batch Operation complete');
        //5. Notify User of completion
        let payload = {
            notification: {
                title: 'All done!',
                body: 'Please rate your experience',
            },
            //Field keys should replicate client visit object keys
            data: {
                visit_path: visitPathStr,
                ass_id: visitObj.ass_id,  
                status: String(util.VISIT_STATUS_COMPLETED),                
            }        
        };
        if(userCompletedVisits !== null && userLifetimeMins !== null) {
            payload['data']['total_mins'] = userLifetimeMins;
            payload['data']['comp_visits'] = userCompletedVisits;
        }
        let sendPayloadFlag = await util.sendUserPayload(visitObj.user_id, payload, util.COMMAND_VISIT_COMPLETED);
        console.log("Payload sent to user: ",payload, sendPayloadFlag);
    }catch(e) {
        console.error('Visit Completion Batch operation failed: ', e.toString(), 
            new Error('Visit Completion Batch Operation Failed: ', e.toString()));
        //TODO    
    }

}

















