const request = require("request");

const HandleData = (handle) => {
    return new Promise((resolve, reject) => {
        options = {
            url: "https://codeforces.com/api/user.status?handle=" + handle,
            method: "GET",
        };

        request(options, (error, response, body) => {
            if (error) {
                console.log("user data collection not done\n");
                console.log("Error details:\n", error);
            }
            if (JSON.parse(body).status.toString() !== "OK") {
                console.log("Invalid CodeForces handle: " + handle);
                resolve({ error: "Invalid Handle" });
            }
            const content = JSON.parse(body).result;
            resolve(content);
        });
    });
};

const solvedData = async (handle) => {
    const result = {
        solved: [],
    };

    let content = await HandleData(handle);
    if (content.error) {
        result.error = content.error;
        // return result;
    } else {
        content.forEach((data) => {
            if (data.verdict.toString() === "OK")
                if (result.solved.includes(data.problem.name) === false)
                    result.solved.push(data.problem.name);
        });
    }
    return result;
};

const getHandleData = async (handle) => {
    const result = await solvedData(handle);
    return result;
};

module.exports = {
    getHandleData,
};
