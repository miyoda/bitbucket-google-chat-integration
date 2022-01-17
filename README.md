# Bitbucket integration with Google Chat using webhook
Code to integarete Bitbucket with Google Chat using webhook.
This project can be deployed free using [Firebase](https://firebase.google.com) functions.

## Config steps:
You should deploy a function for each destination group but can be used for more than one repository.
- Create an "Incoming webhook" endpoint in your desired google chat room. You can config the BitBucket icon url.

## Generate firebase Service Accounts private key
- Go to the firebase console / Settings / Service accounts
- Click on the option of [ Generate new private key ]
- Add the file to functions directory with name "firebase-privatekey.json"

## Get firebase database url
- Go to the firebase console / Realtime Database / Create Database
- Create database in locked state
- Add the database url in the config file

## Prepare the config file
- Create a copy of the file "functions/config-example.json" or rename it as "functions/config.json".
- Update the varialbles with the values generated in the steps mentioned above.

## Firebase commands
- run npm install inside the functions directory.
- In the parent directory, Config your firebase project with "firebase init" selecting "Database" and "functions".
- Deploy it with "firebase deploy"

## Configure a webhook in BitBucket project
- create a webhook in the bitbucket project by visiting Repository Settings / Webhooks / Add Webhook
- paste the URL generated from firebase commands or get the url from firebase console and add to the webhook.
- Enable all the events you need to be enabled.
