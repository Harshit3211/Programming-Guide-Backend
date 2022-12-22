const express = require("express");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const { getProblemSet } = require("./problemset");
const { getHandleData } = require("./handledata");
const { compile } = require("morgan");

const app = express();
// app.use(morgan("tiny"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

//  https://www.youtube.com/watch?v=cUWcZ4FzgmI
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
});

const problemsetData = {};
const tagList = [];

const refreshSetData = async () => {
    const data = await getProblemSet();
    problemsetData.problems = data.problems;
    problemsetData.problemStatistics = data.problemStatistics;
    problemsetData.problems.forEach((problem) => {
        problem.tags.forEach((tag) => {
            if (!tagList.includes(tag)) tagList.push(tag);
        });
    });

    console.log("Refreshed problemset data");
};

const handledata = {}; //For server side caching

const collectHandleData = async (handles) => {
    const hData = {
        solved: [],
        invalidHandles: [],
    };

    const promises = handles.map(async (handle) => {
        if (!handledata[handle]) {
            handledata[handle] = await getHandleData(handle);
            setTimeout(() => delete handledata[handle], 4 * 3600 * 1000); //remove handle data from cache after 4 hour
        }
        handledata[handle].error
            ? hData.invalidHandles.push(handle)
            : hData.solved.push(...handledata[handle].solved);
    });

    return new Promise((resolve, reject) => {
        Promise.all(promises).then(() => resolve(hData));
    });
};

const shuffler = (arr, number_of_problems) => {
    const problems = [];
    for (var i = arr.length - 1; i >= 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
        problems.push(arr[i]);
        if (problems.length >= number_of_problems) return problems;
    }
    return problems;
};

app.get("/check", (request, response) => {
    response.json(problemsetData.problems.length);
});
app.get("/tags", (request, response) => {
    response.json(tagList);
});
app.get("/cache", (request, response) => {
    response.json(handledata);
});

app.get("/get/", async (request, response) => {
    const params = {
        handles: request.query.handles ? request.query.handles.split(",") : [],
        friends: request.query.friends ? request.query.friends.split(",") : [],
        round: parseInt(request.query.ROUND) || 0,
        number_of_problems: parseInt(request.query.nop) || 10,
        lower_bound: parseInt(request.query.lowerBound) || 0,
        upper_bound: parseInt(request.query.upperBound) || 1500,
        tags: request.query.tags ? request.query.tags.split(",") : [],
    };
    // console.log(params);

    const hData = await collectHandleData(params.handles);
    const hfData = await collectHandleData(params.friends);
    hData.invalidHandles.push(...hfData.invalidHandles);

    const result = {
        problems: [],
        invalidHandles: hData.invalidHandles,
    };

    const sortedList = problemsetData.problems
        .filter(
            (problem) =>
                problem.contestId >= params.round &&
                problem.rating >= params.lower_bound &&
                problem.rating <= params.upper_bound
        )
        .map((problem) => {
            problem.solved =
                problemsetData.problemStatistics[
                    problemsetData.problems.indexOf(problem)
                ].solvedCount;
            return problem;
        });

    const taggedList = !params.tags.length
        ? sortedList
        : sortedList.filter((problem) => {
              for (tagIndex in problem.tags)
                  if (params.tags.includes(problem.tags[tagIndex])) return true;
              return false;
          });

    const solvedh = hData.solved;
    const solvedhf = hfData.solved;

    let problem;

    if (solvedhf.length === 0) {
        const finalList = taggedList.filter(
            (problem) => !solvedh.includes(problem.name)
        );
        problem = shuffler(finalList, params.number_of_problems);
    } else {
        const finalList = taggedList.filter(
            (problem) =>
                solvedhf.includes(problem.name) &&
                !solvedh.includes(problem.name)
        );
        problem = shuffler(finalList, params.number_of_problems);
    }

    if (problem.length < params.number_of_problems) {
        result.isless = 1;
    }
    result.problems = problem;

    response.json(result);
});

const port = process.env.PORT || 5000;
app.listen(port, async () => {
    console.log(`Server running on port ${port}`);
    refreshSetData();
    setInterval(() => refreshSetData(), 24 * 3600 * 1000);
});
