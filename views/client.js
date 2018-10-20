const button = document.getElementById('myButton');
const loginBtn = document.getElementById('loginBtn');

//href="https://github.com/login/oauth/authorize?client_id=28b2b67527232fa303a8&scope=repo"
loginBtn.addEventListener('click', function (e) {
    fetch("/callback")
        .then((res) => {
            console.log(res);
        });
});


var data = { username: 'examplo' };

button.addEventListener('click', function (e) {
    console.log('button was clicked');
    fetch('/action', {
        method: 'POST',
        body: JSON.stringify(data), // data can be `string` or {object}!
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(function (response) {
            if (response.ok) {
                return response.json();
            }
            throw new Error('Request failed.');
        }).then((data) => {
            console.log(data.x);
        })
        .catch(function (error) {
            console.log(error);
        });
});

document.getElementById("downloadButton").addEventListener("click", () => {
    console.log("downloadButton");
    fetch("download", {
        method: "POST"
    })
        .then(() => {
            console.log("Finish");
        })
});