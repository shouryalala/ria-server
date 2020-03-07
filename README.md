# project-ria-cloud-functions
implements cloud functions for firebase Baas

sample http trigger links: 
Method 'Send Data Packet':
https://us-central1-kanta-6f9f5.cloudfunctions.net/sendDataPacket?service=Dusting&address=ass&time=110:35pm


Assistant Onboarding:
- Add all important details(address, imei, passwords) to xls
- Add basic information to the firestore assistant object
- Add assistant display picture with case-sensitive naming to the firebase storage
- Add assistant id to each society she will be servicing

Required Server Indices per Month Code:
- ass_id ASC date ASC status ASC vis_st_time ASC [for ast schedule feed]
- date ASC hour ASC [for timetable i think(?)]
- user_id ASC timestamp DSC [for user visit history i think (?)]

