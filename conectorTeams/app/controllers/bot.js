// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
const axios = require('axios');
const { MongoClient } = require("mongodb");
const { ActivityHandler, MessageFactory, CardFactory, suggestedActions, ActionTypes } = require('botbuilder');

const uri = process.env.MongoUri
const client = new MongoClient(uri);

const AUTH_CLIENT_ID = "studio";
const AUTH_CLIENT_SECRET = "XXXXXXXXXXXXXXXXXXXXXXXXXX";
const AUTH_URL="https://keycloak-americas-admin.eva.bot/auth/realms/NTTDATA-EMEAL/protocol/openid-connect/token"
const baseURL="https://api-americas-instance1.eva.bot"
const orguuid="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXX"
const envuuid="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXX"
const botid="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXX"

const EVAURL=baseURL+"/eva-broker/org/"+orguuid+"/env/"+envuuid+"/bot/"+botid+"/conversations/"
const PROJECT="XXXXXXXX"; //
const CHANNEL="XXXXXXXX";
const APIKEY="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXX";    //eva4

async function mongoSearch(query) {
  var rsp = ""
  try {
    await client.connect();
    const database = client.db(process.env.MongoDb);
    const collection = database.collection(process.env.MongoCollection);
    const search = await collection.findOne(query);
    if (search != null){
      rsp = search
    } else {
      rsp = search
    }
  } 
  catch (error){
    console.log(error)
  }
  finally {
    await client.close();
  }
  return rsp
}
async function mongoInsert(doc){
  var rsp = ""
  try {
    await client.connect();
    const database = client.db(process.env.MongoDb);
    const collection = database.collection(process.env.MongoCollection);
    // create a document to insert
    const result = await collection.insertOne(doc);
    rsp = `A document was inserted with the _id: ${result.insertedId}`
  } 
  catch (error){
    console.log(error)
  }
  finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
  return rsp
}
class EchoBot extends ActivityHandler {
    constructor() {
        super();
        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        this.onMessage(async (context, next) => {
            console.log('request de teams:' + JSON.stringify(context) )
            
            var teamsId = context._activity.from.aadObjectId
            var conversation = false
            console.log('TeamsId:' + teamsId )
            //console.log('el tiempo:',new Date(ISODate().getTime() - 1000 * 60 * 30) )
            const query = { 
                "teamsId" : teamsId,
                "timestamp" : { 
                    $gte: new Date(new Date().getTime() - 1000 * 60 * 29)
                }  
                        }
            console.log("query: ",query)
            const search = await mongoSearch(query);
            console.log("search in mongo: " + JSON.stringify(search))            
            if (search == null || search == {} ){
                 var url = EVAURL
                var accesstoken = ""
                var tokenEva = false

            } else {
                conversation = true
                var url = EVAURL  + search.evaSessionId
                var accesstoken = search.evaToken
                var tokenEva = true

            }
            console.log("tokeneva: ", tokenEva)
            if (!tokenEva) {
                var qs = require('qs');
                let data = qs.stringify({
                    'grant_type': 'client_credentials',
                    'client_id': 'loreal',
                    'client_secret': 'UkIsySVREOzmyii3j9rCevi827rvdVJg' 
                });

                var config = {
                    method: 'post',
                    url: 'https://keycloak-americas-admin.eva.bot/auth/realms/NTTDATA-EMEAL/protocol/openid-connect/token',
                    headers: { 
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    data : data
                };
                console.log(config);
                
                await axios(config).then(async function (response) {
                    console.log("response teams: "+JSON.stringify(response.data));
                    //console.log(JSON.parse(response.text).access_token);
                    accesstoken = await response.data.access_token
                    // *************
                    // evaCall inicia     
                    // ************* 
                    console.log('el token', accesstoken)
                    let data = JSON.stringify({
                        "text": `${context._activity.text}`
                    });
                    console.log('EL DATA: ',data)					
                    let config = {
                        "method": 'post',
                        "url": url,
                        "headers": {
                            "Content-Type": "application/json",
                            "API-KEY": APIKEY,
                            "CHANNEL": CHANNEL,
                            "OS": "Python",
                            "USER-REF": "ymarinmu",
                            "LOCALE": "es-ES",
                            'Authorization': 'Bearer '+accesstoken,
                            'data': data
                        }
                    }
                    config.method = 'post';
                    config.data = data;
                    
                    console.log('OPTIONS:',config)
                    
                    await axios(config).then( async response => {
                        let eva_response = response.data;
                        console.log('Response eva: ', JSON.stringify(response.data));
                        let sessionCode = eva_response.sessionCode;
                        //let timeStamp =  new Date()
                        let timeStamp = new Date()
                        if (conversation != true){
                            const doc = {
                                teamsId : teamsId,
                                evaSessionId : sessionCode,
                                evaToken : accesstoken,
                                timestamp : timeStamp,
                            }
                            const result = await mongoInsert(doc);
                            console.log(JSON.stringify(result))

                        }
                        console.log("sesion: ", sessionCode);
                        var data = ""
                        var n = 1
                        eva_response.answers.forEach(async function(evaR) {
                            if (n != 1) {
                                data += "<hr>"
                            } 

                            data += evaR.content
                            //first = true
                            console.log("botones: ", evaR.buttons)
                            if ( evaR.buttons.length >=1 ){
                                //if(first){
                                    data += "<br><br>"
                                //    first = false
                                //}
                                data += "<ul>"
                                evaR.buttons.forEach(async function(evaB) {
                                    data += '<li>' + evaB.value + '</li>'
                                })
                                    data += "</ul>"
                            }
                            n = n+1  
                        });

                        var card = CardFactory.heroCard(
                            'Is 42 the answer to the ultimate question of Life, the Universe, and Everything?',
                            null,
                            CardFactory.actions([
                                {
                                    type: ActionTypes.PostBack,
                                    title: 'Yes',
                                    value: 'Yes'
                                },

                                {
                                    type: ActionTypes.PostBack,
                                    title: 'No',
                                    value: 'No'
                                }
                            ])
                        )
                    
                        //await turnContext.sendActivity(reply);

                        console.log('respuesta RSP:' + JSON.stringify(data) )
                        //data += '<br><br><img src="https://storage.googleapis.com/front-web/SANDI/icono-PDF.png" height="50px" width="50px"/><br><a target="_blank" href="https://storage.googleapis.com/front-web/SANDI/pdfTitle.pdf">Descargar</a><br> '

                        //await context.sendActivity({ attachments: [card] });     
                        await context.sendActivity(MessageFactory.text(data, data));
                        await next();                       
                    }).catch(error => {
                        console.log(error);
                    });   
                    // *************               
                    //evacall termina
                    // *************               
                }).catch(function (error) {
                    console.log(error);
                });
            }
            else {
                let data = JSON.stringify({
                    "text": `${context._activity.text}`
                });
                console.log('EL DATA: ',data)					
                let config = {
                    "method": 'post',
                    "url": url,
                    "headers": {
                        "Content-Type": "application/json",
                        "API-KEY": APIKEY,
                        "CHANNEL": CHANNEL,
                        "OS": "Python",
                        "USER-REF": "ymarinmu",
                        "LOCALE": "es-ES",
                        'Authorization': 'Bearer '+accesstoken,
                        'data': data
                    }
                }
                config.method = 'post';
                config.data = data;
                
                console.log('OPTIONS:',config)
                await axios(config).then( async response => {
                    let eva_response = response.data;
                    console.log('Response eva: ', JSON.stringify(response.data));
                    let sessionCode = eva_response.sessionCode;
                    let timeStamp =  new Date()
                    if (conversation != true){
                        const doc = {
                            teamsId : teamsId,
                            evaSessionId : sessionCode,
                            evaToken : accesstoken,
                            timestamp : timeStamp,
                        }
                        const result = await mongoInsert(doc);
                        console.log(JSON.stringify(result))
                    }
                    console.log("sesion: ", sessionCode);
                    var data = ""
                    var n = 1
                    eva_response.answers.forEach(async function(evaR) {
                        if (n != 1) {
                            data += "<hr>"
                        } 
                        data += evaR.content
                        //first = true
                        console.log("botones: ", evaR.buttons)
                        if ( evaR.buttons.length >=1 ){
                            //if(first){
                                data += "<br><br>"
                            //    first = false
                            //}
                            data += "<ul>"
                            evaR.buttons.forEach(async function(evaB) {
                                data += '<li>' + evaB.value + '</li>'
                            })
                                data += "</ul>"
                        }
                        n = n+1  
                    });
                    //data += '<a target="_blank" href="#"><img src="https://storage.googleapis.com/front-web/SANDI/icono-PDF.png" height="100" width="100"/> </a><br> '

                    console.log('respuesta RSP:' + JSON.stringify(data) )
                    await context.sendActivity(MessageFactory.text(data, data));
                    await next();                       
                }).catch(error => {
                    console.log(error);
                }); 
            }         
        });
        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            const welcomeText = 'Bienvenido!';
            for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    await context.sendActivity(MessageFactory.text(welcomeText, welcomeText));
                }
            }
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }
}
module.exports.EchoBot = EchoBot;