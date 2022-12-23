const request = require("request");
const sendGET = () => {
    return new Promise((resolve, reject) => {
        let options = {
            url: "https://codeforces.com/api/problemset.problems?",
            method: "GET",
        };

        request(options, (error, response, body) => {
            if (error) {
                console.log("Error details:\n", error);
                process.exit(0);
            }
            const content = JSON.parse(body).result;
            resolve(content);
        });
    });
};

const getProblemSet = async () => {
    let data = await sendGET();
    return data;
};

module.exports = {
    getProblemSet,
};
