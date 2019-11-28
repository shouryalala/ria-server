const util = require('./utils');
const schedular =  require('./schedular');
const {db, fieldValue} = require('./admin');

exports.onUpdateHandler = async(change, context) => {
    console.log("::visitUpdateHandler:: INVOKED");
    const prev_data = change.before.data();
    const after_data = change.after.data();
    //create a request path
    let visitPath = {
        _id: context.params.visitId,
        monthId: context.params.monthSubcollectionId,
        yearId: context.params.yearDocId
    }
    if(!util.isValidPath(visitPath.yearId, visitPath.monthId, visitPath._id)) {
        console.error("Received visit update for invalid date range. Skipping request:", visitPath);
        return;
    }
    
    //TODO is null check required?
    if(prev_data.status === util.VISIT_STATUS_UPCOMING && after_data.status === util.VISIT_STATUS_ONGOING) {
        console.log("ASSISTANT START WORK TRIGGERED");
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
            anObj[`${visitPath._id}.in_diff`] = diff;//fieldValue.arrayUnion({in_diff: diff});                
            //no need to batch. visit should be updated regardless of whether this goes through
            anPromise = await db.collection(util.COLN_ASSISTANTS).doc(after_data.ass_id).collection(util.SUBCOLN_ASSISTANT_ANALYTICS).doc(docKey).update(anObj);
        }
        let visitPathStr = `${util.COLN_VISITS}/${visitPath.yearId}/${visitPath.monthId}/${visitPath._id}`;
        let userStatusObj = {
            visit_id: visitPathStr,
            visit_status: util.VISIT_STATUS_ONGOING
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
        console.log("ASSISTANT WORK COMPLETE TRIGGERED");
        if(after_data.user_id === undefined || after_data.ass_id === undefined){
            log.error("Invalid user/ass id");
            return;
        }        
        let anPromise;
        console.log(after_data.act_en_time,"  ", after_data.vis_en_time);
        if(after_data.act_en_time !== undefined && after_data.vis_en_time !== undefined) {
            //Add assistant anayltics
            let diff = after_data.vis_en_time - after_data.act_en_time;
            let docKey = `${visitPath.yearId}-${visitPath.monthId}-VDIFF`;  //ex: 2019-OCT-VDIFF
            let anObj = {};
            anObj[`${visitPath._id}.out_diff`] = diff;//fieldValue.arrayUnion({in_diff: diff});
            //no need to batch. visit should be updated regardless of whether this goes through
            anPromise = await db.collection(util.COLN_ASSISTANTS).doc(after_data.ass_id).collection(util.SUBCOLN_ASSISTANT_ANALYTICS).doc(docKey).update(anObj);
        }
        let visitPathStr = `${util.COLN_VISITS}/${visitPath.yearId}/${visitPath.monthId}/${visitPath._id}`;
        let userStatusObj = {
            visit_id: visitPathStr,
            visit_status: util.VISIT_STATUS_COMPLETED
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
        console.log("Visit has been cancelled");
    }
    else{
        console.log("No block triggered. Skipping.");
    }

}