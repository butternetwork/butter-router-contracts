let axios = require("axios");

exports.httpPost = async function (url, requestData) {
    let response = await axios.post(url.toString(), requestData, {
        timeout: 20000,
        headers: { "content-type": "application/json" },
    });
    return response.data;
};

exports.httpGet = async function (url, requestData) {
    let response = await axios.get(url.toString() + requestData, {
        timeout: 20000,
    });
    return typeof response.data === "string" ? response.data : JSON.stringify(response.data);
};
