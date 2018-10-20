const express = require('express');
const app = express();
const bodyParser = require('body-parser');

app.use(express.static('public'));
app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', function (req, res) {
    res.render('index', { name: "Fernando Sousa" });
})

app.post('/', function (req, res) {
    
    let city = req.body.city;
    res.render('index', { name: city });
});
app.listen(3000, function () {
    console.log('Example app listening on port 3000!')
})