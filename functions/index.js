const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

const config = require("./config.json");

var serviceAccount = require(config.firebaseServiceAccountFile);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: config.firebaseRealtimeDatabaseUrl,
});

// admin.initializeApp();

exports.bitbucket = functions.https.onRequest((req, res) => {
    let actor = req.body.actor;
    let eventType = req.header("X-Event-Key");
    // console.log("Body of " + eventType + ": ", req.body);
    if (eventType.startsWith("pullrequest:")) {
        onPullRequestEvent(eventType, actor, req, res);
    } else if (eventType.startsWith("repo:")) {
        onRepoEvent(eventType, actor, req, res);
    } else {
        res.send("Ignored");
    }
})

function onRepoEvent(eventType, actor, req, res) {
    switch (eventType) {
        case "repo:push":
            repoPush(actor, req, res);
            break;
        case "repo:commit_comment_created":
            repoCommitCommentCreated(actor, req, res);
            break;
        default:
            res.send("Ignored");
    }
}

function onPullRequestEvent(eventType, actor, req, res) {
    let pullRequest = req.body.pullrequest;
    switch (eventType) {
        case "pullrequest:created":
            prCreated(pullRequest, actor, req, res);
            break;
        case "pullrequest:updated":
            prUpdated(pullRequest, actor, req, res);
            break;
        case "pullrequest:approved":
            prApproved(pullRequest, actor, req, res);
            break;
        case "pullrequest:unapproved":
            prUnapproved(pullRequest, actor, req, res);
            break;
        case "pullrequest:merged":
            prMerged(pullRequest, actor, req, res);
            break;
        case "pullrequest:rejected":
            prRejected(pullRequest, actor, req, res);
            break;
        case "pullrequest:comment_created":
            prCommentCreated(pullRequest, actor, req, res);
            break;
        case "pullrequest:comment_updated":
            prCommentUpdated(pullRequest, actor, req, res);
            break;
        case "pullrequest:comment_deleted":
            prCommentDeleted(pullRequest, actor, req, res);
            break;
        default:
            res.send("Ignored");
    }
}

async function repoPush(actor, req, res){
    let repository = req.body.repository;
    let message = "";
    for (let change of req.body.push.changes) {
        // console.log(change);
        for (let commit of change.commits) {
            message += "_" + actor.display_name.trim() + "_ has <" + commit.links.html.href + "|commited>: " + commit.message;
        }
        if (change.truncated) {
            message += "_" + actor.display_name.trim() + "_ has commited more things...\n";
        }
    }
    await pushToGoogleChatThread(message, await getRepoThreadIdOrCreated(repository));
    return res.send("OK");
}

async function repoCommitCommentCreated(actor, req, res){
    let repository = req.body.repository;
    let commentText = req.body.comment.content.raw;
    let message = "_" + actor.display_name.trim() + "_ has <" + req.body.comment.links.html.href + "|commented> about <" + req.body.commit.links.html.href + "|a commit>: " + commentText;
    await pushToGoogleChatThread(message, await getRepoThreadIdOrCreated(repository));
    return res.send("OK");
}

async function prCreated(pullRequest, actor, req, res){
    await getPrThreadIdOrCreated(pullRequest, req);
    return res.send("OK");
}

async function prUpdated(pullRequest, actor, req, res){
    let message = "_" + actor.display_name.trim() + "_ has updated <" + req.body.pullrequest.links.html.href + "|this PR>.";
    await pushToGoogleChatThread(message, await getPrThreadIdOrCreated(pullRequest, req));
    return res.send("OK");
}

async function prApproved(pullRequest, actor, req, res){
    let message = "_" + actor.display_name.trim() + "_ has approved <" + req.body.pullrequest.links.html.href + "|this PR>.";
    await pushToGoogleChatThread(message, await getPrThreadIdOrCreated(pullRequest, req));
    return res.send("OK");
}

async function prUnapproved(pullRequest, actor, req, res){
    let message = "_" + actor.display_name.trim() + "_ has unapproved <" + req.body.pullrequest.links.html.href + "|this PR>.";
    await pushToGoogleChatThread(message, await getPrThreadIdOrCreated(pullRequest, req));
    return res.send("OK");
}

async function prMerged(pullRequest, actor, req, res){
    let message = "_" + actor.display_name.trim() + "_ has merged <" + req.body.pullrequest.links.html.href + "|this PR>.";
    await pushToGoogleChatThread(message, await getPrThreadIdOrCreated(pullRequest, req));
    return res.send("OK");
}

async function prRejected(pullRequest, actor, req, res){
    let message = "_" + actor.display_name.trim() + "_ has rejected <" + req.body.pullrequest.links.html.href + "|this PR>.";
    await pushToGoogleChatThread(message, await getPrThreadIdOrCreated(pullRequest, req));
    return res.send("OK");
}

async function prCommentCreated(pullRequest, actor, req, res){
    let commentText = req.body.comment.content.raw;
    let message = "_" + actor.display_name.trim() + "_ has <" + req.body.comment.links.html.href + "|commented>: " + commentText;
    // console.log("prCommentCreated.message", message);
    await pushToGoogleChatThread(message, await getPrThreadIdOrCreated(pullRequest, req));
    return res.send("OK");
}

async function prCommentUpdated(pullRequest, actor, req, res){
    let commentText = req.body.comment.content.raw;
    let message = "_" + actor.display_name.trim() + "_ has updated <" + req.body.comment.links.html.href + "|a comment>: " + commentText;
    await pushToGoogleChatThread(message, await getPrThreadIdOrCreated(pullRequest, req));
    return res.send("OK");
}

async function prCommentDeleted(pullRequest, actor, req, res){
    let message = "_" + actor.display_name.trim() + "_ has deleted <" + req.body.comment.links.html.href + "|a comment>";
    await pushToGoogleChatThread(message, await getPrThreadIdOrCreated(pullRequest, req));
    return res.send("OK");
}



async function getRepoThreadIdOrCreated(repository) {
    let threadRef = "REPOSITORY_"+repository.uuid;
    let threadId = await threadIdOf(threadRef);
    if (!threadId) {
        let message = "Changes on Repository <" + repository.links.html.href + "|" + repository.name + ">\n" +
            "Name :     " + repository.full_name + "\n" +
            "Link :     <" + repository.links.html.href + "|" + repository.links.html.href + ">";
        threadId = await pushToGoogleChatThread(message);
        // .then(threadId => saveThreadId(threadRef, threadId));
    }
    return threadId;
}

async function getPrThreadIdOrCreated(pullRequest, req) {
    let threadRef = "PR_" + pullRequest.links.html.href.split("/bitbucket.org/")[1];
    let threadId = await threadIdOf(threadRef);
    if (!threadId) {
        let repository = req.body.repository;
        let message = "<users/all> New Pull Request\n" +
            "Title :     " + pullRequest.title.trim() + "\n" +
            "Repository : <" + repository.links.html.href + "|" + repository.name + ">\n" +
            "Branch : " + pullRequest.source.branch.name.trim() + "   >   " + pullRequest.destination.branch.name.trim() + "\n" +
            "Author : _" + pullRequest.author.display_name.trim() + "_\n" +
            "Link :     <" + pullRequest.links.html.href + "|" + pullRequest.links.html.href + ">";
        threadId = await pushToGoogleChatThread(message);
        // .then(threadId => saveThreadId(threadRef, threadId));
    }
    return threadId;
}

async function threadIdOf(threadRef) {
    return admin.database().ref("chatThread").child(threadRef).child("threadId")
        .once("value")
        .then((snapshot) => snapshot.val());
}

// async function saveThreadId(threadRef, threadId) {
//     return await admin.database().ref("chatThread").child(threadRef).set({
//         threadId: threadId.toString()
//     });
// }

async function pushToGoogleChatThread(message, thread = null) {
    let separator = "\n++++++++++++++++++++++++++++++++++++++++++++\n";
    message = separator.concat(message);
    message = message.concat(separator);
    let googleRes = await axios.post(config.googleChatEndpoint, {
        text: message,
        thread: {
            name: thread
        }
    }).catch(()=>{
        // console.log(e)
    });
    return googleRes.data.thread.name;
}