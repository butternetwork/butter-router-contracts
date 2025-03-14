let request = require("request");

exports.httpPost = async function (url, requestData) {
    return new Promise((resolve, reject) => {
        let option = {
            url: url.toString(),
            method: "POST",
            timeout: 20000,
            // proxy: 'http://127.0.0.1:7890',
            json: true,
            headers: {
                "content-type": "application/json",
            },
            body: requestData,
        };
        request(option, function (error, response, body) {
            resolve(body);
        });
    });
};

exports.httpGet = async function (url, requestData) {
    return new Promise((resolve, reject) => {
        let option = {
            url: url.toString().concat(requestData),
            method: "GET",
            timeout: 20000,
            // proxy: 'http://127.0.0.1:7890',
        };
        request(option, function (error, response, body) {
            resolve(body);
        });
    });
};
