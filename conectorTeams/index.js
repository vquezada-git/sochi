const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const router = express.Router();

app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true}));

//root route
app.get('/', (req, res) => {
    res.json({message: 'DASA - teams connector'});
});

require('./app/routes')(app, router);

const PORT = 8085;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
});

exports.app = app;