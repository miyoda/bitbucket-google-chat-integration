const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

const config = require("./config.json");

admin.initializeApp();

async function pushToGoogleChatThread(message, thread = null) {
    let googleRes = await axios.post(config.googleChatEndpoint, {
        text: message,
        thread: {
            name: thread
        }
    }).catch((e)=>{console.log(e)});
    return googleRes.data.thread.name;
}

exports.bitbucket = functions.https.onRequest((req, res) => {
    console.log('Body: ', req.body);
    let actor = req.body.actor;
    let eventType = req.header("X-Event-Key");
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
        case 'repo:push':
            repoPush(actor, req, res);
            break;
        default:
            res.send("Ignored");
    }
}

function onPullRequestEvent(eventType, actor, req, res) {
    let pullRequest = req.body.pullrequest;
    switch (eventType) {
        case 'pullrequest:created':
            prCreated(pullRequest, actor, req, res);
            break;
        case 'pullrequest:updated':
            prUpdated(pullRequest, actor, req, res);
            break;
        case 'pullrequest:approved':
            prApproved(pullRequest, actor, req, res);
            break;
        case 'pullrequest:unapproved':
            prUnapproved(pullRequest, actor, req, res);
            break;
        case 'pullrequest:merged':
            prMerged(pullRequest, actor, req, res);
            break;
        case 'pullrequest:rejected':
            prRejected(pullRequest, actor, req, res);
            break;
        case 'pullrequest:comment_created':
            prCommentCreated(pullRequest, actor, req, res);
            break;
        case 'pullrequest:comment_updated':
            prCommentUpdated(pullRequest, actor, req, res);
            break;
        case 'pullrequest:comment_deleted':
            prCommentDeleted(pullRequest, actor, req, res);
            break;
        default:
            res.send("Ignored");
    }
}

async function repoPush(actor, req, res){
    let message = '_' + actor + '_ has Pushed to repository.';
    await pushToGoogleChatThread(message, await threadIdOf("REPO_"+req.body.repository.uuid)).then(threadId => saveThreadId("REPO_"+req.body.repository.uuid, threadId));
    return res.send('OK');
}

async function prCreated(pullRequest, actor, req, res){
    let message = '<users/all>\n' +
        'Title :     ' + pullRequest.title.trim() + '\n' +
        'Branch : ' + pullRequest.source.branch.name.trim() + '   >   ' + pullRequest.destination.branch.name.trim() + '\n' +
        'Author : _' + actor.display_name.trim() + '_\n' +
        'Link :     <' + pullRequest.links.html.href + '|' + pullRequest.links.html.href + '>';
    await pushToGoogleChatThread(message).then(threadId => saveThreadId(threadRefOfPr(pullRequest), threadId));
    return res.send('OK');
}

async function prUpdated(pullRequest, actor, req, res){
    let message = '_' + actor.display_name.trim() + '_ has Updated.';
    await pushToGoogleChatThread(message, await threadIdOfPr(pullRequest));
    return res.send('OK');
}

async function prApproved(pullRequest, actor, req, res){
    let message = '_' + actor.display_name.trim() + '_ has Approved.';
    await pushToGoogleChatThread(message, await threadIdOfPr(pullRequest));
    return res.send('OK');
}

async function prUnapproved(pullRequest, actor, req, res){
    let message = '_' + actor.display_name.trim() + '_ has Unapproved.';
    await pushToGoogleChatThread(message, await threadIdOfPr(pullRequest));
    return res.send('OK');
}

async function prMerged(pullRequest, actor, req, res){
    let message = '_' + actor.display_name.trim() + '_ has Merged.';
    await pushToGoogleChatThread(message, await threadIdOfPr(pullRequest));
    return res.send('OK');
}

async function prRejected(pullRequest, actor, req, res){
    let message = '_' + actor.display_name.trim() + '_ has Rejected.';
    await pushToGoogleChatThread(message, await threadIdOfPr(pullRequest));
    return res.send('OK');
}

async function prCommentCreated(pullRequest, actor, req, res){
    let commentText = req.body.comment.content.raw;
    let message = '_' + actor.display_name.trim() + '_ has Created <' + req.body.comment.links.html.href + '|a comment>: ' + commentText;
    await pushToGoogleChatThread(message, await threadIdOfPr(pullRequest));
    return res.send('OK');
}

async function prCommentUpdated(pullRequest, actor, req, res){
    let commentText = req.body.comment.content.raw;
    let message = '_' + actor.display_name.trim() + '_ has Updated <' + req.body.comment.links.html.href + '|a comment>: ' + commentText;
    await pushToGoogleChatThread(message, await threadIdOfPr(pullRequest));
    return res.send('OK');
}

async function prCommentDeleted(pullRequest, actor, req, res){
    let commentText = req.body.comment.content.raw;
    let message = '_' + actor.display_name.trim() + '_ has Deleted <' + req.body.comment.links.html.href + '|a comment>: ' + commentText;
    await pushToGoogleChatThread(message, await threadIdOfPr(pullRequest));
    return res.send('OK');
}

function threadRefOfPr(pullRequest){
    return 'PR_' + pullRequest.links.html.href.split("/bitbucket.org/")[1];
}

async function threadIdOfPr(pullRequest) {
    return threadIdOf(threadRefOfPr(pullRequest));
}

async function threadIdOf(threadRef) {
    return admin.database().ref('chatThread').child(threadRef).child('threadId')
        .once('value', (snapshot) => snapshot.val());
}

async function saveThreadId(threadRef, threadId) {
    return await admin.database().ref('chatThread').child(threadRef).set({
        threadId: threadId.toString()
    });
}
