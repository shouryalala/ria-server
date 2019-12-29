const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({origin: true}));

app.get('/', (req,res) => {
    console.log('Payments Module:: GETCHARGE INVOKED:');
    console.log(req.query.service);
    console.log(req.query.socId);
    console.log(req.query.reqTime);
    res.send(String(25));
});
