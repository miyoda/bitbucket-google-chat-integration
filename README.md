# Bitbucket integration with Google Chat using webhook
Code to integarete Bitbucket with Google Chat using webhook.
This project can be deployed free using [Firebase](https://firebase.google.com) functions.

## Config steps:
You should deploy a function for each destination group but can be used for more than one repository.
- Create an "Incoming webhook" endpoint in your desired google chat room. You can config the BitBucket icon url.
- Config the google chat webhook endpoint in the file "functions/config.json". An example in the file "functions/config-example.json" (rename it).
- Config your firebase project with "firebase init" selecting "Database" and "functions".
- Deploy it with "firebase deploy"
- Config a webhook in your BitBucket project using the deployed firebase function URL with all the event types enabled
