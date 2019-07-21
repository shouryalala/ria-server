const util = require('./utils');
const {db, fieldValue} = require('./admin');

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
 * return Obj = {_id: string, clientToken: string, FreeSlotLib: [DecodedTime]free slots array}
 */
exports.getAvailableAssistant = function(address, monthId, date, st_time, en_time, exceptions, forceAssistant) {
    console.log("::getAvailableAssistant::INVOKED::Params{date: " + date + ", st_time: " 
    + st_time + ", en_time: " + en_time + ", exceptions: " + exceptions + ", forceAssistant: " + forceAssistant + "}");    
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
    var st_time_obj = util.decodeHourMinFromTime(st_time);   //p
    var en_time_obj = util.decodeHourMinFromTime(en_time);     

    var st_time_buffer_obj = util.decodeHourMinFromTime(st_time - util.BUFFER_TIME);
    var en_time_buffer_obj = util.decodeHourMinFromTime(en_time + util.BUFFER_TIME);

    console.log("Decoded Time: Start: " + st_time_obj.toString() + " End: " + en_time_obj.toString());
    console.log("Decoded Buffer Time: Start: " + st_time_buffer_obj.toString() + " End: " + en_time_buffer_obj.toString());
    //var slots = getSlotCount(st_hour, en_hour, st_min, en_min);

    //make sure start times are not before current time
    if(date === today.getDate()) {
        console.log("Verifying time slots")
        st_time_obj = util.verifyTime(st_time_obj,today.getHours(), today.getMinutes());
        st_time_buffer_obj = util.verifyTime(st_time_buffer_obj,today.getHours(), today.getMinutes());
    }
    //var timetableNslots = getTimetable
    return getTimetable(util.ALPHA_ZONE_ID, monthId, date, st_time_buffer_obj, en_time_buffer_obj, exceptions, forceAssistant).then(res => {
        if(res === 0) {
            console.error("Received an error from getTimetable. Exiting method");
            return 0;
        }
        // if(Object.keys(res.timetable).length == 0) {
        //     console.log("No timetable created as ")
        // }

        const num_slots = (en_time_obj.getHours() - st_time_obj.getHours())*util.TOTAL_SLOTS + (en_time_obj.getSlot() - st_time_obj.getSlot());
        var p = (st_time_obj.getHours() - st_time_buffer_obj.getHours())*util.TOTAL_SLOTS + (st_time_obj.getSlot() - st_time_buffer_obj.getSlot());
        console.log("Num_slots required: " + num_slots + ", P: " + p);
        let k_right = p;
        let k_left = p-1;        
        let flag = false;
        let rObj = null;
        while((k_right+num_slots) <= res.slotLib.length || (k_left >= 0)) {
            let tAssistantId;            
            if((k_right + num_slots) <= res.slotLib.length) {
                tAssistantId = getFreeAssistantFromWindow(res.timetable,res.assistantLib,k_right,num_slots);
                if(tAssistantId !== null) {                    
                    console.log("Found free assistant: " + tAssistantId + " in window: " + k_right);
                    console.log("Slot: " + k_right + ", Decoded:: (" + res.slotLib[k_right].getHours() + "," +  res.slotLib[k_right].getMins() + ")");
                    console.log("Assistant: " + tAssistantId + ", Client token: " + res.assistantTokenLib[tAssistantId]);
                    flag = true;
                    //put all slots in a block to return
                    let slotBlock = [];
                    for(let i=k_right; i<k_right+num_slots; i++) {
                        slotBlock.push(res.slotLib[i]); 
                    }
                    rObj = {
                        _id: tAssistantId,
                        clientToken: res.assistantTokenLib[tAssistantId],
                        freeSlotLib: slotBlock
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
                    console.log("Assistant: " + tAssistantId + ", Client token: " + res.assistantTokenLib[tAssistantId]);
                    flag = true;
                    //put all slots in a block to return
                    let slotBlock = [];
                    for(let i=k_left; i<k_left+num_slots; i++) {
                        slotBlock.push(res.slotLib[i]); 
                    }
                    rObj = {
                        _id: tAssistantId,
                        clientToken: res.assistantTokenLib[tAssistantId],
                        freeSlotLib: slotBlock
                    }
                    break;
                }
                //move k backward
                k_left--;
            }
        }
        return rObj;
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
 * return Obj = {assistantLib: assistants, slotLib: slots, timetable: asMap, assistantTokenLib: assistant_list}
 */
var getTimetable = function(docId, monthId, date, st_time_dec, en_time_dec, exceptions, forceAssistant) {
    console.log("::getTimetable::INVOKED::Params: {date:" + date + " ,st_time:" + st_time_dec.toString() + ",en_time:" + en_time_dec.toString() + "}");
    
    var min_doc_id = st_time_dec.getHours();
    var max_doc_id = en_time_dec.getHours();

    //var min_slot_id = minToSlotId(st_time_dec.min);   //10 -> 1, 20 -> 2
    //var max_slot_id = minToSlotId(en_time_dec.min);
    var min_slot_id = st_time_dec.getSlot();
    var max_slot_id = en_time_dec.getSlot();

    console.log("Generated Timeline Details:  Min: (Doc ID: " + min_doc_id + ", Slot ID: " + min_slot_id 
        + ")\tMax: (Doc ID: " + max_doc_id + ", Slot ID: " + max_slot_id + ")");

    return db.collection(util.COLN_TIMETABLE).doc(docId).get().then(docSnapshot => {
        var assistant_list = docSnapshot.data();
        var assistants = [];
        console.log("Assistant List: ");
        for(const key in assistant_list) {
            console.log("ID: " + key + "  Token " + assistant_list[key]);
            assistants.push(key);
        }
        if(forceAssistant !== null) {
            //typeof forceAssistant !== 'undefined' 
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
        var query = db.collection(util.COLN_TIMETABLE).doc(docId).collection(monthId);
        //var query = ttRef;
        if(st_time_dec.getHours() === en_time_dec.getHours()) {
            console.log("Query Type: Querying through one doc: " + st_time_dec.getHours());            
            query = query.where("date", "==", date).where("hour", "==", st_time_dec.getHours());    
        }else{
            console.log("Query Type: Querying through multiple docs");
            query = query.where("date", "==", date).where("hour", ">=", st_time_dec.getHours()).where("hour", "<=", en_time_dec.getHours());
        }
        
        return query.get().then(querySnapshot => {
            var asMap = [];            
            var slots = [];
            var i,j,k;
            k = 0;            
            const num_cols = (max_doc_id - min_doc_id)*util.TOTAL_SLOTS + (max_slot_id - min_slot_id);
            const num_rows = assistants.length;

            //First create default table
            let tDoc = min_doc_id;
            let tSlot = min_slot_id;
            for(j=0; j<num_cols; j++) {
                let asCol = [];
                slots[j] = new util.DecodedTime(tDoc, (tSlot++)*10);
                if(tSlot === util.TOTAL_SLOTS) {
                    tDoc++;
                    tSlot = 0;
                }
                for(i=0; i<num_rows; i++) {
                    asCol[i] = true;    //assistant free by default                    
                }
                asMap[j] = asCol;
            }
            
            console.log("QuerySnapshot: " + querySnapshot.empty);            
            if(!querySnapshot.empty){
                console.log("Querying documents and updating table");            
                querySnapshot.forEach(doc => {                        
                    //might be in an incorrect order
                    const docDetails = doc.data();
                    for(j=0; j<num_cols; j++) {
                        if(slots[j].getHours() === docDetails['hour']) {
                            let busyAssistants = docDetails[util.getTTFieldName(slots[j].getSlot())];
                            for(i=0; i<num_rows; i++){
                                if(typeof busyAssistants !== 'undefined') {
                                    asMap[j][i] = !busyAssistants.includes(assistants[i]);
                                }
                            }
                        }
                    }                    
                });
            }
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
                assistantTokenLib: assistant_list
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

/**
 * @param {boolean[][]} timetable
 * @param {string[]} assistants
 * @param {number} index 
 * @param {number} slots 
 * GETFREEASSISTANTFROMWINDOW
 * Goes through the 'timetable' starting from 'index' to see if any assistant from 'assistants' is available
 * 
 * return Obj = {assistant/null}
 */
var getFreeAssistantFromWindow = function(timetable, assistants, index, slots) {
    console.log("::getFreeAssistantFromWindow::INVOKED::Params{timetable:..,assistants:..,index: " + index + ", slots: " + slots + "}");
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
            console.log("::getFreeAssistantFromWindow: Found Free Assistant: " + i);
            return assistants[i];
        }
    }
    console.log("::getFreeAssistantFromWindow: Didnt find a free Assistant in this window.");
    return null;
}

/**
 * BOOKASSISTANTSLOT 
 * assign assistant Id to the designated slots in the timetable
 * @param {string} zoneId 
 * @param {string} monthId 
 * @param {number} date  
 * @param {string} assId 
 * @param {DecodedTime[]} slots 
 * 
 * things to keep in mind:
 * - What to do if transaction fails
 * - What to do if more than one hour affected
 * - What to do if null parameter
 */
exports.bookAssistantSlot = (zoneId, monthId, date, hours_slots, assId) => {
    console.log("::BOOKASSISTANTSLOT::INVOKED::Params: ",zoneId, monthId, date, hours_slots, assId);
    if(zoneId === undefined || monthId === undefined || date === undefined || hours_slots === undefined || assId === undefined ) {
        return 0;
    }
    let ttRef = db.collection(util.COLN_TIMETABLE).doc(zoneId).collection(monthId);
    return db.runTransaction(async transaction => {
        let updateObjList = {};
        //First carry out all the reads and generate the write objects
        console.log("Carrying out Transaction: ", hours_slots);
        for(hour in hours_slots) {            
            //if(hours_slots.hasOwnProperty(hour)) {
            let slots = hours_slots[hour];
            if(slots !== undefined){            
                try{              
                    /* eslint-disable no-await-in-loop */                    
                    var hSnapshot = await transaction.get(ttRef.doc(util.getTTPathName(zoneId, monthId, date, hour)));
                    let updateObj = {};
                    if(hSnapshot.exists) {
                        //found the document, now update the fields
                        var hDoc = hSnapshot.data();                    
                        console.log("Existing schedule for date: " + date + ", hour: " + hour, hDoc);                        
                        for(s in slots){
                            let field_name = util.getTTFieldName(slots[s]);
                            if(hDoc[field_name] === undefined) {
                                console.log("Slot: " + field_name + " absent. Creating new array.");
                                updateObj[field_name] = [assId];
                            }
                            else if(hDoc[field_name].includes(assId)){
                                console.error("DISASTER! Assistant is preoccupied during current slot: (Assistant: " + assId + ",Slot: " + slots[s] + ")");
                                //TODO throw error
                                return Promise.reject(new Error("Assistant was preoccupied"));
                            }
                            else{
                                console.log("Update field set for slot: ", field_name);
                                updateObj[field_name] = fieldValue.arrayUnion(assId);
                            }
                        }
                        console.log("Generated update object for existing hour doc: ", updateObj);
                    }
                    else{
                        console.log("No existing schedule for date: " + date + ", hour: " + hour);
                        //make a new document and add the schedule
                        updateObj['date'] = date;
                        updateObj['hour'] = parseInt(hour);
                        //add assistant id to each slot in the current hour doc
                        for(s in slots) {
                            let field_name = util.getTTFieldName(slots[s]);
                            updateObj[field_name] = [assId];
                        }
                        console.log("Generated schedule object to be pushed: ", updateObj);
                    }
                    updateObjList[hour] = updateObj;
                    /* eslint-enable no-await-in-loop */                    
                }catch(error) {
                    console.error("Entered transaction catch block", error);
                }
            }
        }
        
        //Now write all the hour documents created from the above reads
        /* eslint-disable no-await-in-loop */    
        /* eslint-disable require-atomic-updates */    
        console.log("Transaction Write: ", updateObjList);
        for(hour in hours_slots) {
            if(updateObjList[hour] !== undefined) {                
                await transaction.set(ttRef.doc(util.getTTPathName(zoneId, monthId, date, hour)), updateObjList[hour], {merge: true});
            }
        }        
        /* eslint-enable no-await-in-loop */    
        /* eslint-enable require-atomic-updates */
        return Promise.resolve("All documents atomically updated!");
    }).then(result => {
        console.log("Transaction success: ", result);
        return 1;
    }).catch(error => {
        console.error("Transaction error: ", error);
        return 0;
    });
}